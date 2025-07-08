import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertMessageSchema, insertAmbientAdSchema } from "@shared/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
});

interface WebSocketClient extends WebSocket {
  ipAddress?: string;
}

const clients = new Set<WebSocketClient>();
let messageCountSinceLastAd = 0;

function generateUsername(): string {
  return `anon${Math.floor(Math.random() * 9999)}`;
}

function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         '127.0.0.1';
}

async function checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; blockedUntil?: Date }> {
  const rateLimit = await storage.getRateLimit(ipAddress);
  const now = new Date();
  
  // Check if blocked
  if (rateLimit?.blockedUntil && rateLimit.blockedUntil > now) {
    return { allowed: false, blockedUntil: rateLimit.blockedUntil };
  }
  
  // Check if muted
  const isMuted = await storage.isMuted(ipAddress);
  if (isMuted) {
    return { allowed: false };
  }
  
  if (!rateLimit) {
    await storage.updateRateLimit(ipAddress, 1);
    return { allowed: true };
  }
  
  const timeSinceLastMessage = now.getTime() - rateLimit.lastMessageAt.getTime();
  
  // Reset count if more than 10 seconds passed
  if (timeSinceLastMessage > 10000) {
    await storage.updateRateLimit(ipAddress, 1);
    return { allowed: true };
  }
  
  // Check 5 second rate limit
  if (timeSinceLastMessage < 5000) {
    return { allowed: false };
  }
  
  // Check spam protection (5 messages in 10 seconds)
  if (rateLimit.messageCount >= 5) {
    const blockedUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    await storage.updateRateLimit(ipAddress, rateLimit.messageCount + 1, blockedUntil);
    return { allowed: false, blockedUntil };
  }
  
  await storage.updateRateLimit(ipAddress, rateLimit.messageCount + 1);
  return { allowed: true };
}

async function broadcastMessage(message: any, excludeIp?: string) {
  const messageData = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.ipAddress !== excludeIp) {
      client.send(messageData);
    }
  });
}

async function maybeInjectAd() {
  messageCountSinceLastAd++;
  
  if (messageCountSinceLastAd >= 20) {
    messageCountSinceLastAd = 0;
    
    const activeAds = await storage.getActiveAmbientAds();
    if (activeAds.length > 0) {
      const randomAd = activeAds[Math.floor(Math.random() * activeAds.length)];
      
      const adMessage = {
        type: 'message',
        data: {
          id: `ad-${Date.now()}`,
          content: `✦ Try: "${randomAd.productName}" – ${randomAd.description}${randomAd.url ? ` ${randomAd.url}` : ''}`,
          username: 'sponsor',
          timestamp: new Date().toISOString(),
          isAd: true,
        }
      };
      
      await broadcastMessage(adMessage);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocketClient, req) => {
    const ipAddress = getClientIp(req);
    ws.ipAddress = ipAddress;
    clients.add(ws);
    
    console.log(`WebSocket connected from ${ipAddress}`, {
      headers: req.headers,
      url: req.url
    });
    
    // Send recent messages to new client
    storage.getRecentMessages(30).then(messages => {
      const recentMessages = messages.reverse().map(msg => ({
        type: 'message',
        data: {
          id: msg.id,
          content: msg.content,
          username: msg.username,
          timestamp: msg.createdAt.toISOString(),
          expiresAt: msg.expiresAt.toISOString(),
        }
      }));
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'initial_messages', data: recentMessages }));
      }
    }).catch(error => {
      console.error('Error sending initial messages:', error);
    });
    
    // Send guardian status
    storage.isGuardian(ipAddress).then(isGuardian => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'guardian_status', data: { isGuardian } }));
      }
    }).catch(error => {
      console.error('Error checking guardian status:', error);
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message.type, 'from', ipAddress);
        
        if (message.type === 'send_message') {
          const { allowed, blockedUntil } = await checkRateLimit(ipAddress);
          
          if (!allowed) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { 
                message: blockedUntil ? 
                  `You are temporarily blocked until ${blockedUntil.toLocaleTimeString()}` :
                  'You are rate limited. Please wait before sending another message.'
              }
            }));
            return;
          }
          
          const validation = insertMessageSchema.safeParse({ content: message.data.content });
          if (!validation.success) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message content' }
            }));
            return;
          }
          
          const username = generateUsername();
          const newMessage = await storage.createMessage({
            content: validation.data.content,
            username,
            ipAddress,
          });
          
          const broadcastData = {
            type: 'message',
            data: {
              id: newMessage.id,
              content: newMessage.content,
              username: newMessage.username,
              timestamp: newMessage.createdAt.toISOString(),
              expiresAt: newMessage.expiresAt.toISOString(),
            }
          };
          
          await broadcastMessage(broadcastData);
          await maybeInjectAd();
        }
        
        if (message.type === 'guardian_action') {
          const isGuardian = await storage.isGuardian(ipAddress);
          if (!isGuardian) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Unauthorized: Guardian access required' }
            }));
            return;
          }
          
          const { action, messageId } = message.data;
          
          if (action === 'mute' && messageId) {
            // Find the message to get the IP address to mute
            const recentMessages = await storage.getRecentMessages(100);
            const targetMessage = recentMessages.find(msg => msg.id === messageId);
            
            if (targetMessage) {
              await storage.muteIp(targetMessage.ipAddress, ipAddress, 10 * 60 * 1000); // 10 minutes
              await storage.logGuardianAction(ipAddress, 'mute', targetMessage.ipAddress, messageId);
              
              await broadcastMessage({
                type: 'system_message',
                data: { message: `User ${targetMessage.username} has been muted for 10 minutes` }
              });
            }
          }
          
          if (action === 'delete' && messageId) {
            await storage.deleteMessage(messageId);
            await storage.logGuardianAction(ipAddress, 'delete', undefined, messageId);
            
            await broadcastMessage({
              type: 'message_deleted',
              data: { messageId }
            });
          }
          
          if (action === 'slow_mode') {
            await storage.setSystemSetting('slow_mode_until', 
              (new Date(Date.now() + 5 * 60 * 1000)).toISOString()
            );
            await storage.logGuardianAction(ipAddress, 'slow_mode');
            
            await broadcastMessage({
              type: 'system_message',
              data: { message: 'Slow mode enabled: 10 seconds between messages for 5 minutes' }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error, 'from', ipAddress);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Invalid message format' }
          }));
        }
      }
    });
    
    ws.on('close', (code, reason) => {
      clients.delete(ws);
      console.log(`WebSocket disconnected from ${ipAddress}`, { code, reason: reason.toString() });
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error from ${ipAddress}:`, error);
    });
  });
  
  // API Routes
  app.get('/api/messages', async (req, res) => {
    try {
      const messages = await storage.getRecentMessages();
      res.json(messages.reverse());
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });
  
  app.post('/api/create-guardian-payment', async (req, res) => {
    try {
      const { duration } = req.body; // 'day' or 'week'
      const amount = duration === 'week' ? 1000 : 200; // $10 or $2 in cents
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          type: 'guardian',
          duration,
          ip: getClientIp(req),
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating guardian payment:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });
  
  app.post('/api/create-sponsor-payment', async (req, res) => {
    try {
      const { duration } = req.body; // 'day' or 'week'
      const amount = duration === 'week' ? 7500 : 1500; // $75 or $15 in cents
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          type: 'sponsor',
          duration,
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating sponsor payment:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });
  
  app.post('/api/confirm-guardian-payment', async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const ipAddress = getClientIp(req);
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const duration = paymentIntent.metadata.duration;
        const durationMs = duration === 'week' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + durationMs);
        
        await storage.createGuardian({
          ipAddress,
          expiresAt,
        });
        
        res.json({ success: true });
      } else {
        res.status(400).json({ message: 'Payment not completed' });
      }
    } catch (error: any) {
      console.error('Error confirming guardian payment:', error);
      res.status(500).json({ message: 'Error confirming payment: ' + error.message });
    }
  });
  
  app.post('/api/submit-sponsor-ad', async (req, res) => {
    try {
      const { productName, description, url, duration, paymentIntentId } = req.body;
      
      const validation = insertAmbientAdSchema.safeParse({
        productName,
        description,
        url,
        expiresAt: new Date(),
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid ad data' });
      }
      
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const durationMs = duration === 'week' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        const expiresAt = new Date(Date.now() + durationMs);
        
        await storage.createAmbientAd({
          productName,
          description,
          url,
          expiresAt,
        });
        
        res.json({ success: true });
      } else {
        res.status(400).json({ message: 'Payment not completed' });
      }
    } catch (error: any) {
      console.error('Error submitting sponsor ad:', error);
      res.status(500).json({ message: 'Error submitting ad: ' + error.message });
    }
  });
  
  // Cleanup expired messages and ads every minute
  setInterval(async () => {
    try {
      await storage.deleteExpiredMessages();
      await storage.deleteExpiredAds();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 60 * 1000);
  
  return httpServer;
}

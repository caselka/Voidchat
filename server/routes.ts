import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertMessageSchema, insertAmbientAdSchema } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./emailAuth";
import { sanitizeMessageContent, sanitizeUsername, blockBackendInteraction, checkValidationRateLimit } from "./security";

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
    } else {
      // Fallback to default ambient ads
      const defaultAds = [
        { business: "void.coffee", content: "Premium coffee for late-night coding sessions ☕" },
        { business: "quantum.dev", content: "Build the future with quantum computing tools ⚡" },
        { business: "midnight.tools", content: "Developer tools that work in the dark 🌙" },
        { business: "echo.space", content: "Collaborate in beautiful virtual workspaces ✨" },
        { business: "flux.design", content: "UI components that adapt to your workflow 🎨" }
      ];
      
      const randomDefault = defaultAds[Math.floor(Math.random() * defaultAds.length)];
      const defaultAdMessage = {
        type: 'message',
        data: {
          id: `default-ad-${Date.now()}`,
          content: `✦ ${randomDefault.content}`,
          username: randomDefault.business,
          timestamp: new Date().toISOString(),
          isAd: true,
        }
      };
      
      await broadcastMessage(defaultAdMessage);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Recent messages API route
  app.get('/api/recent-messages', async (req, res) => {
    try {
      const messages = await storage.getRecentMessages(50);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      res.status(500).json({ message: 'Error fetching messages' });
    }
  });

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
          
          // Check if user has a custom handle
          let username = generateUsername();
          const customHandle = await storage.getCustomHandle(ipAddress);
          if (customHandle) {
            username = customHandle.handle;
          }
          
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
  
  app.post('/api/create-guardian-payment', isAuthenticated, async (req, res) => {
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
  
  app.post('/api/create-sponsor-payment', isAuthenticated, async (req, res) => {
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

  // Custom handle routes (auth required)
  app.post('/api/create-handle-payment', isAuthenticated, async (req, res) => {
    try {
      const { handle, duration } = req.body;
      const ipAddress = getClientIp(req);
      
      // Check if handle is available
      const available = await storage.isHandleAvailable(handle);
      if (!available) {
        return res.status(400).json({ message: 'Handle already taken' });
      }
      
      // Calculate amount based on duration
      const prices = {
        'permanent': 300, // $3 for 30 days
        'temporary': 100 // $1 for 7 days
      };
      
      const amount = prices[duration as keyof typeof prices];
      if (!amount) {
        return res.status(400).json({ message: 'Invalid duration' });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          type: 'custom_handle',
          handle,
          duration,
          ipAddress
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating handle payment:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });

  // Theme customization routes (auth required)
  app.post('/api/create-theme-payment', isAuthenticated, async (req, res) => {
    try {
      const { background, font, accentColor, messageFadeTime, backgroundFx, bundle } = req.body;
      const ipAddress = getClientIp(req);
      
      // Calculate amount based on bundle
      const prices = {
        'theme_only': 200, // $2
        'drift_premium': 700, // $7 (includes handle)
        'void_guardian': 1000 // $10 (includes everything + guardian)
      };
      
      const amount = prices[bundle as keyof typeof prices];
      if (!amount) {
        return res.status(400).json({ message: 'Invalid bundle' });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          type: 'theme_customization',
          background,
          font,
          accentColor,
          messageFadeTime: messageFadeTime.toString(),
          backgroundFx,
          bundle,
          ipAddress
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating theme payment:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });

  // Check handle availability
  app.get('/api/check-handle/:handle', async (req, res) => {
    try {
      const { handle } = req.params;
      const available = await storage.isHandleAvailable(handle);
      
      if (available) {
        res.json({ available: true });
      } else {
        // Provide specific error messages based on the rejection reason
        const lowerHandle = handle.toLowerCase().trim();
        
        // System reserved terms
        const systemReserved = [
          'voidchat', 'admin', 'moderator', 'guardian', 'system', 'server', 
          'support', 'mod', 'root', 'dev', 'owner', 'bot', 'null', 
          'undefined', 'console', 'test'
        ];
        
        // Founder reserved terms
        const founderReserved = [
          'caselka', 'cameron', 'cameronpettit', 'cam', 'cmp', 
          'ptcsolutions', 'redd'
        ];
        
        let reason = 'Username not available';
        
        if (systemReserved.includes(lowerHandle)) {
          reason = 'This username is reserved by the system';
        } else if (founderReserved.some(term => lowerHandle.includes(term))) {
          reason = 'This username contains protected terms';
        } else if (/^anon\d+$/i.test(handle)) {
          reason = 'This format is reserved for anonymous users';
        } else if (handle.length < 2 || handle.length > 20) {
          reason = 'Username must be 2-20 characters long';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(handle)) {
          reason = 'Username can only contain letters, numbers, dashes, and underscores';
        } else if (/^[-_]|[-_]$/.test(handle)) {
          reason = 'Username cannot start or end with dashes or underscores';
        } else if (/[-_]{2,}/.test(handle)) {
          reason = 'Username cannot have consecutive dashes or underscores';
        } else if (handle.includes('..')) {
          reason = 'Username cannot contain consecutive dots';
        } else if (/[\/\\%#@~]/.test(handle)) {
          reason = 'Username contains invalid characters';
        } else if (handle.startsWith('//')) {
          reason = 'Username cannot start with //'
        } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(handle)) {
          reason = 'Username cannot be in UUID format';
        } else {
          // Check if it contains profanity or is already taken
          const { checkProfanity } = await import('./profanity-filter');
          const profanityCheck = checkProfanity(handle);
          if (!profanityCheck.isClean) {
            reason = 'Username contains inappropriate content';
          } else {
            reason = 'Username is already taken';
          }
        }
        
        res.json({ available: false, reason });
      }
    } catch (error: any) {
      console.error('Error checking handle:', error);
      res.status(500).json({ message: 'Error checking handle: ' + error.message });
    }
  });

  // Get user's custom handle
  app.get('/api/my-handle', async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const handle = await storage.getCustomHandle(ipAddress);
      res.json({ handle: handle?.handle || null });
    } catch (error: any) {
      console.error('Error getting handle:', error);
      res.status(500).json({ message: 'Error getting handle: ' + error.message });
    }
  });

  // Get user's theme customization
  app.get('/api/my-theme', async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const theme = await storage.getThemeCustomization(ipAddress);
      res.json({ theme });
    } catch (error: any) {
      console.error('Error getting theme:', error);
      res.status(500).json({ message: 'Error getting theme: ' + error.message });
    }
  });

  // Stripe webhook handler
  app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      return res.status(400).send('Missing stripe-signature header');
    }
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata;

      try {
        if (metadata.type === 'guardian') {
          const duration = metadata.duration;
          const ipAddress = metadata.ip;
          const expiresAt = duration === 'week' 
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

          await storage.createGuardian({
            ipAddress,
            expiresAt,
            stripePaymentId: paymentIntent.id
          });

          console.log('Guardian access granted to', ipAddress);
        } else if (metadata.type === 'custom_handle') {
          const handle = metadata.handle;
          const duration = metadata.duration;
          const ipAddress = metadata.ipAddress;
          const expiresAt = duration === 'permanent'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await storage.createCustomHandle({
            handle,
            ipAddress,
            expiresAt,
            stripePaymentId: paymentIntent.id
          });

          console.log('Custom handle granted:', handle, 'to', ipAddress);
        } else if (metadata.type === 'theme_customization') {
          const ipAddress = metadata.ipAddress;
          const bundle = metadata.bundle;
          let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

          if (bundle === 'void_guardian') {
            expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            // Also grant guardian access
            await storage.createGuardian({
              ipAddress,
              expiresAt,
              stripePaymentId: paymentIntent.id
            });
          }

          await storage.createThemeCustomization({
            background: metadata.background,
            font: metadata.font,
            accentColor: metadata.accentColor,
            messageFadeTime: parseInt(metadata.messageFadeTime),
            backgroundFx: metadata.backgroundFx,
            ipAddress,
            expiresAt,
            stripePaymentId: paymentIntent.id
          });

          // If premium bundle, also grant custom handle
          if (bundle === 'drift_premium' || bundle === 'void_guardian') {
            const randomHandle = `drift${Math.floor(Math.random() * 999)}`;
            await storage.createCustomHandle({
              handle: randomHandle,
              ipAddress,
              expiresAt,
              stripePaymentId: paymentIntent.id
            });
          }

          console.log('Theme customization granted to', ipAddress, 'bundle:', bundle);
        } else if (metadata.type === 'sponsor') {
          const duration = metadata.duration;
          const expiresAt = duration === 'week'
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 24 * 60 * 60 * 1000);

          // This would be handled by the sponsor page data
          console.log('Sponsor payment received for duration:', duration);
        }
      } catch (error) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ error: 'Failed to process payment' });
      }
    }

    res.json({ received: true });
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
      await storage.deleteExpiredHandles();
      await storage.deleteExpiredThemes();
      await storage.cleanExpiredMutes();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 60 * 1000);
  
  return httpServer;
}

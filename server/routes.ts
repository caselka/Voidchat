import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertMessageSchema, insertAmbientAdSchema, sessions, users } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./emailAuth";
import { sanitizeMessageContent, sanitizeUsername, blockBackendInteraction, checkValidationRateLimit } from "./security";
import { checkProfanity, validateSponsorContent } from "./profanity-filter";
import { db } from "./db";
import { eq } from "drizzle-orm";

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

// Broadcast online count to all clients
function broadcastOnlineCount() {
  const onlineCount = clients.size;
  const message = JSON.stringify({
    type: 'online_count',
    data: { count: onlineCount }
  });
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function generateUsername(): string {
  return `anon${Math.floor(Math.random() * 9999)}`;
}

async function checkGuardianEligibility(ipAddress: string): Promise<{ eligible: boolean; reason?: string }> {
  try {
    // Check if user has paid account for 30+ days or 500+ messages in last 7 days
    const userStats = await storage.getUserStats?.(ipAddress);
    
    if (userStats?.paidAccountSince) {
      const daysPaid = Math.floor((Date.now() - userStats.paidAccountSince.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPaid >= 30) {
        return { eligible: true };
      }
    }
    
    if (userStats?.messagesLast7Days >= 500) {
      return { eligible: true };
    }
    
    // Remove testing bypass for production
    
    return { 
      eligible: false, 
      reason: "Guardian access requires either 30+ days of paid account or 500+ messages in the last 7 days" 
    };
  } catch (error) {
    return { eligible: true }; // Default to allow if check fails
  }
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
      const userId = req.user.id;
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
  
  // Room management routes
  // Username status endpoint
  app.get('/api/username-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const status = await storage.getUsernameStatus(userId);
      res.json(status);
    } catch (error: any) {
      console.error('Error checking username status:', error);
      res.status(500).json({ message: 'Failed to check username status' });
    }
  });

  // Guardian status endpoint
  app.get('/api/guardian-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const guardianStatus = await storage.getGuardianStatus(user.email || '');
      
      res.json({
        isGuardian: !!guardianStatus,
        expiresAt: guardianStatus?.expiresAt,
        createdAt: guardianStatus?.createdAt
      });
    } catch (error: any) {
      console.error('Error fetching guardian status:', error);
      res.status(500).json({ message: 'Failed to fetch guardian status' });
    }
  });

  // Renew username endpoint
  app.post('/api/renew-username', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user is in grace period
      const status = await storage.getUsernameStatus(userId);
      if (!status.expired && !status.inGracePeriod) {
        return res.status(400).json({ message: 'Username is not expired' });
      }
      
      // For now, simulate payment success for renewal
      console.log(`Would charge $3 for username renewal by user ${userId}`);
      
      await storage.renewUsername(userId);
      res.json({ message: 'Username renewed successfully' });
    } catch (error: any) {
      console.error('Error renewing username:', error);
      res.status(500).json({ message: 'Failed to renew username' });
    }
  });

  app.get('/api/rooms', async (req, res) => {
    try {
      const rooms = await storage.getAllRooms();
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  // Create room payment intent
  app.post('/api/create-room-payment', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.body;
      const userId = (req as any).user.id;

      // Validate room name first
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'Room name is required' });
      }

      const normalizedName = name.toLowerCase().trim();

      // Validate name format
      if (!/^[a-z0-9_-]{3,20}$/.test(normalizedName)) {
        return res.status(400).json({ 
          message: 'Room name must be 3-20 characters, lowercase letters, numbers, dashes or underscores only' 
        });
      }

      // Check banned names
      const bannedNames = ['admin', 'voidchat', 'caselka', 'support', 'mod'];
      if (bannedNames.includes(normalizedName)) {
        return res.status(400).json({ message: 'This room name is reserved' });
      }

      // Check profanity
      const profanityCheck = checkProfanity(normalizedName);
      if (!profanityCheck.isClean) {
        return res.status(400).json({ message: 'Room name contains inappropriate content' });
      }

      // Check availability
      const isAvailable = await storage.isRoomNameAvailable(normalizedName);
      if (!isAvailable) {
        return res.status(400).json({ message: 'Room name already taken' });
      }

      // Check if user is super user (caselka) - they get free rooms
      const user = await storage.getUser(userId);
      const isSuperUser = user?.username === 'caselka';
      
      if (isSuperUser) {
        // Create room immediately for super user
        const room = await storage.createRoom({
          name: normalizedName,
          creatorId: userId,
        });
        return res.json({ 
          room, 
          message: 'Room created successfully! Free for founder account.',
          isFree: true 
        });
      }

      // Create payment intent for $49 USD
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 4900, // $49.00 in cents
        currency: 'usd',
        metadata: {
          type: 'room_creation',
          room_name: normalizedName,
          user_id: userId,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret, roomName: normalizedName });
    } catch (error: any) {
      console.error('Error creating room payment:', error);
      res.status(500).json({ message: 'Error creating payment intent: ' + error.message });
    }
  });

  // Complete room creation after payment
  app.post('/api/complete-room-creation', isAuthenticated, async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      const userId = (req as any).user.id;

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const roomName = paymentIntent.metadata.room_name;
        const metadataUserId = paymentIntent.metadata.user_id;

        // Verify user matches
        if (metadataUserId !== userId) {
          return res.status(403).json({ message: 'Payment does not match user' });
        }

        // Double-check room name is still available
        const isAvailable = await storage.isRoomNameAvailable(roomName);
        if (!isAvailable) {
          return res.status(400).json({ message: 'Room name no longer available' });
        }

        // Create the room
        const room = await storage.createRoom({
          name: roomName,
          creatorId: userId,
        });

        res.json({ 
          room, 
          message: 'Room created successfully! Payment of $49 processed.' 
        });
      } else {
        res.status(400).json({ message: 'Payment not completed' });
      }
    } catch (error: any) {
      console.error('Error completing room creation:', error);
      res.status(500).json({ message: 'Error completing room creation: ' + error.message });
    }
  });

  // Legacy endpoint - now redirects to payment process
  app.post('/api/rooms', isAuthenticated, async (req, res) => {
    return res.status(400).json({ 
      message: 'Room creation requires payment. Use /api/create-room-payment endpoint instead.' 
    });
  });

  app.get('/api/rooms/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const room = await storage.getRoom(name);
      
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      res.json({ room });
    } catch (error) {
      console.error('Room fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch room' });
    }
  });

  app.get('/api/my-rooms', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const rooms = await storage.getUserRooms(userId);
      res.json({ rooms });
    } catch (error) {
      console.error('User rooms fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  wss.on('connection', (ws: WebSocketClient, req) => {
    const ipAddress = getClientIp(req);
    ws.ipAddress = ipAddress;
    clients.add(ws);
    broadcastOnlineCount();
    
    console.log(`WebSocket connected from ${ipAddress}`, {
      headers: req.headers,
      url: req.url
    });
    
    // Send recent messages from past 15 minutes to new client
    storage.getRecentMessages(100).then(messages => {
      // Get all messages from past 15 minutes, most recent first
      const recentMessages = messages.map(msg => ({
        type: 'message',
        data: {
          id: msg.id,
          content: msg.content,
          username: msg.username,
          timestamp: msg.createdAt.toISOString(),
          expiresAt: msg.expiresAt.toISOString(),
          replyToId: msg.replyToId,
        }
      }));
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'initial_messages', data: recentMessages }));
      }
    }).catch(error => {
      console.error('Error sending initial messages:', error);
    });
    
    // Send guardian status and current user info
    Promise.all([
      storage.isGuardian(ipAddress),
      storage.getAnonUsername(ipAddress),
      storage.getCustomHandle(ipAddress)
    ]).then(([isGuardian, anonUsername, customHandle]) => {
      const currentUsername = customHandle ? customHandle.handle : anonUsername;
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          type: 'guardian_status', 
          data: { isGuardian } 
        }));
        ws.send(JSON.stringify({ 
          type: 'current_user', 
          data: { username: currentUsername } 
        }));
      }
    }).catch(error => {
      console.error('Error checking guardian status or username:', error);
    });
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message.type, 'from', ipAddress);
        
        if (message.type === 'send_message') {
          // Check validation rate limit first
          if (!checkValidationRateLimit(ipAddress)) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Too many validation attempts. Please slow down.' }
            }));
            return;
          }

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
          
          // Validate message content exists
          if (!message.data?.content || typeof message.data.content !== 'string') {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Message content is required' }
            }));
            return;
          }

          // Check for backend interaction attempts
          if (blockBackendInteraction(message.data.content)) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Message content contains forbidden patterns' }
            }));
            return;
          }

          // Sanitize the content to remove any potential CSS/HTML injection
          const sanitizedContent = sanitizeMessageContent(message.data.content);
          
          // Check if content is empty after sanitization
          if (!sanitizedContent || sanitizedContent.trim().length === 0) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Message content is empty or contains only forbidden elements' }
            }));
            return;
          }
          
          const validation = insertMessageSchema.safeParse({ content: sanitizedContent });
          if (!validation.success) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message content after security validation' }
            }));
            return;
          }
          
          // Check for authenticated user first, then custom handle, then anon username
          let username: string;
          
          // Try to get authenticated user via session store
          let authenticatedUser = null;
          const cookies = req.headers.cookie;
          
          console.log('Processing message with cookies:', cookies);
          
          if (cookies) {
            try {
              const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
              if (sessionMatch) {
                const sessionId = decodeURIComponent(sessionMatch[1]);
                console.log('Extracted session ID:', sessionId);
                
                // Check all sessions to find the matching one
                const allSessions = await db.select().from(sessions);
                console.log(`Found ${allSessions.length} total sessions`);
                
                // Log all session IDs for debugging
                allSessions.forEach((s, i) => {
                  console.log(`Session ${i}: ID=${s.sid}, Data keys:`, Object.keys(s.sess as any));
                });
                
                for (const session of allSessions) {
                  // Try different matching approaches for the session ID
                  const sessionKey = sessionId.split('.')[0]; // Get the part before the signature
                  
                  console.log(`Comparing: sessionKey="${sessionKey}" with stored="${session.sid}"`);
                  
                  if (session.sid === sessionKey || session.sid === sessionId) {
                    console.log('Found matching session:', session.sid);
                    const sessionData = session.sess as any;
                    console.log('Session data structure:', sessionData);
                    
                    // Check for different possible session data structures
                    let userId = null;
                    if (sessionData?.user?.id) {
                      userId = sessionData.user.id;
                    } else if (sessionData?.passport?.user?.id) {
                      userId = sessionData.passport.user.id;
                    } else if (sessionData?.userId) {
                      userId = sessionData.userId;
                    }
                    
                    if (userId) {
                      console.log('Found user ID in session:', userId);
                      authenticatedUser = await storage.getUser(userId);
                      console.log('Retrieved authenticated user:', authenticatedUser?.username);
                      break;
                    }
                  }
                }
                
                if (!authenticatedUser) {
                  console.log('No authenticated user found for session:', sessionId);
                }
              }
            } catch (error) {
              console.log('Session authentication error:', error);
            }
          }

          if (authenticatedUser?.username) {
            // Use authenticated user's registered username
            username = sanitizeUsername(authenticatedUser.username);
          } else {
            // Fallback to custom handle or anon username
            const customHandle = await storage.getCustomHandle(ipAddress);
            if (customHandle) {
              username = sanitizeUsername(customHandle.handle);
            } else {
              username = await storage.getAnonUsername(ipAddress);
            }
          }
          
          const newMessage = await storage.createMessage({
            content: validation.data.content,
            username,
            ipAddress,
            replyToId: message.data.replyToId
          });
          
          const broadcastData = {
            type: 'message',
            data: {
              id: newMessage.id,
              content: newMessage.content,
              username: newMessage.username,
              timestamp: newMessage.createdAt.toISOString(),
              expiresAt: newMessage.expiresAt.toISOString(),
              replyToId: newMessage.replyToId,
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
      broadcastOnlineCount();
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
  
  // Guardian eligibility check
  app.get("/api/guardian-eligibility", isAuthenticated, async (req, res) => {
    try {
      const ipAddress = getClientIp(req);
      const userId = req.user?.id;
      
      // Check if user is super user (caselka)
      if (userId && await storage.isSuperUser(userId)) {
        return res.json({
          eligible: true,
          superUser: true,
          requirements: {
            paidAccount: true,
            messageCount: true,
          },
          stats: {
            accountDays: 999,
            messagesLast7Days: 9999,
          }
        });
      }

      const eligibilityResult = await checkGuardianEligibility(ipAddress);
      
      if (eligibilityResult.eligible) {
        return res.json({
          eligible: true,
          requirements: {
            paidAccount: true,
            messageCount: true,
          },
          stats: {
            accountDays: 35,
            messagesLast7Days: 600,
          }
        });
      }

      // Get user stats for display
      const userStats = await storage.getUserStats?.(ipAddress);
      
      res.json({
        eligible: false,
        requirements: {
          paidAccount: (userStats?.paidAccountSince && 
            (Date.now() - userStats.paidAccountSince.getTime()) > (30 * 24 * 60 * 60 * 1000)),
          messageCount: (userStats?.messagesLast7Days || 0) >= 500,
        },
        stats: {
          accountDays: userStats?.paidAccountSince ? 
            Math.floor((Date.now() - userStats.paidAccountSince.getTime()) / (24 * 60 * 60 * 1000)) : 0,
          messagesLast7Days: userStats?.messagesLast7Days || 0,
        }
      });
    } catch (error) {
      console.error("Error checking Guardian eligibility:", error);
      res.status(500).json({ message: "Failed to check eligibility" });
    }
  });

  app.post('/api/create-guardian-payment', isAuthenticated, async (req, res) => {
    try {
      const { duration } = req.body; // 'day' or 'week'
      const ipAddress = getClientIp(req);
      
      // Check Guardian eligibility
      const eligibilityCheck = await checkGuardianEligibility(ipAddress);
      if (!eligibilityCheck.eligible) {
        return res.status(403).json({ 
          message: eligibilityCheck.reason 
        });
      }
      
      const amount = duration === 'week' ? 10000 : 2000; // $100 or $20 in cents
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          type: 'guardian',
          duration,
          ip: ipAddress,
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
      
      // First validate content for spam/illegal advertising
      const contentValidation = validateSponsorContent(productName, description, url);
      if (!contentValidation.isValid) {
        return res.status(400).json({ 
          message: contentValidation.reason,
          blockedTerms: contentValidation.blockedTerms
        });
      }
      
      const validation = insertAmbientAdSchema.safeParse({
        productName,
        description,
        url,
        expiresAt: new Date(),
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: 'Invalid ad data format' });
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

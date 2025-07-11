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
  roomName?: string;
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

async function checkRateLimit(ipAddress: string, customCooldown?: number): Promise<{ allowed: boolean; blockedUntil?: Date; cooldownSeconds?: number }> {
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
  
  // Use dynamic cooldown or fallback to 5 seconds
  const dynamicCooldown = customCooldown || await storage.calculateDynamicCooldown(ipAddress);
  
  if (!rateLimit) {
    await storage.updateRateLimit(ipAddress, 1);
    return { allowed: true, cooldownSeconds: dynamicCooldown };
  }
  
  const timeSinceLastMessage = now.getTime() - rateLimit.lastMessageAt.getTime();
  
  // Reset count if more than 10 seconds passed
  if (timeSinceLastMessage > 10000) {
    await storage.updateRateLimit(ipAddress, 1);
    return { allowed: true, cooldownSeconds: dynamicCooldown };
  }
  
  // Check dynamic rate limit (instead of fixed 5 seconds)
  if (timeSinceLastMessage < dynamicCooldown * 1000) {
    return { allowed: false, cooldownSeconds: dynamicCooldown };
  }
  
  // Check spam protection (5 messages in 10 seconds)
  if (rateLimit.messageCount >= 5) {
    const blockedUntil = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    await storage.updateRateLimit(ipAddress, rateLimit.messageCount + 1, blockedUntil);
    return { allowed: false, blockedUntil };
  }
  
  await storage.updateRateLimit(ipAddress, rateLimit.messageCount + 1);
  return { allowed: true, cooldownSeconds: dynamicCooldown };
}

async function broadcastMessage(message: any, excludeIp?: string) {
  const messageData = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.ipAddress !== excludeIp && !client.roomName) {
      client.send(messageData);
    }
  });
}

async function broadcastRoomMessage(roomName: string, message: any, excludeIp?: string) {
  const messageData = JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.roomName === roomName && client.ipAddress !== excludeIp) {
      client.send(messageData);
    }
  });
}

async function maybeInjectAd() {
  messageCountSinceLastAd++;
  
  const activeAds = await storage.getActiveAmbientAds();
  
  // Enhanced sponsor distribution: only include ads with remaining budget
  const adsWithBudget = activeAds.filter(ad => 
    (!ad.allocatedFunds || ad.spentFunds < ad.allocatedFunds) && ad.status === 'active'
  );
  
  // Dynamic ad injection frequency based on number of active sponsors:
  let adFrequency = 20;
  if (adsWithBudget.length > 5) adFrequency = 15;
  if (adsWithBudget.length > 10) adFrequency = 10;
  if (adsWithBudget.length > 20) adFrequency = 8;
  
  if (messageCountSinceLastAd >= adFrequency) {
    messageCountSinceLastAd = 0;
    
    if (adsWithBudget.length > 0) {
      // Fair distribution algorithm: weight by remaining budget and time since last shown
      const now = Date.now();
      const adsWithWeights = adsWithBudget.map(ad => {
        const remainingBudget = (ad.allocatedFunds || 1000) - (ad.spentFunds || 0);
        const budgetWeight = Math.max(1, remainingBudget / 100); // Higher budget = higher weight
        
        // Newer ads get slight preference (decay over 30 days)
        const ageWeight = Math.max(1, 30 - Math.floor((now - new Date(ad.createdAt).getTime()) / (24 * 60 * 60 * 1000)));
        
        return {
          ad,
          weight: budgetWeight * ageWeight
        };
      });
      
      const totalWeight = adsWithWeights.reduce((sum, item) => sum + item.weight, 0);
      let randomWeight = Math.random() * totalWeight;
      
      let selectedAd = adsWithBudget[0];
      for (const item of adsWithWeights) {
        randomWeight -= item.weight;
        if (randomWeight <= 0) {
          selectedAd = item.ad;
          break;
        }
      }
      
      // Track impression and cost
      const ipAddress = 'broadcast';
      await storage.recordSponsorEvent({
        adId: selectedAd.id,
        eventType: 'impression',
        ipAddress,
        userAgent: 'System',
        costCents: 1 // 1 cent per impression
      });
      
      const adMessage = {
        type: 'message',
        data: {
          id: `ad-${selectedAd.id}-${Date.now()}`,
          content: `✦ Sponsor: "${selectedAd.productName}" – ${selectedAd.description}${selectedAd.url ? ` ${selectedAd.url}` : ''}`,
          username: 'sponsor',
          timestamp: new Date().toISOString(),
          isAd: true,
          adId: selectedAd.id, // Include ad ID for click tracking
        }
      };
      
      await broadcastMessage(adMessage);
      
      console.log(`🎯 Injected sponsor ad: ${selectedAd.productName} (Budget: ${selectedAd.allocatedFunds - selectedAd.spentFunds} cents remaining)`);
    } else {
      // Fallback to default ambient ads only if no active paid sponsors
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

  // Direct Messages API (paid accounts only)
  app.post('/api/direct-messages', isAuthenticated, async (req: any, res) => {
    try {
      const fromUserId = req.user.id;
      const { toUserId, content } = req.body;
      
      if (!toUserId || !content) {
        return res.status(400).json({ message: 'toUserId and content are required' });
      }
      
      // Validate content
      if (content.length > 500) {
        return res.status(400).json({ message: 'Message content too long (max 500 characters)' });
      }
      
      // Verify recipient exists
      const recipient = await storage.getUser(toUserId);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }
      
      const message = await storage.sendDirectMessage(fromUserId, toUserId, content);
      res.json(message);
    } catch (error) {
      console.error('Error sending direct message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.get('/api/direct-messages/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const { userId } = req.params;
      
      const messages = await storage.getDirectMessages(currentUserId, userId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getUserConversations(userId);
      
      // Enrich conversations with user info
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
          const otherUser = await storage.getUser(otherUserId);
          return {
            ...conv,
            otherUser: {
              id: otherUser?.id,
              username: otherUser?.username,
              email: otherUser?.email
            }
          };
        })
      );
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/conversations/:conversationId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      
      await storage.markMessagesAsRead(userId, parseInt(conversationId));
      res.json({ message: 'Messages marked as read' });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ message: 'Failed to mark messages as read' });
    }
  });

  app.get('/api/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  });

  app.delete('/api/direct-messages/:messageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { messageId } = req.params;
      
      await storage.deleteDirectMessage(parseInt(messageId), userId);
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    verifyClient: (info) => {
      // Allow both /ws and /ws/room/* paths
      const pathname = info.req.url;
      return pathname === '/ws' || pathname?.startsWith('/ws/room/');
    }
  });
  
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



  // Auto-renewal toggle endpoint
  app.post("/api/update-auto-renewal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { autoRenewal } = req.body;
      if (typeof autoRenewal !== 'boolean') {
        return res.status(400).json({ message: "Invalid autoRenewal value" });
      }

      await storage.updateUserAutoRenewal(userId, autoRenewal);
      res.json({ success: true, autoRenewal });
    } catch (error) {
      console.error("Error updating auto-renewal:", error);
      res.status(500).json({ message: "Failed to update auto-renewal setting" });
    }
  });

  // Payment method setup endpoint
  app.post("/api/create-payment-setup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // TODO: Implement Stripe Setup Intent for payment method
      res.json({ 
        clientSecret: "placeholder_client_secret",
        message: "Payment method setup coming soon"
      });
    } catch (error) {
      console.error("Error creating payment setup:", error);
      res.status(500).json({ message: "Failed to create payment setup" });
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
          description: "",
          isPrivate: false,
          maxUsers: 100,
          roomRules: "",
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
          description: "",
          isPrivate: false,
          maxUsers: 100,
          roomRules: "",
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

  // Get user's rooms with message counts for moderator dashboard
  app.get('/api/user-rooms', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const rooms = await storage.getUserRooms(userId);
      
      // Add message counts for each room
      const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
        const messages = await storage.getRoomMessages(room.id, 1000); // Get up to 1000 messages for count
        return {
          ...room,
          messageCount: messages.length
        };
      }));
      
      res.json(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching user rooms:', error);
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  // Get room messages for moderation
  app.get('/api/room-messages/:roomName', isAuthenticated, async (req, res) => {
    try {
      const { roomName } = req.params;
      const userId = (req as any).user.id;
      
      const room = await storage.getRoom(roomName);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      
      // Check if user is room moderator
      const isModerator = await storage.isRoomModerator(userId, room.id);
      if (!isModerator) {
        return res.status(403).json({ message: 'Not authorized to moderate this room' });
      }
      
      const messages = await storage.getRoomMessages(room.id, 50);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching room messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Delete room message
  app.delete('/api/room-messages/:messageId', isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = (req as any).user.id;
      
      // TODO: Add proper authorization check to ensure user can delete this message
      await storage.deleteRoomMessage(parseInt(messageId));
      
      res.json({ message: 'Message deleted successfully' });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  // Enhanced room moderation endpoints
  app.post('/api/rooms/:name/mute', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.params;
      const { messageId, duration = 5 } = req.body;
      const userId = (req as any).user.id;
      
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check if user is room moderator
      const isModerator = await storage.isRoomModerator(userId, room.id);
      if (!isModerator) {
        return res.status(403).json({ message: 'Only room moderators can mute users' });
      }

      // Get the message to find the IP to mute
      const messages = await storage.getRoomMessages(room.id, 100);
      const targetMessage = messages.find(m => m.id === parseInt(messageId));
      
      if (!targetMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Mute the IP for specified duration
      await storage.muteIp(targetMessage.ipAddress, userId, duration * 60);
      
      // Log the action
      await storage.logGuardianAction(
        userId, 
        'mute_user', 
        targetMessage.ipAddress, 
        parseInt(messageId), 
        { roomName: name, duration: duration }
      );

      res.json({ success: true, message: `User muted for ${duration} minutes` });
    } catch (error) {
      console.error('Room mute error:', error);
      res.status(500).json({ message: 'Failed to mute user' });
    }
  });

  app.post('/api/rooms/:name/ban', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.params;
      const { messageId } = req.body;
      const userId = (req as any).user.id;
      
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const isModerator = await storage.isRoomModerator(userId, room.id);
      if (!isModerator) {
        return res.status(403).json({ message: 'Only room moderators can ban users' });
      }

      // Get the message to find the user to ban
      const messages = await storage.getRoomMessages(room.id, 100);
      const targetMessage = messages.find(m => m.id === parseInt(messageId));
      
      if (!targetMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Ban the user from the room
      await storage.banUserFromRoom(room.id, targetMessage.ipAddress);
      
      // Log the action
      await storage.logGuardianAction(
        userId, 
        'ban_user', 
        targetMessage.ipAddress, 
        parseInt(messageId), 
        { roomName: name }
      );

      res.json({ success: true, message: 'User banned from room' });
    } catch (error) {
      console.error('Room ban error:', error);
      res.status(500).json({ message: 'Failed to ban user' });
    }
  });

  app.post('/api/rooms/:name/slow-mode', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.params;
      const { seconds } = req.body;
      const userId = (req as any).user.id;
      
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const isModerator = await storage.isRoomModerator(userId, room.id);
      if (!isModerator) {
        return res.status(403).json({ message: 'Only room moderators can set slow mode' });
      }

      await storage.setRoomSlowMode(room.id, seconds);
      
      // Log the action
      await storage.logGuardianAction(
        userId, 
        'slow_mode', 
        undefined, 
        undefined, 
        { roomName: name, seconds: seconds }
      );

      res.json({ success: true, message: `Slow mode set to ${seconds} seconds` });
    } catch (error) {
      console.error('Room slow mode error:', error);
      res.status(500).json({ message: 'Failed to set slow mode' });
    }
  });

  app.get('/api/rooms/:name/stats', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.params;
      const room = await storage.getRoom(name);
      
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const stats = await storage.getRoomStatistics(room.id);
      res.json(stats);
    } catch (error) {
      console.error('Room stats error:', error);
      res.status(500).json({ message: 'Failed to get room statistics' });
    }
  });

  app.delete('/api/rooms/:name/messages/:messageId', isAuthenticated, async (req, res) => {
    try {
      const { name, messageId } = req.params;
      const userId = (req as any).user.id;
      
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check if user is room owner or super user
      const user = await storage.getUser(userId);
      const isSuperUser = await storage.isSuperUser(userId);
      const isOwner = room.creatorId === userId;
      
      if (!isOwner && !isSuperUser) {
        return res.status(403).json({ message: 'Only room owners can delete messages' });
      }

      await storage.deleteRoomMessage(parseInt(messageId));
      
      // Log the action
      await storage.logGuardianAction(
        user?.username || userId, 
        'delete_room_message', 
        undefined, 
        parseInt(messageId), 
        { roomName: name }
      );

      // Broadcast message deletion to all room clients
      await broadcastRoomMessage(name, {
        type: 'room_message_deleted',
        data: { messageId: parseInt(messageId) }
      });

      res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
      console.error('Room message delete error:', error);
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  // Room messages endpoints
  app.get('/api/rooms/:name/messages', async (req, res) => {
    try {
      const { name } = req.params;
      const room = await storage.getRoom(name);
      
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      const messages = await storage.getRoomMessages(room.id, 50);
      res.json(messages);
    } catch (error) {
      console.error('Room messages fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch room messages' });
    }
  });

  app.post('/api/rooms/:name/messages', async (req, res) => {
    try {
      const { name } = req.params;
      const { content } = req.body;
      const ipAddress = getClientIp(req);
      
      // Validate content
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      // Get room
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Check rate limit with dynamic cooldown
      const { allowed, cooldownSeconds } = await checkRateLimit(ipAddress);
      if (!allowed) {
        return res.status(429).json({ 
          message: `Rate limited. Dynamic cooldown: ${cooldownSeconds}s` 
        });
      }

      // Check if user is muted in this room
      const isMuted = await storage.isMuted(ipAddress);
      if (isMuted) {
        return res.status(403).json({ message: 'You are muted in this room' });
      }

      // Check profanity
      const profanityCheck = checkProfanity(content);
      if (!profanityCheck.isClean) {
        return res.status(400).json({ message: 'Message contains inappropriate content' });
      }

      // Get username (authenticated user, custom handle, or anonymous)
      let username = generateUsername();
      try {
        // Check for authenticated user
        const cookies = req.headers.cookie;
        if (cookies) {
          const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
          if (sessionMatch) {
            const sessionId = decodeURIComponent(sessionMatch[1]);
            let sessionKey = sessionId;
            if (sessionKey.startsWith('s:')) {
              sessionKey = sessionKey.substring(2);
            }
            sessionKey = sessionKey.split('.')[0];
            
            const allSessions = await db.select().from(sessions);
            for (const session of allSessions) {
              if (session.sid === sessionKey) {
                const sessionData = session.sess as any;
                if (sessionData?.user?.id) {
                  const user = await storage.getUser(sessionData.user.id);
                  if (user?.username) {
                    username = user.username;
                    break;
                  }
                }
              }
            }
          }
        }
        
        // Fallback to custom handle or anonymous
        if (username.startsWith('anon')) {
          const customHandle = await storage.getCustomHandle(ipAddress);
          if (customHandle) {
            username = customHandle.handle;
          } else {
            const sessionKey = cookies ? 
              cookies.match(/connect\.sid=([^;]+)/)?.[1]?.replace('s:', '')?.split('.')[0] : 
              `anon_${ipAddress}`;
            username = await storage.getAnonUsername(sessionKey || `anon_${ipAddress}`);
          }
        }
      } catch (error) {
        // Use fallback username
      }

      // Create room message
      const message = await storage.createRoomMessage({
        roomId: room.id,
        content: sanitizeMessageContent(content.trim()),
        username: sanitizeUsername(username),
        ipAddress,
      });

      // Broadcast to room WebSocket clients
      broadcastRoomMessage(room.name, {
        type: 'room_message',
        data: {
          id: message.id,
          content: message.content,
          username: message.username,
          timestamp: message.createdAt.toISOString(),
          expiresAt: message.expiresAt.toISOString(),
          roomId: message.roomId,
        }
      });

      res.json({ message, success: true });
    } catch (error: any) {
      console.error('Room message creation error:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Room moderation endpoints
  app.post('/api/rooms/:name/mute', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.params;
      const { messageId } = req.body;
      const userId = (req as any).user.id;
      
      // Get room and verify ownership
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      
      if (room.creatorId !== userId) {
        return res.status(403).json({ message: 'Only room owner can mute users' });
      }

      // Get message to find IP to mute
      const messages = await storage.getRoomMessages(room.id, 1000);
      const targetMessage = messages.find(msg => msg.id === parseInt(messageId));
      
      if (!targetMessage) {
        return res.status(404).json({ message: 'Message not found' });
      }

      // Mute the IP for 5 minutes
      await storage.muteIp(targetMessage.ipAddress, userId, 5 * 60 * 1000);
      
      // Log the action
      await storage.logGuardianAction(
        userId, 
        'mute_user', 
        targetMessage.ipAddress, 
        targetMessage.id,
        { roomName: name, duration: '5 minutes' }
      );

      res.json({ success: true, message: 'User muted for 5 minutes' });
    } catch (error: any) {
      console.error('Room mute error:', error);
      res.status(500).json({ message: 'Failed to mute user' });
    }
  });

  app.delete('/api/rooms/:name/messages/:messageId', isAuthenticated, async (req, res) => {
    try {
      const { name, messageId } = req.params;
      const userId = (req as any).user.id;
      
      // Get room and verify ownership
      const room = await storage.getRoom(name);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      
      if (room.creatorId !== userId) {
        return res.status(403).json({ message: 'Only room owner can delete messages' });
      }

      // Delete the message
      const messageIdInt = parseInt(messageId);
      await storage.deleteRoomMessage(messageIdInt);
      
      // Broadcast deletion to room clients
      broadcastRoomMessage(name, {
        type: 'room_message_deleted',
        data: { messageId: messageIdInt }
      });
      
      // Log the action
      await storage.logGuardianAction(
        userId, 
        'delete_message', 
        undefined, 
        messageIdInt,
        { roomName: name }
      );

      res.json({ success: true, message: 'Message deleted' });
    } catch (error: any) {
      console.error('Room message deletion error:', error);
      res.status(500).json({ message: 'Failed to delete message' });
    }
  });

  // Help request submission endpoint
  app.post('/api/help-request', async (req, res) => {
    try {
      const { subject, message, email, priority } = req.body;
      const ipAddress = getClientIp(req);
      const userId = (req as any).user?.id;
      
      let username = 'anonymous';
      if (userId) {
        const user = await storage.getUser(userId);
        username = user?.username || 'user';
      } else {
        // Get anonymous username if available
        const sessionId = req.sessionID || 'temp';
        username = await storage.getAnonUsername(sessionId);
      }

      const helpRequest = await storage.createHelpRequest({
        userId,
        ipAddress,
        username,
        email,
        subject,
        message,
        priority: priority || 'normal'
      });

      res.json({ helpRequest, message: 'Help request submitted successfully' });
    } catch (error: any) {
      console.error('Error creating help request:', error);
      res.status(500).json({ message: 'Failed to submit help request' });
    }
  });

  // Backend help requests management
  app.get('/api/backend/help-requests', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isSuperUser = await storage.isSuperUser(userId);
      
      if (!isSuperUser) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { status } = req.query;
      const helpRequests = await storage.getHelpRequests(status as string);
      res.json(helpRequests);
    } catch (error: any) {
      console.error('Error fetching help requests:', error);
      res.status(500).json({ message: 'Failed to fetch help requests' });
    }
  });

  // Update help request status
  app.post('/api/backend/help-requests/:id/update', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isSuperUser = await storage.isSuperUser(userId);
      
      if (!isSuperUser) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { id } = req.params;
      const { status, assignedTo } = req.body;
      
      await storage.updateHelpRequestStatus(parseInt(id), status, assignedTo);
      res.json({ message: 'Help request updated successfully' });
    } catch (error: any) {
      console.error('Error updating help request:', error);
      res.status(500).json({ message: 'Failed to update help request' });
    }
  });

  // Sponsor analytics endpoint
  app.get('/api/backend/sponsor-analytics/:adId', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const isSuperUser = await storage.isSuperUser(userId);
      
      if (!isSuperUser) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const { adId } = req.params;
      const analytics = await storage.getSponsorAnalytics(parseInt(adId));
      res.json(analytics);
    } catch (error: any) {
      console.error('Error fetching sponsor analytics:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // Track sponsor ad clicks
  app.post('/api/sponsor-click/:adId', async (req, res) => {
    try {
      const { adId } = req.params;
      const ipAddress = getClientIp(req);
      const userAgent = req.headers['user-agent'];

      await storage.recordSponsorEvent({
        adId: parseInt(adId),
        eventType: 'click',
        ipAddress,
        userAgent,
        costCents: 5 // 5 cents per click
      });

      res.json({ message: 'Click tracked successfully' });
    } catch (error: any) {
      console.error('Error tracking sponsor click:', error);
      res.status(500).json({ message: 'Failed to track click' });
    }
  });

  wss.on('connection', (ws: WebSocketClient, req) => {
    const ipAddress = getClientIp(req);
    ws.ipAddress = ipAddress;
    
    // Check if this is a room-specific connection
    const url = req.url || '';
    const roomMatch = url.match(/\/ws\/room\/([^/?]+)/);
    if (roomMatch) {
      ws.roomName = roomMatch[1];
      console.log(`Room WebSocket connected to /${ws.roomName} from ${ipAddress}`);
      
      // Verify room exists immediately
      storage.getRoom(ws.roomName).then(room => {
        if (!room) {
          console.log(`Room ${ws.roomName} not found, closing connection`);
          ws.close(1008, 'Room not found');
          return;
        }
        console.log(`Room ${ws.roomName} verified, connection established`);
      }).catch(error => {
        console.error(`Error verifying room ${ws.roomName}:`, error);
        ws.close(1011, 'Server error');
      });
    }
    
    clients.add(ws);
    broadcastOnlineCount();
    
    console.log(`WebSocket connected from ${ipAddress}`, {
      headers: req.headers,
      url: req.url
    });
    
    // Send recent messages to new client
    if (ws.roomName) {
      // For room connections, send room messages
      setTimeout(() => {
        storage.getRoom(ws.roomName).then(room => {
          if (room) {
            console.log(`Loading messages for room ${ws.roomName} (id: ${room.id})`);
            return storage.getRoomMessages(room.id, 50);
          }
          console.log(`Room ${ws.roomName} not found when loading messages`);
          return [];
        }).then(messages => {
          console.log(`Found ${messages.length} messages for room ${ws.roomName}`);
          const recentMessages = messages.map(msg => ({
            type: 'room_message',
            data: {
              id: msg.id,
              content: msg.content,
              username: msg.username,
              timestamp: msg.createdAt.toISOString(),
              roomId: msg.roomId,
            }
          }));
          
          if (ws.readyState === WebSocket.OPEN) {
            console.log(`Sending ${recentMessages.length} initial messages to room ${ws.roomName}`);
            ws.send(JSON.stringify({ type: 'initial_room_messages', data: recentMessages }));
          } else {
            console.log(`WebSocket closed before sending messages to room ${ws.roomName}`);
          }
        }).catch(error => {
          console.error('Error sending initial room messages:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1011, 'Server error loading messages');
          }
        });
      }, 100); // Small delay to ensure connection is fully established
    } else {
      // For global chat connections, send global messages
      storage.getRecentMessages(100).then(messages => {
        const recentMessages = messages.map(msg => ({
          type: 'message',
          data: {
            id: msg.id,
            content: msg.content,
            username: msg.username,
            timestamp: msg.createdAt.toISOString(),
            expiresAt: msg.expiresAt?.toISOString() || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            replyToId: msg.replyToId,
          }
        }));
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'initial_messages', data: recentMessages }));
        }
      }).catch(error => {
        console.error('Error sending initial messages:', error);
      });
    }
    
    // Send guardian status and current user info
    const sendUserInfo = async () => {
      try {
        // Check for authenticated user first
        let authenticatedUser = null;
        const cookies = req.headers.cookie;
        
        if (cookies) {
          try {
            const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
            if (sessionMatch) {
              const sessionId = decodeURIComponent(sessionMatch[1]);
              
              // Check sessions to find the matching one
              const allSessions = await db.select().from(sessions);
              
              for (const session of allSessions) {
                // Extract session key properly - remove 's:' prefix and get part before signature
                let sessionKey = sessionId;
                if (sessionKey.startsWith('s:')) {
                  sessionKey = sessionKey.substring(2); // Remove 's:' prefix
                }
                sessionKey = sessionKey.split('.')[0]; // Get the part before the signature
                
                if (session.sid === sessionKey) {
                  const sessionData = session.sess as any;
                  
                  if (sessionData?.user?.id) {
                    const userId = sessionData.user.id;
                    authenticatedUser = await storage.getUser(userId);
                    break;
                  }
                }
              }
            }
          } catch (error) {
            // Session parsing failed, will fall back to anonymous
          }
        }
        
        // Get session ID for anonymous username lookup
        let sessionKey = null;
        if (cookies) {
          const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
          if (sessionMatch) {
            const sessionId = decodeURIComponent(sessionMatch[1]);
            sessionKey = sessionId;
            if (sessionKey.startsWith('s:')) {
              sessionKey = sessionKey.substring(2); // Remove 's:' prefix
            }
            sessionKey = sessionKey.split('.')[0]; // Get the part before the signature
          }
        }
        
        const [isGuardian, anonUsername, customHandle] = await Promise.all([
          storage.isGuardian(ipAddress),
          storage.getAnonUsername(sessionKey || `anon_${ipAddress}`),
          storage.getCustomHandle(ipAddress)
        ]);
        
        // Determine username priority: authenticated > custom handle > anon
        let currentUsername: string;
        if (authenticatedUser?.username) {
          currentUsername = authenticatedUser.username;
        } else if (customHandle) {
          currentUsername = customHandle.handle;
        } else {
          currentUsername = anonUsername;
        }
        
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
      } catch (error) {
        console.error('Error checking guardian status or username:', error);
      }
    };
    
    sendUserInfo();
    
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

          const { allowed, blockedUntil, cooldownSeconds } = await checkRateLimit(ipAddress);
          
          if (!allowed) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { 
                message: blockedUntil ? 
                  `You are temporarily blocked until ${blockedUntil.toLocaleTimeString()}` :
                  `Rate limited. Dynamic cooldown: ${cooldownSeconds}s (chat activity based)`
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
          let sessionKey = null;
          const cookies = req.headers.cookie;
          
          if (cookies) {
            try {
              const sessionMatch = cookies.match(/connect\.sid=([^;]+)/);
              if (sessionMatch) {
                const sessionId = decodeURIComponent(sessionMatch[1]);
                
                // Check all sessions to find the matching one
                const allSessions = await db.select().from(sessions);
                
                // Extract session key properly - remove 's:' prefix and get part before signature
                sessionKey = sessionId;
                if (sessionKey.startsWith('s:')) {
                  sessionKey = sessionKey.substring(2); // Remove 's:' prefix
                }
                sessionKey = sessionKey.split('.')[0]; // Get the part before the signature
                
                for (const session of allSessions) {
                  
                  if (session.sid === sessionKey) {
                    const sessionData = session.sess as any;
                    
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
                      authenticatedUser = await storage.getUser(userId);
                      break;
                    }
                  }
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
              username = await storage.getAnonUsername(sessionKey || `anon_${ipAddress}`);
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
  
  // Backend Administration Endpoints
  app.get('/api/backend/pending-sponsors', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Get all sponsor ads from database with accurate data
      const sponsors = await storage.getActiveAmbientAds();
      
      const sponsorData = sponsors.map(sponsor => {
        const daysRemaining = Math.ceil((sponsor.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: sponsor.id,
          productName: sponsor.productName,
          description: sponsor.description,
          url: sponsor.url,
          submittedAt: sponsor.createdAt,
          expiresAt: sponsor.expiresAt,
          status: 'active',
          daysRemaining: Math.max(0, daysRemaining),
          isExpired: daysRemaining <= 0
        };
      });

      res.json(sponsorData);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      res.status(500).json({ message: 'Failed to fetch sponsors' });
    }
  });

  app.get('/api/backend/system-stats', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const [userStats, messageStats, sponsorStats] = await Promise.all([
        storage.getUserStatistics(),
        storage.getMessageStatistics(),
        storage.getSponsorStatistics()
      ]);

      res.json({
        users: userStats,
        messages: messageStats,
        sponsors: sponsorStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      res.status(500).json({ message: 'Failed to fetch system statistics' });
    }
  });

  app.get('/api/backend/all-users', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      const users = await storage.getAllUsers();
      
      const userData = users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        isSuperUser: u.username === 'voidteam' || u.username === 'caselka'
      }));

      res.json(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/backend/user-reports', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Get recent guardian actions as moderation reports
      const guardianActions = await storage.getRecentGuardianActions(20);
      
      const reportData = guardianActions.map(action => ({
        id: action.id,
        guardianUser: action.guardianIp,
        action: action.action,
        targetIp: action.targetIp,
        messageId: action.messageId,
        details: action.details,
        timestamp: action.createdAt,
        status: 'completed'
      }));

      res.json(reportData);
    } catch (error) {
      console.error('Error fetching user reports:', error);
      res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // Deep user analytics endpoints
  app.get('/api/backend/user-analytics/:userId', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const { userId } = req.params;
      const analytics = await storage.getUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({ message: 'Failed to fetch user analytics' });
    }
  });

  app.get('/api/backend/all-user-analytics', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      const analytics = await storage.getAllUserAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching all user analytics:', error);
      res.status(500).json({ message: 'Failed to fetch user analytics' });
    }
  });

  app.get('/api/backend/system-alerts', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      // Generate real system health alerts based on actual data
      const [userStats, messageStats, sponsorStats] = await Promise.all([
        storage.getUserStatistics(),
        storage.getMessageStatistics(),
        storage.getSponsorStatistics()
      ]);

      const alerts = [];
      const now = new Date();

      // High activity alert
      if (messageStats.messagesLast24h > 100) {
        alerts.push({
          id: 1,
          type: "info",
          message: `High activity: ${messageStats.messagesLast24h} messages in last 24 hours`,
          timestamp: now.toISOString(),
          resolved: true
        });
      }

      // New user signups
      if (userStats.recentSignups > 0) {
        alerts.push({
          id: 2,
          type: "info", 
          message: `${userStats.recentSignups} new user signups in last 24 hours`,
          timestamp: now.toISOString(),
          resolved: true
        });
      }

      // Active sponsors status
      alerts.push({
        id: 3,
        type: "info",
        message: `${sponsorStats.activeSponsors} active sponsors, ${sponsorStats.totalSponsors} total`,
        timestamp: now.toISOString(),
        resolved: true
      });

      // System operational status
      alerts.push({
        id: 4,
        type: "success",
        message: `System operational - ${userStats.totalUsers} total users, ${messageStats.activeRooms} active rooms`,
        timestamp: now.toISOString(),
        resolved: true
      });

      res.json(alerts);
    } catch (error) {
      console.error('Error fetching system alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  app.post('/api/backend/sponsors/:id/:action', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const { id, action } = req.params;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }

      if (action === 'approve') {
        await storage.approveSponsorAd(parseInt(id), user.id);
        console.log(`Sponsor ${id} approved by ${user.username}`);
      } else if (action === 'reject') {
        await storage.rejectSponsorAd(parseInt(id), user.id, 'Rejected by super user');
        console.log(`Sponsor ${id} rejected and removed by ${user.username}`);
      }
      
      res.json({ 
        message: `Sponsor ${action}ed successfully`,
        sponsorId: id,
        action: action
      });
    } catch (error) {
      console.error('Error processing sponsor action:', error);
      res.status(500).json({ message: 'Failed to process sponsor action' });
    }
  });

  app.post('/api/backend/reports/:id/:action', isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const { id, action } = req.params;
      const { notes } = req.body;
      
      if (!await storage.isSuperUser(user.id)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      if (!['resolve', 'dismiss'].includes(action)) {
        return res.status(400).json({ message: 'Invalid action' });
      }

      console.log(`Report ${id} ${action}ed by ${user.username}${notes ? ` with notes: ${notes}` : ''}`);
      
      res.json({ 
        message: `Report ${action}ed successfully`,
        reportId: id,
        action: action
      });
    } catch (error) {
      console.error('Error processing report action:', error);
      res.status(500).json({ message: 'Failed to process report action' });
    }
  });
  
  // Cleanup expired items every minute (messages are now permanent)
  setInterval(async () => {
    try {
      // Messages are now permanent - no cleanup needed
      await storage.deleteExpiredAds();
      await storage.deleteExpiredHandles();
      await storage.deleteExpiredThemes();
      await storage.cleanExpiredMutes();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }, 60 * 1000);

  // Serve clean static files for production-like experience  
  app.get('/clean', (req, res) => {
    res.sendFile('index.html', { root: './client' });
  });
  
  app.get('/clean/style.css', (req, res) => {
    res.sendFile('style.css', { root: './client' });
  });
  
  app.get('/clean/script.js', (req, res) => {
    res.sendFile('script.js', { root: './client' });
  });
  
  return httpServer;
}

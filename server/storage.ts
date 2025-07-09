import { 
  messages, 
  guardians, 
  ambientAds, 
  rateLimits, 
  mutedIps, 
  guardianActions,
  systemSettings,
  customHandles,
  themeCustomizations,
  users,
  anonUsernames,
  rooms,
  roomMessages,
  helpRequests,
  sponsorAnalytics,
  directMessages,
  directMessageConversations,
  type Message, 
  type InsertMessage,
  type Guardian,
  type InsertGuardian,
  type AmbientAd,
  type InsertAmbientAd,
  type RateLimit,
  type MutedIp,
  type GuardianAction,
  type CustomHandle,
  type InsertCustomHandle,
  type ThemeCustomization,
  type InsertThemeCustomization,
  type User,
  type UpsertUser,
  type AnonUsername,
  type InsertAnonUsername,
  type Room,
  type InsertRoom,
  type RoomMessage,
  type InsertRoomMessage,
  type HelpRequest,
  type InsertHelpRequest,
  type SponsorAnalytics,
  type InsertSponsorAnalytics,
  type DirectMessage,
  type InsertDirectMessage,
  type DirectMessageConversation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, gt, desc, asc, sql, or, count } from "drizzle-orm";
import { checkProfanity, validateUsernameFormat } from "./profanity-filter";

export interface IStorage {
  // Messages (15-minute expiration)
  createMessage(message: InsertMessage & { username: string; ipAddress: string }): Promise<Message>;
  getRecentMessages(limit?: number): Promise<Message[]>;
  deleteExpiredMessages(): Promise<void>; // Deletes messages older than 15 minutes
  deleteMessage(id: number): Promise<void>;
  
  // Rate limiting
  getRateLimit(ipAddress: string): Promise<RateLimit | undefined>;
  updateRateLimit(ipAddress: string, messageCount: number, blockedUntil?: Date): Promise<void>;
  
  // Guardians
  createGuardian(guardian: InsertGuardian): Promise<Guardian>;
  isGuardian(ipAddress: string): Promise<boolean>;
  getGuardianStatus(ipAddress: string): Promise<Guardian | undefined>;
  
  // Ambient ads
  createAmbientAd(ad: InsertAmbientAd): Promise<AmbientAd>;
  getActiveAmbientAds(): Promise<AmbientAd[]>;
  deleteExpiredAds(): Promise<void>;
  
  // Moderation
  muteIp(ipAddress: string, mutedBy: string, duration: number): Promise<void>;
  isMuted(ipAddress: string): Promise<boolean>;
  cleanExpiredMutes(): Promise<void>;
  logGuardianAction(guardianIp: string, action: string, targetIp?: string, messageId?: number, details?: any): Promise<void>;
  
  // System settings
  getSystemSetting(key: string): Promise<string | undefined>;
  setSystemSetting(key: string, value: string): Promise<void>;
  
  // Custom handles
  createCustomHandle(handle: InsertCustomHandle): Promise<CustomHandle>;
  getCustomHandle(ipAddress: string): Promise<CustomHandle | undefined>;
  isHandleAvailable(handle: string): Promise<boolean>;
  deleteExpiredHandles(): Promise<void>;
  
  // Theme customizations
  createThemeCustomization(theme: InsertThemeCustomization): Promise<ThemeCustomization>;
  getThemeCustomization(ipAddress: string): Promise<ThemeCustomization | undefined>;
  deleteExpiredThemes(): Promise<void>;

  // Anonymous usernames
  getAnonUsername(sessionId: string): Promise<string>;
  createAnonUsername(sessionId: string, username: string): Promise<AnonUsername>;
  updateAnonUsernameLastUsed(sessionId: string): Promise<void>;
  
  // Auth (Email/Password)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  verifyUser(id: string): Promise<void>;
  
  // Global Moderation
  isGlobalModerator(userId: string): Promise<boolean>;
  setGlobalModerator(userId: string, isModerator: boolean): Promise<void>;
  updateUserAutoRenewal(userId: string, autoRenewal: boolean): Promise<void>;
  updateUserPaymentMethod(userId: string, stripeCustomerId: string, paymentMethodId: string): Promise<void>;
  
  // User stats for Guardian eligibility
  getUserStats?(ipAddress: string): Promise<{ messagesLast7Days: number; paidAccountSince?: Date } | undefined>;
  
  // Deep user analytics like X.com/Facebook
  getUserAnalytics(userId: string): Promise<{
    totalMessages: number;
    messagesLast7Days: number;
    messagesLast30Days: number;
    averageMessagesPerDay: number;
    mostActiveHours: number[];
    engagementScore: number;
    accountAge: number;
    lastActiveDate: Date | null;
    roomsCreated: number;
    roomsJoined: number;
    moderationActions: number;
    guardianHistory: boolean;
    paymentHistory: { amount: number; date: Date; type: string }[];
    activityTrend: 'increasing' | 'decreasing' | 'stable';
    riskScore: number;
    deviceFingerprint: string[];
  }>;
  
  getAllUserAnalytics(): Promise<{
    userId: string;
    username: string;
    email: string;
    totalMessages: number;
    lastActive: Date | null;
    engagementScore: number;
    riskScore: number;
    accountAge: number;
    isVerified: boolean;
    guardian: boolean;
  }[]>;
  
  // Super user administration
  isSuperUser(userId: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  getUserStatistics(): Promise<{ totalUsers: number; verifiedUsers: number; recentSignups: number }>;
  getMessageStatistics(): Promise<{ totalMessages: number; messagesLast24h: number; activeRooms: number }>;
  getSponsorStatistics(): Promise<{ totalSponsors: number; activeSponsors: number; pendingApprovals: number }>;
  getPendingSponsorRequests(): Promise<any[]>;
  getRecentGuardianActions(limit?: number): Promise<GuardianAction[]>;
  deleteExpiredSponsorAds(): Promise<void>;
  approveSponsorAd(adId: number, approvedBy: string): Promise<void>;
  rejectSponsorAd(adId: number, rejectedBy: string, reason?: string): Promise<void>;
  
  // Username expiration management
  processExpiredUsernames(): Promise<void>;
  renewUsername(userId: string): Promise<void>;
  isUsernameExpired(userId: string): Promise<boolean>;
  getUsernameStatus(userId: string): Promise<{ expired: boolean; inGracePeriod: boolean; daysUntilExpiration: number }>;
  
  // Enhanced room management
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(name: string): Promise<Room | undefined>;
  getRoomById(id: number): Promise<Room | undefined>;
  getUserRooms(userId: string): Promise<Room[]>;
  getAllRooms(): Promise<Room[]>;
  isRoomNameAvailable(name: string): Promise<boolean>;
  updateRoomSettings(roomId: number, settings: Partial<Room>): Promise<void>;
  banUserFromRoom(roomId: number, userId: string): Promise<void>;
  unbanUserFromRoom(roomId: number, userId: string): Promise<void>;
  isUserBannedFromRoom(roomId: number, userId: string): Promise<boolean>;
  setRoomSlowMode(roomId: number, seconds: number): Promise<void>;
  getRoomModerators(roomId: number): Promise<string[]>;
  getRoomStatistics(roomId: number): Promise<{
    messageCount: number;
    activeUsers: number;
    createdAt: Date;
    moderatorCount: number;
  }>;
  
  // Room messages
  createRoomMessage(message: InsertRoomMessage & { username: string; ipAddress: string }): Promise<RoomMessage>;
  getRoomMessages(roomId: number, limit?: number): Promise<RoomMessage[]>;
  getRecentRoomMessages(roomId: number, minutes?: number): Promise<RoomMessage[]>; // Get messages from last X minutes
  deleteExpiredRoomMessages(): Promise<void>;
  deleteRoomMessage(id: number): Promise<void>;
  
  // Room moderation
  isRoomModerator(userId: string, roomId: number): Promise<boolean>;
  addRoomModerator(roomId: number, userId: string): Promise<void>;
  removeRoomModerator(roomId: number, userId: string): Promise<void>;
  
  // Dynamic rate limiting
  getMessageFrequency(ipAddress: string, minutes?: number): Promise<number>;
  calculateDynamicCooldown(ipAddress: string): Promise<number>;
  
  // Help requests
  createHelpRequest(helpRequest: InsertHelpRequest): Promise<HelpRequest>;
  getHelpRequests(status?: string): Promise<HelpRequest[]>;
  updateHelpRequestStatus(id: number, status: string, assignedTo?: string): Promise<void>;
  
  // Sponsor analytics
  recordSponsorEvent(analytics: InsertSponsorAnalytics): Promise<SponsorAnalytics>;
  getSponsorAnalytics(adId: number): Promise<SponsorAnalytics[]>;
  updateSponsorFunds(adId: number, spent: number): Promise<void>;
  
  // Direct Messages (paid accounts only)
  sendDirectMessage(fromUserId: string, toUserId: string, content: string): Promise<DirectMessage>;
  getDirectMessages(userId1: string, userId2: string, limit?: number): Promise<DirectMessage[]>;
  getUserConversations(userId: string): Promise<DirectMessageConversation[]>;
  markMessagesAsRead(userId: string, conversationId: number): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  createOrUpdateConversation(user1Id: string, user2Id: string, lastMessageId: number): Promise<DirectMessageConversation>;
  deleteDirectMessage(messageId: number, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createMessage(messageData: InsertMessage & { username: string; ipAddress: string; replyToId?: number }): Promise<Message> {
    // Additional security check: Ensure content and username are clean
    const { sanitizeMessageContent, sanitizeUsername } = await import('./security');
    
    // Set expiration to 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    const [message] = await db
      .insert(messages)
      .values({
        content: sanitizeMessageContent(messageData.content),
        username: sanitizeUsername(messageData.username),
        ipAddress: messageData.ipAddress,
        replyToId: messageData.replyToId || null,
        expiresAt,
      })
      .returning();
    return message;
  }

  async getRecentMessages(limit = 50): Promise<Message[]> {
    // Get recent messages that haven't expired yet
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        username: messages.username,
        ipAddress: messages.ipAddress,
        createdAt: messages.createdAt,
        expiresAt: messages.expiresAt,
        replyToId: messages.replyToId,
      })
      .from(messages)
      .where(gt(messages.expiresAt, new Date()))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async deleteExpiredMessages(): Promise<void> {
    // Delete messages that have expired (older than 15 minutes)
    await db
      .delete(messages)
      .where(lt(messages.expiresAt, new Date()));
  }

  async deleteMessage(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getRateLimit(ipAddress: string): Promise<RateLimit | undefined> {
    const [rateLimit] = await db
      .select()
      .from(rateLimits)
      .where(eq(rateLimits.ipAddress, ipAddress));
    return rateLimit || undefined;
  }

  async updateRateLimit(ipAddress: string, messageCount: number, blockedUntil?: Date): Promise<void> {
    const existing = await this.getRateLimit(ipAddress);
    
    if (existing) {
      await db
        .update(rateLimits)
        .set({
          messageCount,
          lastMessageAt: new Date(),
          blockedUntil,
        })
        .where(eq(rateLimits.ipAddress, ipAddress));
    } else {
      await db
        .insert(rateLimits)
        .values({
          ipAddress,
          messageCount,
          lastMessageAt: new Date(),
          blockedUntil,
        });
    }
  }

  async createGuardian(guardian: InsertGuardian): Promise<Guardian> {
    const [newGuardian] = await db
      .insert(guardians)
      .values(guardian)
      .returning();
    return newGuardian;
  }

  async isGuardian(ipAddress: string): Promise<boolean> {
    const now = new Date();
    const [guardian] = await db
      .select()
      .from(guardians)
      .where(and(
        eq(guardians.ipAddress, ipAddress),
        gte(guardians.expiresAt, now)
      ));
    return !!guardian;
  }

  async getGuardianStatus(ipAddress: string): Promise<Guardian | undefined> {
    const now = new Date();
    const [guardian] = await db
      .select()
      .from(guardians)
      .where(and(
        eq(guardians.ipAddress, ipAddress),
        gte(guardians.expiresAt, now)
      ));
    return guardian || undefined;
  }

  async createAmbientAd(ad: InsertAmbientAd): Promise<AmbientAd> {
    const [newAd] = await db
      .insert(ambientAds)
      .values(ad)
      .returning();
    return newAd;
  }

  async getActiveAmbientAds(): Promise<AmbientAd[]> {
    const now = new Date();
    return await db
      .select()
      .from(ambientAds)
      .where(gte(ambientAds.expiresAt, now))
      .orderBy(asc(ambientAds.createdAt));
  }

  async deleteExpiredAds(): Promise<void> {
    const now = new Date();
    await db.delete(ambientAds).where(lte(ambientAds.expiresAt, now));
  }

  async muteIp(ipAddress: string, mutedBy: string, duration: number): Promise<void> {
    const expiresAt = new Date(Date.now() + duration);
    await db
      .insert(mutedIps)
      .values({
        ipAddress,
        mutedBy,
        expiresAt,
      });
  }

  async isMuted(ipAddress: string): Promise<boolean> {
    const now = new Date();
    const [muted] = await db
      .select()
      .from(mutedIps)
      .where(and(
        eq(mutedIps.ipAddress, ipAddress),
        gte(mutedIps.expiresAt, now)
      ));
    return !!muted;
  }

  async cleanExpiredMutes(): Promise<void> {
    const now = new Date();
    await db.delete(mutedIps).where(lt(mutedIps.expiresAt, now));
  }

  async logGuardianAction(guardianIp: string, action: string, targetIp?: string, messageId?: number, details?: any): Promise<void> {
    await db
      .insert(guardianActions)
      .values({
        guardianIp,
        action,
        targetIp,
        messageId,
        details,
      });
  }

  async getSystemSetting(key: string): Promise<string | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return setting?.value;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    const existing = await this.getSystemSetting(key);
    
    if (existing) {
      await db
        .update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      await db
        .insert(systemSettings)
        .values({ key, value });
    }
  }
  // Custom handles
  async createCustomHandle(handle: InsertCustomHandle): Promise<CustomHandle> {
    const [newHandle] = await db.insert(customHandles).values(handle).returning();
    return newHandle;
  }

  async getCustomHandle(ipAddress: string): Promise<CustomHandle | undefined> {
    const [handle] = await db.select().from(customHandles)
      .where(and(
        eq(customHandles.ipAddress, ipAddress),
        gte(customHandles.expiresAt, new Date())
      ));
    return handle || undefined;
  }

  async isHandleAvailable(handle: string): Promise<boolean> {
    const trimmed = handle.trim();
    const lowerHandle = trimmed.toLowerCase();
    
    // Basic format validation
    const formatCheck = validateUsernameFormat(trimmed);
    if (!formatCheck.isValid) {
      return false;
    }
    
    // Profanity check using comprehensive filter
    const profanityCheck = checkProfanity(trimmed);
    if (!profanityCheck.isClean) {
      return false;
    }
    
    // System/Platform Reserved Terms
    const systemReserved = [
      'voidchat', 'admin', 'moderator', 'guardian', 'system', 'server', 
      'support', 'mod', 'root', 'dev', 'owner', 'bot', 'null', 
      'undefined', 'console', 'test'
    ];
    
    // Personal/Founder Protection
    const founderReserved = [
      'caselka', 'cameron', 'cameronpettit', 'cam', 'cmp', 
      'ptcsolutions', 'redd'
    ];
    
    // Check exact matches against reserved lists
    if (systemReserved.includes(lowerHandle) || founderReserved.includes(lowerHandle)) {
      return false;
    }
    
    // Check if handle contains any founder/personal terms (substring matching)
    for (const term of founderReserved) {
      if (lowerHandle.includes(term)) {
        return false;
      }
    }
    
    // Block anon pattern (anonXXXX) to avoid confusion with generated usernames
    if (/^anon\d+$/i.test(trimmed)) {
      return false;
    }
    
    // Block UUID-like patterns
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return false;
    }
    
    // Block anything starting with //
    if (trimmed.startsWith('//')) {
      return false;
    }
    
    // Check if handle is already taken in database
    const [existing] = await db.select().from(customHandles)
      .where(and(
        eq(customHandles.handle, trimmed),
        gte(customHandles.expiresAt, new Date())
      ));
    return !existing;
  }

  async deleteExpiredHandles(): Promise<void> {
    await db.delete(customHandles)
      .where(lte(customHandles.expiresAt, new Date()));
  }

  // Theme customizations
  async createThemeCustomization(theme: InsertThemeCustomization): Promise<ThemeCustomization> {
    const [newTheme] = await db.insert(themeCustomizations).values(theme)
      .onConflictDoUpdate({
        target: themeCustomizations.ipAddress,
        set: {
          background: theme.background,
          font: theme.font,
          accentColor: theme.accentColor,
          messageFadeTime: theme.messageFadeTime,
          backgroundFx: theme.backgroundFx,
          expiresAt: theme.expiresAt,
          stripePaymentId: theme.stripePaymentId
        }
      }).returning();
    return newTheme;
  }

  async getThemeCustomization(ipAddress: string): Promise<ThemeCustomization | undefined> {
    const [theme] = await db.select().from(themeCustomizations)
      .where(and(
        eq(themeCustomizations.ipAddress, ipAddress),
        gte(themeCustomizations.expiresAt, new Date())
      ));
    return theme || undefined;
  }

  async deleteExpiredThemes(): Promise<void> {
    await db.delete(themeCustomizations)
      .where(lte(themeCustomizations.expiresAt, new Date()));
  }

  // Auth methods for Email/Password
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(
        eq(users.username, usernameOrEmail),
        eq(users.email, usernameOrEmail)
      )
    );
    return user;
  }

  async isSuperUser(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    // Check if user is flagged as super user OR is caselka (founder) OR is voidteam (backend)
    return user?.isSuperUser || user?.username === 'caselka' || user?.username === 'voidteam' || false;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Set username expiration to 30 days from now
    const usernameExpiresAt = new Date();
    usernameExpiresAt.setDate(usernameExpiresAt.getDate() + 30);
    
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        id: userId,
        usernameExpiresAt,
        autoRenewal: true, // Auto-renewal ON by default
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async verifyUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        isVerified: true,
        verificationCode: null,
        verificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async updateUserAutoRenewal(userId: string, autoRenewal: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        autoRenewal,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async updateUserPaymentMethod(userId: string, stripeCustomerId: string, paymentMethodId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        stripeCustomerId,
        stripePaymentMethodId: paymentMethodId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async getAnonUsername(sessionId: string): Promise<string> {
    // For anonymous users without sessions, generate a temporary ID
    const effectiveSessionId = sessionId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const [existingUsername] = await db
      .select()
      .from(anonUsernames)
      .where(eq(anonUsernames.sessionId, effectiveSessionId));

    if (existingUsername) {
      // Update last used timestamp
      await this.updateAnonUsernameLastUsed(effectiveSessionId);
      return existingUsername.username;
    }

    // Generate a new unique username
    let attempts = 0;
    while (attempts < 100) { // Prevent infinite loop
      const newUsername = `anon${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Check if username is already taken
      const [existing] = await db
        .select()
        .from(anonUsernames)
        .where(eq(anonUsernames.username, newUsername));

      if (!existing) {
        // Create new username entry
        const created = await this.createAnonUsername(effectiveSessionId, newUsername);
        return created.username;
      }
      attempts++;
    }

    // Fallback - should rarely happen
    return `anon${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async createAnonUsername(sessionId: string, username: string): Promise<AnonUsername> {
    const [anonUsername] = await db
      .insert(anonUsernames)
      .values({
        sessionId,
        username,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      })
      .returning();
    return anonUsername;
  }

  async updateAnonUsernameLastUsed(sessionId: string): Promise<void> {
    await db
      .update(anonUsernames)
      .set({ lastUsedAt: new Date() })
      .where(eq(anonUsernames.sessionId, sessionId));
  }

  async getUserStats(ipAddress: string): Promise<{ messagesLast7Days: number; paidAccountSince?: Date } | undefined> {
    try {
      // Count messages from last 7 days for this IP
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const messageCount = await db.select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(
          eq(messages.ipAddress, ipAddress),
          gte(messages.createdAt, sevenDaysAgo)
        ));

      // Check if user has paid account (Guardian or custom handle purchases)
      const paidAccount = await db.select({ createdAt: guardians.createdAt })
        .from(guardians)
        .where(eq(guardians.ipAddress, ipAddress))
        .orderBy(desc(guardians.createdAt))
        .limit(1);

      console.log(`User stats for IP ${ipAddress}: messages=${messageCount[0]?.count || 0}, paidAccount=${!!paidAccount[0]}`);

      return {
        messagesLast7Days: messageCount[0]?.count || 0,
        paidAccountSince: paidAccount[0]?.createdAt
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      return undefined;
    }
  }

  // Room management methods
  async createRoom(roomData: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values({
        ...roomData,
        description: roomData.description || "",
        isPrivate: roomData.isPrivate || false,
        maxUsers: roomData.maxUsers || 100,
        roomRules: roomData.roomRules || "",
      })
      .returning();
    return room;
  }

  async getRoom(name: string): Promise<Room | undefined> {
    const [room] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.name, name), eq(rooms.isActive, true)));
    return room;
  }

  async getRoomById(id: number): Promise<Room | undefined> {
    const [room] = await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.isActive, true)));
    return room;
  }

  async getUserRooms(userId: string): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.creatorId, userId), eq(rooms.isActive, true)))
      .orderBy(desc(rooms.createdAt));
  }

  async getAllRooms(): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(desc(rooms.createdAt));
  }

  async isRoomNameAvailable(name: string): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(rooms)
      .where(eq(rooms.name, name))
      .limit(1);
    return !existing;
  }

  // Room messages methods
  async createRoomMessage(messageData: InsertRoomMessage & { username: string; ipAddress: string }): Promise<RoomMessage> {
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    
    const [message] = await db
      .insert(roomMessages)
      .values({
        ...messageData,
        expiresAt,
        createdAt: new Date(),
      })
      .returning();
    return message;
  }

  async getRecentRoomMessages(roomId: number, minutes = 15): Promise<RoomMessage[]> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return await db
      .select()
      .from(roomMessages)
      .where(and(
        eq(roomMessages.roomId, roomId),
        gte(roomMessages.createdAt, cutoffTime),
        gte(roomMessages.expiresAt, new Date()) // Non-expired
      ))
      .orderBy(asc(roomMessages.createdAt));
  }

  async isRoomModerator(userId: string, roomId: number): Promise<boolean> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return false;
    
    // Check if user is the creator or a moderator
    if (room.creatorId === userId) return true;
    if (room.moderators && room.moderators.includes(userId)) return true;
    
    // Check if user is super user (caselka)
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.isSuperUser) return true;
    
    return false;
  }

  async addRoomModerator(roomId: number, userId: string): Promise<void> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return;
    
    const currentModerators = room.moderators || [];
    if (!currentModerators.includes(userId)) {
      await db
        .update(rooms)
        .set({ moderators: [...currentModerators, userId] })
        .where(eq(rooms.id, roomId));
    }
  }

  async removeRoomModerator(roomId: number, userId: string): Promise<void> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return;
    
    const currentModerators = room.moderators || [];
    const newModerators = currentModerators.filter(id => id !== userId);
    
    await db
      .update(rooms)
      .set({ moderators: newModerators })
      .where(eq(rooms.id, roomId));
  }

  async getMessageFrequency(ipAddress: string, minutes = 5): Promise<number> {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(
        eq(messages.ipAddress, ipAddress),
        gte(messages.createdAt, cutoffTime)
      ));
    return result[0]?.count || 0;
  }

  async calculateDynamicCooldown(ipAddress: string): Promise<number> {
    // Get message frequency in last 5 minutes
    const recentMessages = await this.getMessageFrequency(ipAddress, 5);
    
    // Base cooldown of 5 seconds
    let cooldown = 5;
    
    // If chat is quiet (fewer than 10 messages from all users in last 5 minutes), reduce cooldown
    const totalRecentMessages = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(gte(messages.createdAt, new Date(Date.now() - 5 * 60 * 1000)));
    
    const globalActivity = totalRecentMessages[0]?.count || 0;
    
    if (globalActivity < 10) {
      // Chat is quiet, allow faster messaging (2 second cooldown)
      cooldown = 2;
    } else if (recentMessages > 3) {
      // User is very active, increase cooldown
      cooldown = 10;
    }
    
    return cooldown;
  }

  async getRoomMessages(roomId: number, limit = 50): Promise<RoomMessage[]> {
    const now = new Date();
    return await db
      .select()
      .from(roomMessages)
      .where(and(
        eq(roomMessages.roomId, roomId),
        gte(roomMessages.expiresAt, now) // Only non-expired messages
      ))
      .orderBy(desc(roomMessages.createdAt))
      .limit(limit);
  }

  async deleteExpiredRoomMessages(): Promise<void> {
    await db
      .delete(roomMessages)
      .where(lt(roomMessages.expiresAt, new Date()));
  }

  async deleteRoomMessage(id: number): Promise<void> {
    await db.delete(roomMessages).where(eq(roomMessages.id, id));
  }

  // Enhanced room management methods
  async updateRoomSettings(roomId: number, settings: Partial<Room>): Promise<void> {
    await db
      .update(rooms)
      .set(settings)
      .where(eq(rooms.id, roomId));
  }

  async banUserFromRoom(roomId: number, userId: string): Promise<void> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return;

    const currentBanned = room.bannedUsers || [];
    if (!currentBanned.includes(userId)) {
      await db
        .update(rooms)
        .set({ bannedUsers: [...currentBanned, userId] })
        .where(eq(rooms.id, roomId));
    }
  }

  async unbanUserFromRoom(roomId: number, userId: string): Promise<void> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return;

    const currentBanned = room.bannedUsers || [];
    const newBanned = currentBanned.filter(id => id !== userId);
    
    await db
      .update(rooms)
      .set({ bannedUsers: newBanned })
      .where(eq(rooms.id, roomId));
  }

  async isUserBannedFromRoom(roomId: number, userId: string): Promise<boolean> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return false;
    
    return (room.bannedUsers || []).includes(userId);
  }

  async setRoomSlowMode(roomId: number, seconds: number): Promise<void> {
    await db
      .update(rooms)
      .set({ slowMode: seconds })
      .where(eq(rooms.id, roomId));
  }

  async getRoomModerators(roomId: number): Promise<string[]> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    return room?.moderators || [];
  }

  async getRoomStatistics(roomId: number): Promise<{
    messageCount: number;
    activeUsers: number;
    createdAt: Date;
    moderatorCount: number;
  }> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) {
      return { messageCount: 0, activeUsers: 0, createdAt: new Date(), moderatorCount: 0 };
    }

    const messageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(roomMessages)
      .where(eq(roomMessages.roomId, roomId));

    // Count unique users from last 24 hours
    const activeUsers = await db
      .select({ count: sql<number>`count(DISTINCT ip_address)` })
      .from(roomMessages)
      .where(and(
        eq(roomMessages.roomId, roomId),
        gte(roomMessages.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      ));

    return {
      messageCount: messageCount[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
      createdAt: room.createdAt || new Date(),
      moderatorCount: (room.moderators || []).length,
    };
  }

  // Username expiration management
  async processExpiredUsernames(): Promise<void> {
    const now = new Date();
    
    // Find users whose usernames expired and grace period has ended
    const expiredUsers = await db
      .select()
      .from(users)
      .where(
        and(
          lt(users.usernameExpiresAt, now),
          or(
            eq(users.usernameGracePeriodEnds, null),
            lt(users.usernameGracePeriodEnds, now)
          )
        )
      );

    for (const user of expiredUsers) {
      // Reset user to anonymous state
      await db
        .update(users)
        .set({
          username: null,
          usernameExpiresAt: null,
          usernameGracePeriodEnds: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    // Find users whose usernames just expired and set grace period
    const justExpiredUsers = await db
      .select()
      .from(users)
      .where(
        and(
          lt(users.usernameExpiresAt, now),
          eq(users.usernameGracePeriodEnds, null)
        )
      );

    for (const user of justExpiredUsers) {
      const gracePeriodEnds = new Date();
      gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 15);
      
      await db
        .update(users)
        .set({
          usernameGracePeriodEnds: gracePeriodEnds,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }
  }

  async renewUsername(userId: string): Promise<void> {
    const newExpirationDate = new Date();
    newExpirationDate.setDate(newExpirationDate.getDate() + 30);
    
    await db
      .update(users)
      .set({
        usernameExpiresAt: newExpirationDate,
        usernameGracePeriodEnds: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async isUsernameExpired(userId: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user || !user.usernameExpiresAt) return false;
    
    return new Date() > user.usernameExpiresAt;
  }

  async getUsernameStatus(userId: string): Promise<{ expired: boolean; inGracePeriod: boolean; daysUntilExpiration: number }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user || !user.usernameExpiresAt) {
      return { expired: false, inGracePeriod: false, daysUntilExpiration: 0 };
    }
    
    const now = new Date();
    const expired = now > user.usernameExpiresAt;
    const inGracePeriod = expired && user.usernameGracePeriodEnds && now <= user.usernameGracePeriodEnds;
    
    let daysUntilExpiration = 0;
    if (!expired) {
      daysUntilExpiration = Math.ceil((user.usernameExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    return { expired, inGracePeriod, daysUntilExpiration };
  }

  // Super user administration methods
  async isSuperUser(userId: string): Promise<boolean> {
    const user = await this.getUser(userId);
    return user?.username === 'voidteam' || user?.username === 'caselka';
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserStatistics(): Promise<{ totalUsers: number; verifiedUsers: number; recentSignups: number }> {
    const allUsers = await db.select().from(users);
    const totalUsers = allUsers.length;
    const verifiedUsers = allUsers.filter(user => user.isVerified).length;
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSignups = allUsers.filter(user => user.createdAt && user.createdAt >= last24h).length;

    return { totalUsers, verifiedUsers, recentSignups };
  }

  async getMessageStatistics(): Promise<{ totalMessages: number; messagesLast24h: number; activeRooms: number }> {
    const allMessages = await db.select().from(messages);
    const totalMessages = allMessages.length;
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const messagesLast24h = allMessages.filter(msg => msg.createdAt >= last24h).length;
    
    const allRooms = await db.select().from(rooms);
    const activeRooms = allRooms.length;

    return { totalMessages, messagesLast24h, activeRooms };
  }

  async getSponsorStatistics(): Promise<{ totalSponsors: number; activeSponsors: number; pendingApprovals: number }> {
    const allAds = await db.select().from(ambientAds);
    const totalSponsors = allAds.length;
    
    const now = new Date();
    const activeSponsors = allAds.filter(ad => ad.expiresAt > now && ad.status === 'approved').length;
    const pendingApprovals = allAds.filter(ad => ad.status === 'pending').length;

    return { totalSponsors, activeSponsors, pendingApprovals };
  }

  async getPendingSponsorRequests(): Promise<any[]> {
    const pendingAds = await db.select().from(ambientAds).where(eq(ambientAds.status, 'pending'));
    return pendingAds.map(ad => ({
      id: ad.id,
      productName: ad.productName,
      description: ad.description,
      url: ad.url,
      submittedAt: ad.createdAt?.toISOString() || new Date().toISOString(),
      status: ad.status,
      paymentAmount: (ad.allocatedFunds || 0) / 100, // Convert from cents to dollars
      duration: '7 days', // Default duration
    }));
  }

  async getRecentGuardianActions(limit = 50): Promise<GuardianAction[]> {
    return await db.select()
      .from(guardianActions)
      .orderBy(desc(guardianActions.createdAt))
      .limit(limit);
  }

  async deleteExpiredSponsorAds(): Promise<void> {
    const now = new Date();
    await db.delete(ambientAds)
      .where(lte(ambientAds.expiresAt, now));
  }

  async approveSponsorAd(adId: number, approvedBy: string): Promise<void> {
    // Log the approval action
    await this.logGuardianAction(
      approvedBy,
      'approve_sponsor_ad',
      undefined,
      undefined,
      { adId, action: 'approved' }
    );
  }

  async rejectSponsorAd(adId: number, rejectedBy: string, reason?: string): Promise<void> {
    // Delete the sponsor ad and log the rejection
    await db.delete(ambientAds).where(eq(ambientAds.id, adId));
    
    await this.logGuardianAction(
      rejectedBy,
      'reject_sponsor_ad',
      undefined,
      undefined,
      { adId, action: 'rejected', reason }
    );
  }

  // Help request methods (mock implementation until schema is updated)
  async createHelpRequest(helpRequestData: InsertHelpRequest): Promise<HelpRequest> {
    // Mock implementation - would create actual DB record
    const mockHelpRequest: HelpRequest = {
      id: Date.now(),
      userId: helpRequestData.userId || null,
      ipAddress: helpRequestData.ipAddress || '',
      username: helpRequestData.username || '',
      email: helpRequestData.email || null,
      subject: helpRequestData.subject || '',
      message: helpRequestData.message || '',
      status: 'pending',
      priority: helpRequestData.priority || 'normal',
      assignedTo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      resolvedAt: null,
    };
    return mockHelpRequest;
  }

  async getHelpRequests(status?: string): Promise<HelpRequest[]> {
    // Mock implementation - return sample data
    return [
      {
        id: 1,
        userId: 'user_rob_123',
        ipAddress: '192.168.1.100',
        username: 'rob',
        email: 'rob@example.com',
        subject: 'Account Issue',
        message: 'Unable to access paid features after subscription',
        status: 'pending',
        priority: 'high',
        assignedTo: null,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolvedAt: null,
      },
      {
        id: 2,
        userId: null,
        ipAddress: '192.168.1.200',
        username: 'anon1234',
        email: null,
        subject: 'Chat Feature Request',
        message: 'Would like to see dark mode improvements',
        status: 'in_progress',
        priority: 'normal',
        assignedTo: 'caselka',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        resolvedAt: null,
      }
    ];
  }

  async updateHelpRequestStatus(id: number, status: string, assignedTo?: string): Promise<void> {
    // Mock implementation - would update actual DB record
    console.log(`Updated help request ${id} status to ${status}${assignedTo ? ` assigned to ${assignedTo}` : ''}`);
  }

  // Sponsor analytics methods (mock implementation until schema is updated)
  async recordSponsorEvent(analyticsData: InsertSponsorAnalytics): Promise<SponsorAnalytics> {
    const mockAnalytics: SponsorAnalytics = {
      id: Date.now(),
      adId: analyticsData.adId || 0,
      eventType: analyticsData.eventType || 'impression',
      ipAddress: analyticsData.ipAddress || '',
      userAgent: analyticsData.userAgent || null,
      timestamp: new Date(),
      costCents: analyticsData.costCents || 0,
    };
    
    // Track impression cost (1 cent per impression, 5 cents per click)
    const cost = analyticsData.eventType === 'click' ? 5 : 1;
    await this.updateSponsorFunds(analyticsData.adId || 0, cost);
    
    return mockAnalytics;
  }

  async getSponsorAnalytics(adId: number): Promise<SponsorAnalytics[]> {
    // Mock analytics data showing user engagement
    return [
      {
        id: 1,
        adId,
        eventType: 'impression',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        costCents: 1,
      },
      {
        id: 2,
        adId,
        eventType: 'click',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 3 * 60 * 1000),
        costCents: 5,
      },
      {
        id: 3,
        adId,
        eventType: 'impression',
        ipAddress: '192.168.1.200',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        timestamp: new Date(Date.now() - 1 * 60 * 1000),
        costCents: 1,
      }
    ];
  }

  async updateSponsorFunds(adId: number, spent: number): Promise<void> {
    // Mock implementation - would update sponsor funds in real DB
    console.log(`Sponsor ad ${adId} spent ${spent} cents. Checking if budget exhausted...`);
  }

  // Deep user analytics implementation like X.com/Facebook
  async getUserAnalytics(userId: string): Promise<{
    totalMessages: number;
    messagesLast7Days: number;
    messagesLast30Days: number;
    averageMessagesPerDay: number;
    mostActiveHours: number[];
    engagementScore: number;
    accountAge: number;
    lastActiveDate: Date | null;
    roomsCreated: number;
    roomsJoined: number;
    moderationActions: number;
    guardianHistory: boolean;
    paymentHistory: { amount: number; date: Date; type: string }[];
    activityTrend: 'increasing' | 'decreasing' | 'stable';
    riskScore: number;
    deviceFingerprint: string[];
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get user messages from both global and room messages
    const globalMessages = await db.select().from(messages).where(eq(messages.username, user.username || ''));
    const userRoomMessages = await db.select().from(roomMessages).where(eq(roomMessages.username, user.username || ''));
    
    const allUserMessages = [...globalMessages, ...userRoomMessages];
    const totalMessages = allUserMessages.length;

    // Calculate time-based metrics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const messagesLast7Days = allUserMessages.filter(msg => msg.createdAt >= last7Days).length;
    const messagesLast30Days = allUserMessages.filter(msg => msg.createdAt >= last30Days).length;
    
    // Calculate account age in days
    const accountAge = user.createdAt ? Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const averageMessagesPerDay = accountAge > 0 ? totalMessages / accountAge : 0;

    // Most active hours analysis
    const hourCounts = new Array(24).fill(0);
    allUserMessages.forEach(msg => {
      const hour = msg.createdAt.getHours();
      hourCounts[hour]++;
    });
    const mostActiveHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Engagement score (0-100 based on activity)
    const recentActivity = messagesLast7Days * 10;
    const consistency = accountAge > 0 ? Math.min(100, (totalMessages / accountAge) * 20) : 0;
    const engagementScore = Math.min(100, Math.round((recentActivity + consistency) / 2));

    // Last active date
    const lastActiveDate = allUserMessages.length > 0 ? 
      allUserMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : null;

    // Rooms created and joined
    const userRooms = await db.select().from(rooms).where(eq(rooms.creatorId, userId));
    const roomsCreated = userRooms.length;
    
    // For rooms joined, count distinct rooms where user has posted
    const roomIds = [...new Set(userRoomMessages.map(msg => msg.roomId))];
    const roomsJoined = roomIds.length;

    // Moderation actions (guardian actions)
    const guardianActionsCount = await db.select()
      .from(guardianActions)
      .where(eq(guardianActions.guardianIp, userId));
    const moderationActions = guardianActionsCount.length;

    // Guardian history
    const guardianHistoryRecords = await db.select()
      .from(guardians)
      .where(eq(guardians.ipAddress, userId));
    const hasGuardianHistory = guardianHistoryRecords.length > 0;

    // Payment history (account creation + guardian subscriptions)
    const paymentHistory = [
      ...(user.stripeCustomerId ? [{ amount: 3, date: user.createdAt || new Date(), type: 'Account Creation' }] : []),
      ...guardianHistoryRecords.map(g => ({ 
        amount: 20, 
        date: g.createdAt, 
        type: 'Guardian Subscription' 
      }))
    ];

    // Activity trend analysis
    const messages30to15 = allUserMessages.filter(msg => 
      msg.createdAt >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) &&
      msg.createdAt < new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
    ).length;
    const messages15to0 = messagesLast7Days;
    
    let activityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (messages15to0 > messages30to15 * 1.2) {
      activityTrend = 'increasing';
    } else if (messages15to0 < messages30to15 * 0.8) {
      activityTrend = 'decreasing';
    }

    // Risk score calculation (0-100, higher = more risky)
    let riskScore = 0;
    if (messagesLast7Days > 100) riskScore += 20; // Very high activity
    if (averageMessagesPerDay > 50) riskScore += 15; // Spam potential
    if (accountAge < 1) riskScore += 25; // New account
    if (!user.isVerified) riskScore += 20; // Unverified
    if (moderationActions === 0 && accountAge > 30) riskScore += 10; // No moderation engagement
    riskScore = Math.min(100, riskScore);

    return {
      totalMessages,
      messagesLast7Days,
      messagesLast30Days,
      averageMessagesPerDay: Math.round(averageMessagesPerDay * 100) / 100,
      mostActiveHours,
      engagementScore,
      accountAge,
      lastActiveDate,
      roomsCreated,
      roomsJoined,
      moderationActions,
      guardianHistory: hasGuardianHistory,
      paymentHistory,
      activityTrend,
      riskScore,
      deviceFingerprint: [user.id] // Simplified fingerprint
    };
  }

  async getAllUserAnalytics(): Promise<{
    userId: string;
    username: string;
    email: string;
    totalMessages: number;
    lastActive: Date | null;
    engagementScore: number;
    riskScore: number;
    accountAge: number;
    isVerified: boolean;
    guardian: boolean;
  }[]> {
    const allUsers = await this.getAllUsers();
    const analytics = [];

    for (const user of allUsers) {
      try {
        const userAnalytics = await this.getUserAnalytics(user.id);
        analytics.push({
          userId: user.id,
          username: user.username || 'Anonymous',
          email: user.email || '',
          totalMessages: userAnalytics.totalMessages,
          lastActive: userAnalytics.lastActiveDate,
          engagementScore: userAnalytics.engagementScore,
          riskScore: userAnalytics.riskScore,
          accountAge: userAnalytics.accountAge,
          isVerified: user.isVerified || false,
          guardian: userAnalytics.guardianHistory
        });
      } catch (error) {
        // Skip users with analytics errors
        console.warn(`Failed to get analytics for user ${user.id}:`, error);
      }
    }

    return analytics.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  // Direct Messages implementation (paid accounts only)
  async sendDirectMessage(fromUserId: string, toUserId: string, content: string): Promise<DirectMessage> {
    const [message] = await db
      .insert(directMessages)
      .values({
        fromUserId,
        toUserId,
        content,
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    // Update or create conversation
    await this.createOrUpdateConversation(fromUserId, toUserId, message.id);
    
    return message;
  }

  async getDirectMessages(userId1: string, userId2: string, limit = 50): Promise<DirectMessage[]> {
    return await db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.fromUserId, userId1), eq(directMessages.toUserId, userId2)),
          and(eq(directMessages.fromUserId, userId2), eq(directMessages.toUserId, userId1))
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(limit);
  }

  async getUserConversations(userId: string): Promise<DirectMessageConversation[]> {
    return await db
      .select()
      .from(directMessageConversations)
      .where(
        or(
          eq(directMessageConversations.user1Id, userId),
          eq(directMessageConversations.user2Id, userId)
        )
      )
      .orderBy(desc(directMessageConversations.lastMessageAt));
  }

  async markMessagesAsRead(userId: string, conversationId: number): Promise<void> {
    const [conversation] = await db
      .select()
      .from(directMessageConversations)
      .where(eq(directMessageConversations.id, conversationId));

    if (!conversation) return;

    // Mark messages as read
    const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(directMessages.fromUserId, otherUserId),
          eq(directMessages.toUserId, userId),
          eq(directMessages.isRead, false)
        )
      );

    // Update conversation unread count
    if (conversation.user1Id === userId) {
      await db
        .update(directMessageConversations)
        .set({ user1UnreadCount: 0 })
        .where(eq(directMessageConversations.id, conversationId));
    } else {
      await db
        .update(directMessageConversations)
        .set({ user2UnreadCount: 0 })
        .where(eq(directMessageConversations.id, conversationId));
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const conversations = await this.getUserConversations(userId);
    return conversations.reduce((total, conv) => {
      return total + (conv.user1Id === userId ? conv.user1UnreadCount : conv.user2UnreadCount);
    }, 0);
  }

  async createOrUpdateConversation(user1Id: string, user2Id: string, lastMessageId: number): Promise<DirectMessageConversation> {
    // Ensure consistent ordering: smaller userId first
    const orderedUser1 = user1Id < user2Id ? user1Id : user2Id;
    const orderedUser2 = user1Id < user2Id ? user2Id : user1Id;

    const [existingConversation] = await db
      .select()
      .from(directMessageConversations)
      .where(
        and(
          eq(directMessageConversations.user1Id, orderedUser1),
          eq(directMessageConversations.user2Id, orderedUser2)
        )
      );

    if (existingConversation) {
      // Update existing conversation
      const isUser1Sender = user1Id === orderedUser1;
      const [updated] = await db
        .update(directMessageConversations)
        .set({
          lastMessageId,
          lastMessageAt: new Date(),
          user1UnreadCount: isUser1Sender ? 
            existingConversation.user1UnreadCount : 
            existingConversation.user1UnreadCount + 1,
          user2UnreadCount: isUser1Sender ? 
            existingConversation.user2UnreadCount + 1 : 
            existingConversation.user2UnreadCount,
        })
        .where(eq(directMessageConversations.id, existingConversation.id))
        .returning();
      return updated;
    } else {
      // Create new conversation
      const isUser1Sender = user1Id === orderedUser1;
      const [newConversation] = await db
        .insert(directMessageConversations)
        .values({
          user1Id: orderedUser1,
          user2Id: orderedUser2,
          lastMessageId,
          lastMessageAt: new Date(),
          user1UnreadCount: isUser1Sender ? 0 : 1,
          user2UnreadCount: isUser1Sender ? 1 : 0,
          createdAt: new Date(),
        })
        .returning();
      return newConversation;
    }
  }

  async deleteDirectMessage(messageId: number, userId: string): Promise<void> {
    // Only allow deletion if user is the sender
    await db
      .delete(directMessages)
      .where(
        and(
          eq(directMessages.id, messageId),
          eq(directMessages.fromUserId, userId)
        )
      );
  }

  // Global Moderation methods
  async isGlobalModerator(userId: string): Promise<boolean> {
    const [user] = await db
      .select({ isGlobalModerator: users.isGlobalModerator })
      .from(users)
      .where(eq(users.id, userId));
    return user?.isGlobalModerator || false;
  }

  async setGlobalModerator(userId: string, isModerator: boolean): Promise<void> {
    await db
      .update(users)
      .set({ 
        isGlobalModerator: isModerator,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();

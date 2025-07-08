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
  type InsertRoomMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, lt, desc, asc, sql, or } from "drizzle-orm";
import { checkProfanity, validateUsernameFormat } from "./profanity-filter";

export interface IStorage {
  // Messages
  createMessage(message: InsertMessage & { username: string; ipAddress: string }): Promise<Message>;
  getRecentMessages(limit?: number): Promise<Message[]>;
  deleteExpiredMessages(): Promise<void>;
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
  getAnonUsername(ipAddress: string): Promise<string>;
  createAnonUsername(ipAddress: string, username: string): Promise<AnonUsername>;
  updateAnonUsernameLastUsed(ipAddress: string): Promise<void>;
  
  // Auth (Email/Password)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(usernameOrEmail: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  verifyUser(id: string): Promise<void>;
  
  // User stats for Guardian eligibility
  getUserStats?(ipAddress: string): Promise<{ messagesLast7Days: number; paidAccountSince?: Date } | undefined>;
  
  // Username expiration management
  processExpiredUsernames(): Promise<void>;
  renewUsername(userId: string): Promise<void>;
  isUsernameExpired(userId: string): Promise<boolean>;
  getUsernameStatus(userId: string): Promise<{ expired: boolean; inGracePeriod: boolean; daysUntilExpiration: number }>;
  
  // Room management
  createRoom(room: InsertRoom): Promise<Room>;
  getRoom(name: string): Promise<Room | undefined>;
  getRoomById(id: number): Promise<Room | undefined>;
  getUserRooms(userId: string): Promise<Room[]>;
  getAllRooms(): Promise<Room[]>;
  isRoomNameAvailable(name: string): Promise<boolean>;
  
  // Room messages
  createRoomMessage(message: InsertRoomMessage & { username: string; ipAddress: string }): Promise<RoomMessage>;
  getRoomMessages(roomId: number, limit?: number): Promise<RoomMessage[]>;
  deleteExpiredRoomMessages(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createMessage(messageData: InsertMessage & { username: string; ipAddress: string; replyToId?: number }): Promise<Message> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    // Additional security check: Ensure content and username are clean
    const { sanitizeMessageContent, sanitizeUsername } = await import('./security');
    
    const [message] = await db
      .insert(messages)
      .values({
        content: sanitizeMessageContent(messageData.content),
        username: sanitizeUsername(messageData.username),
        ipAddress: messageData.ipAddress,
        expiresAt,
        replyToId: messageData.replyToId || null,
      })
      .returning();
    return message;
  }

  async getRecentMessages(limit = 50): Promise<Message[]> {
    const now = new Date();
    // Get messages from the last 15 minutes that haven't expired yet
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
      .where(gte(messages.expiresAt, now)) // Only non-expired messages
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  async deleteExpiredMessages(): Promise<void> {
    const now = new Date();
    await db.delete(messages).where(lte(messages.expiresAt, now));
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
    return user?.username === 'caselka';
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

  async getAnonUsername(ipAddress: string): Promise<string> {
    const [existingUsername] = await db
      .select()
      .from(anonUsernames)
      .where(eq(anonUsernames.ipAddress, ipAddress));

    if (existingUsername) {
      // Update last used timestamp
      await this.updateAnonUsernameLastUsed(ipAddress);
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
        const created = await this.createAnonUsername(ipAddress, newUsername);
        return created.username;
      }
      attempts++;
    }

    // Fallback - should rarely happen
    return `anon${Math.floor(1000 + Math.random() * 9000)}`;
  }

  async createAnonUsername(ipAddress: string, username: string): Promise<AnonUsername> {
    const [anonUsername] = await db
      .insert(anonUsernames)
      .values({
        ipAddress,
        username,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      })
      .returning();
    return anonUsername;
  }

  async updateAnonUsernameLastUsed(ipAddress: string): Promise<void> {
    await db
      .update(anonUsernames)
      .set({ lastUsedAt: new Date() })
      .where(eq(anonUsernames.ipAddress, ipAddress));
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

      return {
        messagesLast7Days: messageCount[0]?.count || 0,
        paidAccountSince: paidAccount[0]?.createdAt
      };
    } catch (error) {
      console.error('getUserStats error:', error);
      return undefined;
    }
  }

  // Room management methods
  async createRoom(roomData: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values(roomData)
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
    const [message] = await db
      .insert(roomMessages)
      .values(messageData)
      .returning();
    return message;
  }

  async getRoomMessages(roomId: number, limit = 50): Promise<RoomMessage[]> {
    return await db
      .select()
      .from(roomMessages)
      .where(eq(roomMessages.roomId, roomId))
      .orderBy(desc(roomMessages.createdAt))
      .limit(limit);
  }

  async deleteExpiredRoomMessages(): Promise<void> {
    await db
      .delete(roomMessages)
      .where(lt(roomMessages.expiresAt, new Date()));
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
}

export const storage = new DatabaseStorage();

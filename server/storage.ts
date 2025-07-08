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
  type UpsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
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

  // Auth (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export class DatabaseStorage implements IStorage {
  async createMessage(messageData: InsertMessage & { username: string; ipAddress: string }): Promise<Message> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    
    const [message] = await db
      .insert(messages)
      .values({
        content: messageData.content,
        username: messageData.username,
        ipAddress: messageData.ipAddress,
        expiresAt,
      })
      .returning();
    return message;
  }

  async getRecentMessages(limit = 50): Promise<Message[]> {
    const now = new Date();
    return await db
      .select()
      .from(messages)
      .where(gte(messages.expiresAt, now))
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

  // Auth methods for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
}

export const storage = new DatabaseStorage();

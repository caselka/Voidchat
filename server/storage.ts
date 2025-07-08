import { 
  messages, 
  guardians, 
  ambientAds, 
  rateLimits, 
  mutedIps, 
  guardianActions,
  systemSettings,
  type Message, 
  type InsertMessage,
  type Guardian,
  type InsertGuardian,
  type AmbientAd,
  type InsertAmbientAd,
  type RateLimit,
  type MutedIp,
  type GuardianAction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";

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
  logGuardianAction(guardianIp: string, action: string, targetIp?: string, messageId?: number, details?: any): Promise<void>;
  
  // System settings
  getSystemSetting(key: string): Promise<string | undefined>;
  setSystemSetting(key: string, value: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();

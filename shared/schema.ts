import { pgTable, text, serial, integer, boolean, timestamp, json, index, jsonb, varchar, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  username: text("username").notNull(),
  ipAddress: text("ip_address").notNull(),
  replyToId: integer("reply_to_id").references(() => messages.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const guardians = pgTable("guardians", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ambientAds = pgTable("ambient_ads", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  description: text("description").notNull(),
  url: text("url"),
  expiresAt: timestamp("expires_at").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  clicks: integer("clicks").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  allocatedFunds: integer("allocated_funds").default(0).notNull(), // in cents
  spentFunds: integer("spent_funds").default(0).notNull(), // in cents
  status: text("status").default("pending").notNull(), // pending, approved, rejected, active, exhausted
});

export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  messageCount: integer("message_count").default(0).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  blockedUntil: timestamp("blocked_until"),
});

export const mutedIps = pgTable("muted_ips", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  mutedBy: text("muted_by_ip").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const guardianActions = pgTable("guardian_actions", {
  id: serial("id").primaryKey(),
  guardianIp: text("guardian_ip").notNull(),
  action: text("action").notNull(), // 'mute', 'delete', 'slow_mode'
  targetIp: text("target_ip"),
  messageId: integer("message_id"),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customHandles = pgTable("custom_handles", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  stripePaymentId: text("stripe_payment_id"),
});

export const themeCustomizations = pgTable("theme_customizations", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  background: text("background").default("dark"),
  font: text("font").default("monospace"),
  accentColor: text("accent_color").default("default"),
  messageFadeTime: integer("message_fade_time").default(15),
  backgroundFx: text("background_fx").default("none"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  stripePaymentId: text("stripe_payment_id"),
});

export const anonUsernames = pgTable("anon_usernames", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(), // Use session ID instead of IP
  username: text("username").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
}, (table) => {
  return {
    sessionIdIdx: index("anon_usernames_session_id_idx").on(table.sessionId),
  };
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
});

export const insertGuardianSchema = createInsertSchema(guardians).omit({
  id: true,
  createdAt: true,
});

export const insertAmbientAdSchema = createInsertSchema(ambientAds).omit({
  id: true,
  createdAt: true,
});

export const insertCustomHandleSchema = createInsertSchema(customHandles).pick({
  handle: true,
  ipAddress: true,
  expiresAt: true,
  stripePaymentId: true,
});

export const insertThemeCustomizationSchema = createInsertSchema(themeCustomizations).pick({
  ipAddress: true,
  background: true,
  font: true,
  accentColor: true,
  messageFadeTime: true,
  backgroundFx: true,
  expiresAt: true,
  stripePaymentId: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Guardian = typeof guardians.$inferSelect;
export type InsertGuardian = z.infer<typeof insertGuardianSchema>;
export type AmbientAd = typeof ambientAds.$inferSelect;
export type InsertAmbientAd = z.infer<typeof insertAmbientAdSchema>;
export type RateLimit = typeof rateLimits.$inferSelect;
export type MutedIp = typeof mutedIps.$inferSelect;
export type GuardianAction = typeof guardianActions.$inferSelect;
export type CustomHandle = typeof customHandles.$inferSelect;
export type InsertCustomHandle = z.infer<typeof insertCustomHandleSchema>;
// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// User storage table for email auth
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  username: text("username").unique().notNull(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationCode: text("verification_code"),
  verificationExpires: timestamp("verification_expires"),
  usernameExpiresAt: timestamp("username_expires_at").notNull(),
  usernameGracePeriodEnds: timestamp("username_grace_period_ends"),
  autoRenewal: boolean("auto_renewal").default(true).notNull(), // Default to auto-renewal ON
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  isSuperUser: boolean("is_super_user").default(false).notNull(), // For caselka account
  isGlobalModerator: boolean("is_global_moderator").default(false).notNull(), // For global chat moderation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ThemeCustomization = typeof themeCustomizations.$inferSelect;
export type InsertThemeCustomization = z.infer<typeof insertThemeCustomizationSchema>;
export type AnonUsername = typeof anonUsernames.$inferSelect;
export type InsertAnonUsername = typeof anonUsernames.$inferInsert;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Enhanced Room storage table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 20 }).unique().notNull(),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  description: text("description").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  isPrivate: boolean("is_private").default(false).notNull(),
  slowMode: integer("slow_mode").default(0).notNull(), // seconds between messages
  maxUsers: integer("max_users").default(100).notNull(),
  moderators: text("moderators").array().default([]), // Array of user IDs who can moderate
  bannedUsers: text("banned_users").array().default([]), // Array of user IDs who are banned
  roomRules: text("room_rules").default("").notNull(),
});

export const roomMessages = pgTable("room_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id).notNull(),
  content: text("content").notNull(),
  username: varchar("username", { length: 50 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // 3 days retention for room messages
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  creatorId: true,
  description: true,
  isPrivate: true,
  maxUsers: true,
  roomRules: true,
});

export const insertRoomMessageSchema = createInsertSchema(roomMessages).pick({
  roomId: true,
  content: true,
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type RoomMessage = typeof roomMessages.$inferSelect;
export type InsertRoomMessage = z.infer<typeof insertRoomMessageSchema>;

// Help/Support requests table
export const helpRequests = pgTable("help_requests", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  ipAddress: text("ip_address").notNull(),
  username: text("username").notNull(),
  email: text("email"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending").notNull(), // pending, in_progress, resolved, closed
  priority: text("priority").default("normal").notNull(), // low, normal, high, urgent
  assignedTo: text("assigned_to"), // admin username
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Sponsor analytics table
export const sponsorAnalytics = pgTable("sponsor_analytics", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").references(() => ambientAds.id).notNull(),
  eventType: text("event_type").notNull(), // impression, click, conversion
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  costCents: integer("cost_cents").default(0).notNull(), // cost of this event in cents
});

export const insertHelpRequestSchema = createInsertSchema(helpRequests);
export const insertSponsorAnalyticsSchema = createInsertSchema(sponsorAnalytics);

export type HelpRequest = typeof helpRequests.$inferSelect;
export type InsertHelpRequest = z.infer<typeof insertHelpRequestSchema>;
export type SponsorAnalytics = typeof sponsorAnalytics.$inferSelect;
export type InsertSponsorAnalytics = z.infer<typeof insertSponsorAnalyticsSchema>;

// Direct Messages for paid accounts only - End-to-End Encrypted
export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  fromUserId: text("from_user_id").notNull().references(() => users.id),
  toUserId: text("to_user_id").notNull().references(() => users.id),
  content: text("content").notNull(), // Encrypted content
  encryptedContent: text("encrypted_content"), // E2E encrypted content
  nonce: text("nonce"), // Encryption nonce
  ephemeralPublicKey: text("ephemeral_public_key"), // For key exchange
  isEncrypted: boolean("is_encrypted").default(true).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User encryption keys table
export const userEncryptionKeys = pgTable("user_encryption_keys", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  publicKey: text("public_key").notNull(),
  keyFingerprint: text("key_fingerprint").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Direct Message conversations for organization
export const directMessageConversations = pgTable("direct_message_conversations", {
  id: serial("id").primaryKey(),
  user1Id: text("user1_id").notNull().references(() => users.id),
  user2Id: text("user2_id").notNull().references(() => users.id),
  lastMessageId: integer("last_message_id").references(() => directMessages.id),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  user1UnreadCount: integer("user1_unread_count").default(0).notNull(),
  user2UnreadCount: integer("user2_unread_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique().on(table.user1Id, table.user2Id),
]);

export const insertDirectMessageSchema = createInsertSchema(directMessages).pick({
  toUserId: true,
  content: true,
});

export const insertUserEncryptionKeysSchema = createInsertSchema(userEncryptionKeys);

export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessageConversation = typeof directMessageConversations.$inferSelect;
export type UserEncryptionKeys = typeof userEncryptionKeys.$inferSelect;
export type InsertUserEncryptionKeys = z.infer<typeof insertUserEncryptionKeysSchema>;

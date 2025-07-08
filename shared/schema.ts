import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  username: text("username").notNull(),
  ipAddress: text("ip_address").notNull(),
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

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ThemeCustomization = typeof themeCustomizations.$inferSelect;
export type InsertThemeCustomization = z.infer<typeof insertThemeCustomizationSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

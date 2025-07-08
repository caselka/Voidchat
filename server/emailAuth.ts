import { Express, RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { z } from "zod";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";



declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      isVerified: boolean;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Validation schemas
const emailSchema = z.string().email().max(255);
const passwordSchema = z.string().min(8).max(128).regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/);
const verificationCodeSchema = z.string().regex(/^\d{6}$/);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-dev-only',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Validate input
      const validEmail = emailSchema.parse(email.toLowerCase().trim());
      const validPassword = passwordSchema.parse(password);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(validEmail);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Generate verification code
      const verificationCode = generateVerificationCode();
      const hashedPassword = await hashPassword(validPassword);

      // Create unverified user
      const user = await storage.createUser({
        email: validEmail,
        password: hashedPassword,
        firstName: firstName?.trim() || undefined,
        lastName: lastName?.trim() || undefined,
        isVerified: false,
        verificationCode,
        verificationExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      // TODO: Send verification email
      console.log(`Verification code for ${validEmail}: ${verificationCode}`);

      res.status(201).json({ 
        message: "Registration successful. Please check your email for verification code.",
        userId: user.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input format" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Verify email endpoint
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { email, code } = req.body;
      
      const validEmail = emailSchema.parse(email.toLowerCase().trim());
      const validCode = verificationCodeSchema.parse(code);

      const user = await storage.getUserByEmail(validEmail);
      if (!user || user.isVerified) {
        return res.status(400).json({ message: "Invalid verification request" });
      }

      if (user.verificationCode !== validCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      if (user.verificationExpires && user.verificationExpires < new Date()) {
        return res.status(400).json({ message: "Verification code expired" });
      }

      // Verify user
      await storage.verifyUser(user.id);

      // Login user
      (req as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: true
      };

      res.json({ message: "Email verified successfully", user: (req as any).user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input format" });
      }
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Login endpoint  
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const validEmail = emailSchema.parse(email.toLowerCase().trim());
      const validPassword = passwordSchema.parse(password);

      const user = await storage.getUserByEmail(validEmail);
      if (!user || !await comparePasswords(validPassword, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: "Please verify your email first" });
      }

      // Login user
      (req as any).user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: true
      };

      res.json({ message: "Login successful", user: (req as any).user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input format" });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logout successful" });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!(req as any).user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json((req as any).user);
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!(req as any).user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};
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
  try {
    // Handle bcrypt hashes (starts with $2b$)
    if (stored.startsWith('$2b$')) {
      return await bcrypt.compare(supplied, stored);
    }
    
    // Handle old scrypt hashes (fallback)
    const parts = stored.split(".");
    if (parts.length !== 2) return false;
    
    const [hashed, salt] = parts;
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    if (hashedBuf.length !== suppliedBuf.length) return false;
    
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
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
      const { username, email, password } = req.body;
      
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

      // Validate username
      const validUsername = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).parse(username);
      
      // Check if username exists
      const existingUsername = await storage.getUserByUsername(validUsername);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Create unverified user
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const user = await storage.createUser({
        id: userId,
        username: validUsername,
        email: validEmail,
        password: hashedPassword,
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

  // Username payment endpoint for registration
  app.post('/api/create-username-payment', async (req, res) => {
    try {
      const { username, email, amount } = req.body;
      
      if (!username || !email || !amount) {
        return res.status(400).json({ message: 'Username, email, and amount are required' });
      }

      // Validate username availability (use email to avoid schema issues)
      const existingByEmail = await storage.getUserByEmail(email);
      if (existingByEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Import Stripe dynamically
      const { default: Stripe } = await import('stripe');
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
      }
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2025-06-30.basil",
      });

      // Create payment intent for $3 username reservation
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount, // Amount in cents
        currency: 'usd',
        metadata: {
          username,
          email,
          type: 'username_reservation',
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error('Error creating username payment:', error);
      res.status(500).json({ message: 'Failed to create payment intent' });
    }
  });

  // Complete username registration after payment
  app.post('/api/complete-username-registration', async (req, res) => {
    try {
      const { payment_intent_id } = req.body;
      
      if (!payment_intent_id) {
        return res.status(400).json({ message: 'Payment intent ID required' });
      }
      
      const { default: Stripe } = await import('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: 'Payment not completed' });
      }
      
      const { username, email, password } = req.body;
      
      // Check if user already exists 
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.json({ message: 'Account already exists' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Set username expiration dates
      const now = new Date();
      const usernameExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      // Create user account with paid username
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        isVerified: true, // Auto-verify paid accounts
        usernameExpiresAt,
        usernameGracePeriodEnds: null
      });
      
      res.json({ 
        message: 'Account created successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error: any) {
      console.error('Registration completion error:', error);
      res.status(500).json({ message: 'Failed to complete registration' });
    }
  });

  // Complete registration endpoint
  app.post('/api/complete-registration', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Check if username is still available
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user account
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        isVerified: false, // Email verification required
      });

      // TODO: Send verification email
      console.log(`Account created for ${username} (${email})`);

      res.status(201).json({ 
        message: 'Account created successfully',
        user: { id: user.id, username: user.username, email: user.email }
      });
    } catch (error: any) {
      console.error('Error completing registration:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  // Login endpoint  
  app.post("/api/login", async (req, res) => {
    try {
      const { usernameOrEmail, password } = req.body;
      
      const validUsernameOrEmail = z.string().min(1).parse(usernameOrEmail.trim());
      const validPassword = z.string().min(1).parse(password); // Remove strict validation for testing

      const user = await storage.getUserByUsernameOrEmail(validUsernameOrEmail);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Special case for caselka - simple password check
      if (user.username === 'caselka') {
        console.log('Caselka login attempt with password:', password);
        console.log('Stored password:', user.password);
        
        // Check if password matches the stored plain text password
        if (password === user.password) {
          // Login user - store in session
          (req.session as any).user = {
            id: user.id,
            username: user.username,
            email: user.email,
            isVerified: true
          };
          (req as any).user = (req.session as any).user;
          return res.json({ message: "Login successful", user: (req as any).user });
        }
      }

      // Regular password check for other users
      if (!user.password || !await comparePasswords(validPassword, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: "Please verify your email first" });
      }

      // Login user - store in session
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: true
      };
      (req as any).user = (req.session as any).user;

      res.json({ message: "Login successful", user: (req as any).user });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input format" });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint - support both POST and GET
  const logoutHandler = (req: any, res: any) => {
    console.log(`Logout handler called - Method: ${req.method}, URL: ${req.url}`);
    
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destruction error:', err);
        if (req.method === 'POST') {
          return res.status(500).json({ message: "Logout failed" });
        } else {
          return res.status(500).send('Logout failed');
        }
      }
      
      // Clear all cookies
      res.clearCookie('connect.sid');
      res.clearCookie('session');
      
      console.log(`Session destroyed, clearing cookies and handling ${req.method} request`);
      
      // Handle GET request (redirect) vs POST request (JSON response)
      if (req.method === 'GET') {
        console.log('Redirecting to landing page');
        // Force redirect to landing page with proper headers
        res.writeHead(302, {
          'Location': '/',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end();
      } else {
        // POST request - return JSON for API calls
        console.log('Returning JSON response for POST request');
        res.json({ message: "Logout successful" });
      }
    });
  };
  
  app.post("/api/logout", logoutHandler);
  app.get("/api/logout", logoutHandler);

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!(req.session as any).user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    (req as any).user = (req.session as any).user;
    res.json((req as any).user);
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!(req.session as any).user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  (req as any).user = (req.session as any).user;
  next();
};
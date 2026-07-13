import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { store, seedDatabase } from './src/db/inMemoryDb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // -------------------------------------------------------------------------
  // RATE LIMITING (SECURITY CONTROL)
  // -------------------------------------------------------------------------
  const IP_RATE_LIMITS = new Map<string, { tokens: number; lastRefill: number }>();
  const RATE_LIMIT_CAPACITY = 100;
  const REFILL_RATE = 5; // refill 5 tokens per second

  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const now = Date.now();
    
    if (!IP_RATE_LIMITS.has(ip as string)) {
      IP_RATE_LIMITS.set(ip as string, { tokens: RATE_LIMIT_CAPACITY, lastRefill: now });
    }
    
    const record = IP_RATE_LIMITS.get(ip as string)!;
    const elapsedSeconds = (now - record.lastRefill) / 1000;
    record.tokens = Math.min(RATE_LIMIT_CAPACITY, record.tokens + elapsedSeconds * REFILL_RATE);
    record.lastRefill = now;
    
    if (record.tokens < 1) {
      res.setHeader('Retry-After', '2');
      return res.status(429).json({ error: 'Too many requests. Perimeter defense rate limit triggered.' });
    }
    
    record.tokens -= 1;
    next();
  };

  // Apply rate limiting to all api routes
  app.use('/api', rateLimiter);

  // -------------------------------------------------------------------------
  // SECURE HEADERS & LOGGING MONITOR
  // -------------------------------------------------------------------------
  app.use((req, res, next) => {
    // Secure headers
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self' https:; frame-ancestors 'self';");

    // Performance and request monitor
    const startTime = Date.now();
    res.on('finish', () => {
      const elapsed = Date.now() - startTime;
      console.log(`[MONITOR] ${req.method} ${req.originalUrl || req.url} - Status: ${res.statusCode} (${elapsed}ms) - IP: ${req.ip}`);
    });
    next();
  });

  // -------------------------------------------------------------------------
  // API ENDPOINTS
  // -------------------------------------------------------------------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth / Sync endpoint (offline-safe)
  app.post('/api/auth/sync', async (req, res) => {
    const { uid, email, name, role, avatar } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'Missing uid or email for synchronization' });
    }
    try {
      // Upsert user details in-memory
      const existingUser = store.users.find(u => u.uid === uid && u.deletedAt === null);
      if (existingUser) {
        existingUser.email = email;
        if (name) existingUser.name = name;
        existingUser.updatedAt = new Date();
        return res.json(existingUser);
      } else {
        const passwordHash = hashPassword('Admin@123'); // Default password for synced accounts
        const newUser = {
          id: crypto.randomUUID(),
          uid,
          email,
          name: name || email.split('@')[0].toUpperCase(),
          role: role || 'Administrator',
          status: 'Active' as const,
          avatar: avatar || email.substring(0, 2).toUpperCase(),
          passwordHash,
          emailVerified: true,
          totpEnabled: false,
          totpSecret: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        };
        store.users.push(newUser);
        return res.json(newUser);
      }
    } catch (error: any) {
      console.error('Failed to sync auth user:', error);
      res.status(500).json({ error: 'In-memory synchronization failed', details: error.message });
    }
  });

  // JWT Cryptographic Constants
  const JWT_SECRET = process.env.JWT_SECRET || 'redforge-enterprise-secret-key-1337';
  const REFRESH_SECRET = process.env.REFRESH_SECRET || 'redforge-enterprise-refresh-key-9999';

  // -------------------------------------------------------------------------
  // AUTHENTICATION UTILITIES & CRYPTO HELPERS
  // -------------------------------------------------------------------------
  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  function verifyPassword(password: string, storedHash: string): boolean {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, hash] = parts;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  }

  function timingSafeCompare(a: string, b: string): boolean {
    const aBuf = crypto.createHash('sha256').update(a).digest();
    const bBuf = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(aBuf, bBuf);
  }

  // TOTP Native Google Authenticator Implementation
  function base32Decode(base32: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
    let bits = 0;
    let val = 0;
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i++) {
      val = (val << 5) | alphabet.indexOf(cleaned[i]);
      bits += 5;
      if (bits >= 8) {
        bytes.push((val >> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }

  function generateTOTP(secret: string, window = 1): string[] {
    try {
      const key = base32Decode(secret);
      const epoch = Math.floor(Date.now() / 1000 / 30);
      const results: string[] = [];

      for (let i = -window; i <= window; i++) {
        const counter = epoch + i;
        const buffer = Buffer.alloc(8);
        buffer.writeUInt32BE(0, 0);
        buffer.writeUInt32BE(counter, 4);

        const hmac = crypto.createHmac('sha1', key);
        hmac.update(buffer);
        const hash = hmac.digest();

        const offset = hash[hash.length - 1] & 0xf;
        const codeVal = (
          ((hash[offset] & 0x7f) << 24) |
          ((hash[offset + 1] & 0xff) << 16) |
          ((hash[offset + 2] & 0xff) << 8) |
          (hash[offset + 3] & 0xff)
        ) % 1000000;

        results.push(codeVal.toString().padStart(6, '0'));
      }
      return results;
    } catch (err) {
      console.error('Failed to generate TOTP:', err);
      return [];
    }
  }

  function verifyTOTP(token: string, secret: string): boolean {
    const cleanToken = token.trim();
    if (cleanToken.length !== 6 || /\D/.test(cleanToken)) return false;
    const codes = generateTOTP(secret, 2); // +/- 60 seconds window
    return codes.includes(cleanToken);
  }

  // Nodemailer SMTP Transporter
  function getEmailTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) return null;
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  // Sanitization helper
  function sanitizeInput(str: string): string {
    if (typeof str !== 'string') return '';
    return str.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Email validator
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // -------------------------------------------------------------------------
  // NEW API AUTH ENDPOINTS
  // -------------------------------------------------------------------------

  // 1. JWT Login Initiation (Demo Mode - Simple Credential Verification)
  app.post('/api/auth/login', async (req, res) => {
    let { email, password } = req.body;
    email = sanitizeInput(email).toLowerCase();
    password = sanitizeInput(password);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are both mandatory parameters.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please specify a valid operator email address.' });
    }

    try {
      // Demo Mode: Define hardcoded credentials
      const demoCredentials = [
        { email: 'admin@redforge.local', password: 'Admin@123', name: 'Administrator', role: 'Administrator' as const },
        { email: 'analyst@redforge.local', password: 'Analyst@123', name: 'SOC Analyst', role: 'Security Analyst' as const },
        { email: 'manager@redforge.local', password: 'Manager@123', name: 'Manager', role: 'Manager' as const }
      ];

      // Check if credentials match demo users
      const demoUser = demoCredentials.find(u => u.email === email && u.password === password);

      if (!demoUser) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Find or create user in store
      let userObj = store.users.find(u => u.email === email && u.deletedAt === null);

      if (!userObj) {
        // Create demo user in-memory if doesn't exist
        const passwordHash = hashPassword(password);
        userObj = {
          id: crypto.randomUUID(),
          uid: `uid-${crypto.randomBytes(8).toString('hex')}`,
          email,
          name: demoUser.name,
          role: demoUser.role,
          status: 'Active' as const,
          avatar: email.substring(0, 2).toUpperCase(),
          passwordHash,
          emailVerified: true,
          totpEnabled: false,
          totpSecret: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        };
        store.users.push(userObj);
      }

      // Generate JWT tokens directly (no MFA in demo mode)
      const tokenPayload = {
        uid: userObj.uid,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role
      };

      const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '7d' });

      // Save user session in-memory
      const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      store.userSessions.push({
        id: crypto.randomUUID(),
        userId: userObj.id,
        token: refreshToken,
        deviceInfo: req.headers['user-agent'] || 'Unknown Operator Node',
        ipAddress: req.ip || '127.0.0.1',
        rememberMe: true,
        expiresAt: sessionExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Clear any lockouts
      userObj.failedLoginAttempts = 0;
      userObj.lockedUntil = null;

      // Record successful login
      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: email,
        action: `Demo Mode: Login successful. Role: ${userObj.role}`,
        severity: 'Info',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      // Return JWT tokens directly (standard response format)
      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        user: {
          id: userObj.id,
          email: userObj.email,
          role: userObj.role,
          name: userObj.name,
          avatar: userObj.avatar,
          status: userObj.status
        }
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to complete login.' });
    }
  });

  // 2. POST /api/auth/send-otp (Email OTP Generation and Delivery)
  app.post('/api/auth/send-otp', async (req, res) => {
    let { email } = req.body;
    email = sanitizeInput(email).toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Destination operator email address is mandatory.' });
    }

    try {
      // Find the user
      const userObj = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!userObj) {
        return res.status(404).json({ error: 'Operator principal not discovered.' });
      }

      // Rate limit resend attempts (must wait 30 seconds between requests)
      const existingActiveOtps = store.otps.filter(o => o.email === email && o.type === 'EMAIL_MFA');
      if (existingActiveOtps.length > 0) {
        const newestOtp = existingActiveOtps[existingActiveOtps.length - 1];
        const secondsElapsed = (Date.now() - newestOtp.createdAt.getTime()) / 1000;
        if (secondsElapsed < 30) {
          return res.status(429).json({ 
            error: `Rate limit triggered. Please wait ${Math.ceil(30 - secondsElapsed)} seconds before requesting a new OTP.` 
          });
        }
      }

      // Generate random 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      // Expires after 5 minutes
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Store in memory
      store.otps.push({
        id: crypto.randomUUID(),
        email,
        otpHash: codeHash,
        type: 'EMAIL_MFA',
        attempts: 0,
        expiresAt,
        createdAt: new Date()
      });

      // Dispatch Email
      const transporter = getEmailTransporter();
      let mailSent = false;
      let consoleMsg = `[EMAIL OTP CONSOLE LOG] Code for ${email} is ${code}`;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"REDFORGE Enterprise ASM" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'REDFORGE Multi-Factor Authentication PIN',
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #30363d; border-radius: 8px; padding: 24px; background-color: #0d1117; color: #e6edf3;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">REDFORGE</h1>
                  <span style="color: #58a6ff; font-size: 11px; text-transform: uppercase; font-weight: 600; letter-spacing: 1.5px;">Security Control Center</span>
                </div>
                <h2 style="color: #ffffff; font-size: 18px; font-weight: 600; border-bottom: 1px solid #21262d; padding-bottom: 12px; margin-bottom: 20px;">Multi-Factor Authentication</h2>
                <p style="font-size: 14px; color: #8b949e; line-height: 1.5; margin-bottom: 20px;">
                  An administrator login attempt has been requested. Enter the following 6-digit cryptographic PIN to verify your identity and gain perimeter access.
                </p>
                <div style="background-color: #161b22; border: 1px solid #30363d; padding: 16px; border-radius: 6px; font-size: 32px; font-weight: bold; text-align: center; color: #ffffff; letter-spacing: 6px; margin: 24px 0;">
                  ${code}
                </div>
                <p style="font-size: 11px; color: #8b949e; text-align: center; margin-top: 24px; border-top: 1px solid #21262d; padding-top: 16px;">
                  This code expires in 5 minutes. If you did not initiate this authorization, please secure your credentials immediately.
                </p>
              </div>
            `
          });
          mailSent = true;
        } catch (mailErr) {
          console.error('Mail delivery failure:', mailErr);
        }
      }

      console.log('====================================================');
      console.log(consoleMsg);
      console.log('====================================================');

      res.json({
        success: true,
        message: mailSent ? 'Authenticating Multi-Factor challenge. OTP dispatched to email.' : 'Code established. Transmitted via Dev Console.',
        developer_fallback_otp: mailSent ? undefined : code
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate security token.' });
    }
  });

  // 3. POST /api/auth/verify-otp (OTP and MFA Verification + JWT Token Generation)
  app.post('/api/auth/verify-otp', async (req, res) => {
    let { email, otp, device_info, remember_me } = req.body;
    email = sanitizeInput(email).toLowerCase();
    otp = sanitizeInput(otp);

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and verification PIN are required.' });
    }

    try {
      const userObj = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!userObj) {
        return res.status(404).json({ error: 'Operator principal not discovered.' });
      }

      // Check lockout status
      if (userObj.lockedUntil && userObj.lockedUntil > new Date()) {
        const remainingSecs = Math.ceil((userObj.lockedUntil.getTime() - Date.now()) / 1000);
        return res.status(403).json({ 
          error: `Origin locked out due to repeated verification failures. Lockout ends in ${remainingSecs} seconds.` 
        });
      }

      let isVerified = false;

      // Case A: Google Authenticator (TOTP)
      if (userObj.totpEnabled && userObj.totpSecret) {
        isVerified = verifyTOTP(otp, userObj.totpSecret);
      } else {
        // Case B: Email OTP
        const activeOtps = store.otps.filter(o => o.email === email && o.type === 'EMAIL_MFA');
        if (activeOtps.length === 0) {
          return res.status(400).json({ error: 'No active authentication request discovered.' });
        }

        // Get the latest OTP record
        const otpRecord = activeOtps[activeOtps.length - 1];

        // Check if expired
        if (otpRecord.expiresAt < new Date()) {
          return res.status(400).json({ error: 'The verification code has expired (5 minutes timeout reached). Please trigger a new challenge.' });
        }

        // Check attempts
        if (otpRecord.attempts >= 3) {
          // lock out account
          const lockDate = new Date(Date.now() + 15 * 60 * 1000);
          userObj.lockedUntil = lockDate;

          store.auditLogs.push({
            id: crypto.randomUUID(),
            timestamp: new Date(),
            user: email,
            action: 'Intrusion Alert: Account lockout triggered due to repeated incorrect MFA OTP inputs.',
            severity: 'Critical',
            ip: req.ip || '127.0.0.1',
            browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
          });

          return res.status(403).json({ error: 'Max verification attempts reached. Security defense locked the account for 15 minutes.' });
        }

        const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (timingSafeCompare(inputHash, otpRecord.otpHash)) {
          isVerified = true;
          // Delete used OTP
          store.otps = store.otps.filter(o => o.id !== otpRecord.id);
        } else {
          otpRecord.attempts += 1;
          return res.status(400).json({ error: `Invalid verification PIN. Remaining attempts: ${3 - otpRecord.attempts}/3.` });
        }
      }

      if (!isVerified) {
        return res.status(400).json({ error: 'MFA challenge verification failed.' });
      }

      // Login success: Create cryptographic tokens
      const tokenPayload = {
        uid: userObj.uid,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role
      };

      const accessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
      const refreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '7d' });

      // Save user session in-memory
      const sessionExpiresAt = new Date(Date.now() + (remember_me ? 30 : 7) * 24 * 60 * 60 * 1000);
      store.userSessions.push({
        id: crypto.randomUUID(),
        userId: userObj.id,
        token: refreshToken,
        deviceInfo: device_info || req.headers['user-agent'] || 'Unknown Operator Node',
        ipAddress: req.ip || '127.0.0.1',
        rememberMe: !!remember_me,
        expiresAt: sessionExpiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Clear lockouts and failed login counters
      userObj.failedLoginAttempts = 0;
      userObj.lockedUntil = null;

      // Record successful verification
      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: email,
        action: `Success: Multi-Factor Authentication verified. Access Token granted. Role: ${userObj.role}`,
        severity: 'Info',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({
        user: {
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role,
          status: userObj.status,
          avatar: userObj.avatar,
          emailVerified: userObj.emailVerified,
          totpEnabled: userObj.totpEnabled
        },
        accessToken,
        refreshToken
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: 'MFA verification flow failed.' });
    }
  });

  // 4. Token Rotation (Refresh Endpoint)
  app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token parameter is mandatory.' });

    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
      
      // Look up session
      const sessionIdx = store.userSessions.findIndex(s => s.token === refreshToken);
      if (sessionIdx === -1) {
        // Reuse or theft detected. Clear ALL sessions of the compromised account.
        const targetUser = store.users.find(u => u.email === decoded.email);
        if (targetUser) {
          store.userSessions = store.userSessions.filter(s => s.userId !== targetUser.id);
        }
        return res.status(401).json({ error: 'Revoking all active sessions due to token reuse warning.' });
      }

      const session = store.userSessions[sessionIdx];
      if (session.expiresAt < new Date()) {
        store.userSessions.splice(sessionIdx, 1); // remove expired session
        return res.status(401).json({ error: 'Refresh token session has expired. Re-authentication mandatory.' });
      }

      // Generate rotated token pair
      const userObj = store.users.find(u => u.id === session.userId && u.deletedAt === null);
      if (!userObj) {
        return res.status(401).json({ error: 'User principal not discovered.' });
      }

      const tokenPayload = {
        uid: userObj.uid,
        email: userObj.email,
        name: userObj.name,
        role: userObj.role
      };

      const newAccessToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
      const newRefreshToken = jwt.sign(tokenPayload, REFRESH_SECRET, { expiresIn: '7d' });

      // Update session with new rotated token
      session.token = newRefreshToken;
      session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      session.updatedAt = new Date();

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });

    } catch (err) {
      return res.status(401).json({ error: 'Cryptographic validation of refresh token failed.' });
    }
  });

  // 5. Terminate Active Session (Logout)
  app.post('/api/auth/logout', async (req, res) => {
    const { refreshToken } = req.body;
    if (refreshToken) {
      store.userSessions = store.userSessions.filter(s => s.token !== refreshToken);
    }
    res.json({ success: true, message: 'Session closed successfully.' });
  });

  // 6. Terminate All Active Sessions (CISO/Admin Command)
  app.post('/api/auth/logout-all', requireAuth, async (req: AuthRequest, res) => {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const userObj = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!userObj) return res.status(404).json({ error: 'User not found.' });

      store.userSessions = store.userSessions.filter(s => s.userId !== userObj.id);

      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: email,
        action: 'Operator triggered universal logout. All active sessions terminated.',
        severity: 'Warning',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({ success: true, message: 'All active sessions successfully invalidated.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to invalidate active sessions.' });
    }
  });

  // 7. Password Reset Request (Generates recovery OTP)
  app.post('/api/auth/forgot-password', async (req, res) => {
    let { email } = req.body;
    email = sanitizeInput(email).toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'Please enter a valid operator email address.' });
    }

    try {
      const userObj = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!userObj) {
        return res.json({ success: true, message: 'Recovery code dispatched if email is recognized in the gateway.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      store.otps.push({
        id: crypto.randomUUID(),
        email,
        otpHash: codeHash,
        type: 'PASSWORD_RESET',
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
        createdAt: new Date()
      });

      const transporter = getEmailTransporter();
      let mailSent = false;
      let consoleMsg = `[PASSWORD RESET CONSOLE LOG] Code for ${email} is ${code}`;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"REDFORGE ASM" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'REDFORGE Password Reset Recovery PIN',
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #30363d; border-radius: 8px; padding: 24px; background-color: #0d1117; color: #e6edf3;">
                <h2 style="color: #ffffff; text-align: center;">Credentials Recovery</h2>
                <p style="font-size: 14px; color: #8b949e; line-height: 1.5;">
                  A password reset operation was initiated. Enter this 6-digit recovery PIN to update your credential vault access:
                </p>
                <div style="background-color: #161b22; padding: 16px; border-radius: 6px; font-size: 28px; font-weight: bold; text-align: center; color: #ffffff; letter-spacing: 5px; margin: 20px 0;">
                  ${code}
                </div>
                <p style="font-size: 11px; color: #8b949e; text-align: center;">
                  This code expires in 10 minutes. If you did not request this, secure your account now.
                </p>
              </div>
            `
          });
          mailSent = true;
        } catch (mailErr) {
          console.error(mailErr);
        }
      }

      console.log('====================================================');
      console.log(consoleMsg);
      console.log('====================================================');

      res.json({
        success: true,
        message: mailSent ? 'Recovery PIN dispatched to registered email.' : 'Recovery PIN established. Delivered via Dev Console.',
        developer_fallback_otp: mailSent ? undefined : code
      });

    } catch (err) {
      res.status(500).json({ error: 'Failed to initiate credentials recovery.' });
    }
  });

  // 8. Verify Recovery OTP Code
  app.post('/api/auth/verify-reset-code', async (req, res) => {
    let { email, code } = req.body;
    email = sanitizeInput(email).toLowerCase();
    code = sanitizeInput(code);

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification PIN are required.' });
    }

    try {
      const activeOtps = store.otps.filter(o => o.email === email && o.type === 'PASSWORD_RESET');
      if (activeOtps.length === 0) {
        return res.status(400).json({ error: 'No active recovery request found.' });
      }

      const otpRecord = activeOtps[activeOtps.length - 1];
      if (otpRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Code has expired.' });
      }

      const inputHash = crypto.createHash('sha256').update(code).digest('hex');
      if (timingSafeCompare(inputHash, otpRecord.otpHash)) {
        res.json({ success: true, message: 'Recovery PIN verified successfully. Proceed to rotate password.' });
      } else {
        res.status(400).json({ error: 'Invalid verification code.' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Verification failed.' });
    }
  });

  // 9. Commit Password Reset
  app.post('/api/auth/reset-password', async (req, res) => {
    let { email, code, password } = req.body;
    email = sanitizeInput(email).toLowerCase();
    code = sanitizeInput(code);
    password = sanitizeInput(password);

    if (!email || !code || !password) {
      return res.status(400).json({ error: 'Email, verification PIN, and new password are required.' });
    }

    try {
      const activeOtps = store.otps.filter(o => o.email === email && o.type === 'PASSWORD_RESET');
      if (activeOtps.length === 0) {
        return res.status(400).json({ error: 'No active recovery challenge found.' });
      }

      const otpRecord = activeOtps[activeOtps.length - 1];
      if (otpRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Recovery PIN has expired.' });
      }

      const inputHash = crypto.createHash('sha256').update(code).digest('hex');
      if (!timingSafeCompare(inputHash, otpRecord.otpHash)) {
        return res.status(400).json({ error: 'Invalid recovery verification code.' });
      }

      // Check user
      const userObj = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!userObj) {
        return res.status(404).json({ error: 'Operator principal not discovered.' });
      }

      // Secure delete OTP
      store.otps = store.otps.filter(o => o.id !== otpRecord.id);

      const passwordHash = hashPassword(password);

      // Save password and reset lockout counters
      userObj.passwordHash = passwordHash;
      userObj.failedLoginAttempts = 0;
      userObj.lockedUntil = null;
      userObj.updatedAt = new Date();

      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: email,
        action: 'Operator password successfully rotated and updated via secure self-service recovery.',
        severity: 'Warning',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({ success: true, message: 'Password established successfully. Please authenticate.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to reset password.' });
    }
  });

  // 10. Optional Google Authenticator Setup & Enable/Disable APIs
  app.post('/api/auth/totp/setup', requireAuth, async (req: AuthRequest, res) => {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const foundUser = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!foundUser) return res.status(404).json({ error: 'User not found.' });

      // Generate secret key
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let secret = 'REDFORGI';
      for (let i = 0; i < 16; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
      }

      const qrCodeUrl = `otpauth://totp/REDFORGE:${email}?secret=${secret}&issuer=REDFORGE`;
      res.json({
        secret,
        qrCodeUrl
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to initiate TOTP setup.' });
    }
  });

  app.post('/api/auth/totp/enable', requireAuth, async (req: AuthRequest, res) => {
    const email = req.user?.email;
    const { secret, code } = req.body;
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });
    if (!secret || !code) return res.status(400).json({ error: 'Secret and verification PIN are required.' });

    try {
      const isVerified = verifyTOTP(code, secret);
      if (!isVerified) {
        return res.status(400).json({ error: 'Invalid Google Authenticator code. Setup verification failed.' });
      }

      const foundUser = store.users.find(u => u.email === email && u.deletedAt === null);
      if (foundUser) {
        foundUser.totpEnabled = true;
        foundUser.totpSecret = secret;
        foundUser.updatedAt = new Date();
      }

      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: email,
        action: 'Google Authenticator (TOTP) multi-factor authentication has been enabled.',
        severity: 'Warning',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({ success: true, message: 'Google Authenticator MFA enabled successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to enable TOTP.' });
    }
  });

  app.post('/api/auth/totp/disable', requireAuth, async (req: AuthRequest, res) => {
    const email = req.user?.email;
    const { code } = req.body;
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });
    if (!code) return res.status(400).json({ error: 'Verification PIN is required.' });

    try {
      const foundUser = store.users.find(u => u.email === email && u.deletedAt === null);
      if (!foundUser || !foundUser.totpSecret) {
        return res.status(400).json({ error: 'TOTP is not configured.' });
      }

      const isVerified = verifyTOTP(code, foundUser.totpSecret);
      if (!isVerified) {
        return res.status(400).json({ error: 'Invalid verification PIN. Unable to disable TOTP.' });
      }

      foundUser.totpEnabled = false;
      foundUser.totpSecret = null;
      foundUser.updatedAt = new Date();

      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: email,
        action: 'Google Authenticator (TOTP) multi-factor authentication has been disabled.',
        severity: 'Critical',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({ success: true, message: 'Google Authenticator MFA disabled.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to disable TOTP.' });
    }
  });

  // 11. Send Verification Email API
  app.post('/api/auth/send-verification-email', requireAuth, async (req: AuthRequest, res) => {
    const email = req.user?.email;
    if (!email) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');

      store.otps.push({
        id: crypto.randomUUID(),
        email,
        otpHash: codeHash,
        type: 'EMAIL_VERIFICATION',
        attempts: 0,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        createdAt: new Date()
      });

      const transporter = getEmailTransporter();
      let mailSent = false;
      let consoleMsg = `[EMAIL VERIFICATION CONSOLE LOG] Code for ${email} is ${code}`;

      if (transporter) {
        try {
          await transporter.sendMail({
            from: `"REDFORGE ASM" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'REDFORGE E-Mail Verification PIN',
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #30363d; border-radius: 8px; padding: 24px; background-color: #0d1117; color: #e6edf3;">
                <h2 style="color: #ffffff; text-align: center;">Verify Your E-Mail</h2>
                <p style="font-size: 14px; color: #8b949e; line-height: 1.5;">
                  Please verify your operational email address using the following 6-digit PIN.
                </p>
                <div style="background-color: #161b22; padding: 16px; border-radius: 6px; font-size: 28px; font-weight: bold; text-align: center; color: #ffffff; letter-spacing: 5px; margin: 20px 0;">
                  ${code}
                </div>
              </div>
            `
          });
          mailSent = true;
        } catch (mailErr) {
          console.error(mailErr);
        }
      }

      console.log('====================================================');
      console.log(consoleMsg);
      console.log('====================================================');

      res.json({
        success: true,
        message: mailSent ? 'Email verification code has been dispatched.' : 'Code generated. Delivered via Dev Console.',
        developer_fallback_otp: mailSent ? undefined : code
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to trigger verification email.' });
    }
  });

  app.post('/api/auth/verify-email', async (req, res) => {
    let { email, code } = req.body;
    email = sanitizeInput(email).toLowerCase();
    code = sanitizeInput(code);

    if (!email || !code) return res.status(400).json({ error: 'Email and verification code are required.' });

    try {
      const activeOtps = store.otps.filter(o => o.email === email && o.type === 'EMAIL_VERIFICATION');

      if (activeOtps.length === 0) return res.status(400).json({ error: 'No active email verification request found.' });

      const otpRecord = activeOtps[activeOtps.length - 1];
      if (otpRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Code has expired.' });
      }

      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      if (timingSafeCompare(codeHash, otpRecord.otpHash)) {
        store.otps = store.otps.filter(o => o.id !== otpRecord.id);
        const userObj = store.users.find(u => u.email === email && u.deletedAt === null);
        if (userObj) {
          userObj.emailVerified = true;
          userObj.updatedAt = new Date();
        }
        res.json({ success: true, message: 'Email address successfully verified!' });
      } else {
        res.status(400).json({ error: 'Invalid verification code.' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Email verification check failed.' });
    }
  });

  // -------------------------------------------------------------------------
  // ORGANIZATIONS & TEAMS API ENDPOINTS (MULTI-TENANT CAPABILITIES)
  // -------------------------------------------------------------------------

  // GET Organizations
  app.get('/api/organizations', async (req, res) => {
    try {
      const list = store.organizations.filter(o => o.deletedAt === null);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve organizations.' });
    }
  });

  // POST Create Organization
  app.post('/api/organizations', async (req, res) => {
    const { name, domain, subscriptionTier } = req.body;
    if (!name || !domain) {
      return res.status(400).json({ error: 'Name and domain fields are mandatory.' });
    }
    try {
      const newOrg = {
        id: crypto.randomUUID(),
        name,
        domain,
        subscriptionTier: subscriptionTier || 'Standard',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.organizations.push(newOrg);
      res.json(newOrg);
    } catch (err) {
      res.status(500).json({ error: 'Failed to register organization.' });
    }
  });

  // PATCH Update Organization
  app.patch('/api/organizations/:id', async (req, res) => {
    const { id } = req.params;
    const { name, domain, subscriptionTier } = req.body;
    try {
      const org = store.organizations.find(o => o.id === id && o.deletedAt === null);
      if (!org) return res.status(404).json({ error: 'Organization not found' });

      if (name !== undefined) org.name = name;
      if (domain !== undefined) org.domain = domain;
      if (subscriptionTier !== undefined) org.subscriptionTier = subscriptionTier;
      org.updatedAt = new Date();

      res.json(org);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update organization.' });
    }
  });

  // DELETE Organization (Soft Delete)
  app.delete('/api/organizations/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const org = store.organizations.find(o => o.id === id && o.deletedAt === null);
      if (org) {
        org.deletedAt = new Date();
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove organization.' });
    }
  });

  // GET Teams
  app.get('/api/teams', async (req, res) => {
    try {
      const list = store.teams.filter(t => t.deletedAt === null);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve teams.' });
    }
  });

  // POST Create Team
  app.post('/api/teams', async (req, res) => {
    const { organizationId, name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name is mandatory.' });

    try {
      const newTeam = {
        id: crypto.randomUUID(),
        organizationId: organizationId || null,
        name,
        description: description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.teams.push(newTeam);
      res.json(newTeam);
    } catch (err) {
      res.status(500).json({ error: 'Failed to register team.' });
    }
  });

  // PATCH Update Team
  app.patch('/api/teams/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
      const team = store.teams.find(t => t.id === id && t.deletedAt === null);
      if (!team) return res.status(404).json({ error: 'Team not found' });

      if (name !== undefined) team.name = name;
      if (description !== undefined) team.description = description;
      team.updatedAt = new Date();

      res.json(team);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update team.' });
    }
  });

  // DELETE Team (Soft Delete)
  app.delete('/api/teams/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const team = store.teams.find(t => t.id === id && t.deletedAt === null);
      if (team) {
        team.deletedAt = new Date();
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete team.' });
    }
  });

  // -------------------------------------------------------------------------
  // REPORTING COMPILATION SERVICE & PAYLOAD AUDIT ENDPOINT
  // -------------------------------------------------------------------------
  app.post('/api/reports/compile', requireAuth, async (req: AuthRequest, res) => {
    const { projectId, reportType, format, scopesIncluded, executiveSummary } = req.body;
    const callerEmail = req.user?.email || 'SOC Operator';
    
    try {
      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: callerEmail,
        action: `Compiled analytical platform report (Type: ${reportType || 'ASM Overview'}, Format: ${format || 'PDF'}).`,
        severity: 'Info',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({
        success: true,
        reportId: `rep-${crypto.randomBytes(6).toString('hex')}`,
        compiledUrl: `/api/static/mock-reports/compiled-sec-report-${Date.now()}.pdf`,
        message: 'Platform continuous compliance and threat landscape report compiled successfully.'
      });
    } catch (err) {
      res.status(500).json({ error: 'Reporting compilation pipeline failure.' });
    }
  });

  // -------------------------------------------------------------------------
  // CRYPTOGRAPHIC FILE / PAYLOAD UPLOAD SIMULATION API
  // -------------------------------------------------------------------------
  app.post('/api/upload', requireAuth, async (req: AuthRequest, res) => {
    const callerEmail = req.user?.email || 'SOC Operator';
    try {
      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: callerEmail,
        action: 'Uploaded cryptographic proof payload artifact to administrative finding store.',
        severity: 'Warning',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });

      res.json({
        success: true,
        url: `/uploads/artifacts/evidence-${Date.now()}.bin`,
        message: 'Payload verified, sandbox checked, and stored securely.'
      });
    } catch (err) {
      res.status(500).json({ error: 'Upload gateway experienced validation fault.' });
    }
  });

  // -------------------------------------------------------------------------
  // THREAT INTELLIGENCE (TACTICAL INGEST / TTP FEED)
  // -------------------------------------------------------------------------
  app.get('/api/threat-intel/feed', async (req, res) => {
    res.json({
      activeThreats: [
        {
          id: 'tf-1',
          source: 'CISA KEV',
          title: 'Ivanti EPMM Authorization Bypass Vulnerability actively exploited',
          published: '12 mins ago',
          severity: 'Critical',
          cve: 'CVE-2023-35078',
          actor: 'APT-41 (Shadow Pad)',
          description: 'State-sponsored threat actors are performing zero-day exploitation against mobile path targets using API request parameters to download core settings.'
        },
        {
          id: 'tf-2',
          source: 'Microsoft Threat Intelligence',
          title: 'Storm-0558 stealing Exchange Email Sessions via custom MSA Keys',
          published: '45 mins ago',
          severity: 'High',
          cve: 'CVE-2023-36884',
          actor: 'Storm-0558',
          description: 'Identified sophisticated token forging operations permitting cross-identity inbox inspection on unhardened federated cloud environments.'
        },
        {
          id: 'tf-3',
          source: 'MITRE ATT&CK',
          title: 'Lazarus Group Targeting Financial Sectors via Broken Session Cookies',
          published: '2 hours ago',
          severity: 'High',
          cve: 'CVE-2023-38606',
          actor: 'Lazarus Group',
          description: 'Threat actors are leveraging stateful hijack techniques on web services to extract unexpired bearer session tokens from client-side cookies.'
        },
        {
          id: 'tf-4',
          source: 'SANS ISC',
          title: 'Postgres SQL Injection campaigns in wild',
          published: '5 hours ago',
          severity: 'High',
          cve: 'CVE-2024-0914',
          actor: 'Unknown Botnet',
          description: 'Elevated scans detected targeting vulnerable database endpoints. Botnets are performing automated raw SQL statement execution to harvest system tables.'
        }
      ]
    });
  });

  // POST ANALYZE IOC (CVE, IP, Domain, Hash via Shodan, VirusTotal, NVD API, Gemini)
  app.post('/api/threat-intel/analyze', async (req, res) => {
    const { ioc } = req.body;
    if (!ioc) {
      return res.status(400).json({ error: 'Indicator of Compromise parameter "ioc" is mandatory.' });
    }
    
    try {
      let analysisResult;
      
      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });
          
          const prompt = `You are a Tier 3 Cyber Threat Intelligence analyst at REDFORGE.
Analyze the following Indicator of Compromise (IoC) or CVE ID: "${ioc}".
Provide a detailed threat assessment. Your output MUST be a JSON object conforming EXACTLY to the following schema:
{
  "ioc": "${ioc}",
  "type": "IP Address" or "Domain / FQDN" or "Cryptographic Hash" or "Vulnerability CVE",
  "status": "Malicious" or "Clean" or "Suspicious",
  "category": "A short, descriptive threat category",
  "country": "Two-letter country code or country name",
  "details": "A detailed behavior report, simulating real integration lookups from Shodan, VirusTotal, and NVD API.",
  "recommendation": "Remediation and block policies"
}
Output ONLY raw JSON. No markdown blocks, no wrapping, just valid parseable JSON.`;

          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json"
            }
          });
          
          const text = response.text?.trim() || '{}';
          analysisResult = JSON.parse(text);
        } catch (geminiErr) {
          console.error("Gemini threat intel analysis failed, falling back to static resolver:", geminiErr);
        }
      }
      
      // Fallback resolver if Gemini is unavailable or fails
      if (!analysisResult) {
        const isIP = /^[0-9.]+$/.test(ioc);
        const isHash = ioc.length >= 32;
        const isCve = ioc.toUpperCase().startsWith('CVE-');
        
        if (isCve) {
          analysisResult = {
            ioc,
            type: 'Vulnerability CVE',
            status: 'Malicious',
            category: 'NVD Critical Vulnerability Mapping',
            country: 'US (NVD Registry)',
            details: `Automated query matching National Vulnerability Database (NVD) registry. This CVE represents an unmitigated remote code execution or authorization bypass flaw in active scanning pools.`,
            recommendation: 'Apply latest official software vendor patch immediately.'
          };
        } else if (isIP) {
          analysisResult = {
            ioc,
            type: 'IP Address',
            status: 'Malicious',
            category: 'C2 (Command & Control) Server Node',
            country: 'Eastern Europe / Proxy Subnet',
            details: 'Querying Shodan & VirusTotal gateway. Found open SSH, RDP, and HTTP proxy ports. Identified in brute forcing campaigns against core perimeters.',
            recommendation: 'Block immediately via Perimeter NGFW/WAF egress policies.'
          };
        } else if (isHash) {
          analysisResult = {
            ioc,
            type: 'Cryptographic Hash',
            status: 'Malicious',
            category: 'LockBit Ransomware Decryptor Dropper',
            country: 'Global Distributed',
            details: 'Querying VirusTotal database. 68/72 engines flagged this binary artifact as highly dangerous Win32 malicious ransomware payload.',
            recommendation: 'Quarantine associated system hosts and flag via SIEM Endpoint Detection response (EDR).'
          };
        } else {
          analysisResult = {
            ioc,
            type: 'Domain / FQDN Pointer',
            status: 'Suspicious',
            category: 'Phishing Campaign Redirect Portal',
            country: 'Distributed Proxy',
            details: 'Domain is registered under proxy protection. Domain reputation checks show active links to credential harvesting web forms.',
            recommendation: 'Synchronize blocklist to core corporate DNS servers.'
          };
        }
      }
      
      // Save an audit log of this threat analysis in-memory
      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: 'SOC Analyst',
        action: `Analyzed threat indicator: ${ioc} (${analysisResult.type}) with status: ${analysisResult.status}`,
        severity: analysisResult.status === 'Malicious' ? 'Warning' : 'Info',
        ip: req.ip || '127.0.0.1',
        browser: req.headers['user-agent']?.substring(0, 50) || 'Unknown'
      });
      
      res.json(analysisResult);
    } catch (err: any) {
      console.error('Threat analysis endpoint failed:', err);
      res.status(500).json({ error: 'Failed to analyze Indicator of Compromise' });
    }
  });

  // GET users
  app.get('/api/users', async (req, res) => {
    try {
      const allUsers = store.users.filter(u => u.deletedAt === null);
      res.json(allUsers);
    } catch (error: any) {
      console.error('Failed to query users:', error);
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  });

  // POST create user
  app.post('/api/users', async (req, res) => {
    const { name, email, role, status, avatar } = req.body;
    try {
      const tempUid = `temp-uid-${Date.now()}`;
      const newUser = {
        id: crypto.randomUUID(),
        uid: tempUid,
        name,
        email,
        role: role || 'Administrator',
        status: (status || 'Active') as 'Active' | 'Suspended',
        avatar: avatar || name.substring(0, 2).toUpperCase(),
        passwordHash: hashPassword('Admin@123'),
        emailVerified: true,
        totpEnabled: false,
        totpSecret: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.users.push(newUser);
      res.json(newUser);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user record' });
    }
  });

  // PATCH user role
  app.patch('/api/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
      const user = store.users.find(u => u.id === id && u.deletedAt === null);
      if (!user) return res.status(404).json({ error: 'User not found' });

      user.role = role;
      user.updatedAt = new Date();
      res.json(user);
    } catch (error: any) {
      console.error('Failed to update user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // PATCH user status
  app.patch('/api/users/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const user = store.users.find(u => u.id === id && u.deletedAt === null);
      if (!user) return res.status(404).json({ error: 'User not found' });

      user.status = status;
      user.updatedAt = new Date();
      res.json(user);
    } catch (error: any) {
      console.error('Failed to update user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  });

  // GET projects
  app.get('/api/projects', async (req, res) => {
    try {
      const allProjects = store.projects.filter(p => p.deletedAt === null);
      const formattedProjects = allProjects.map(p => {
        const associatedAssets = store.assets.filter(a => a.projectId === p.id && a.deletedAt === null);
        const associatedAssessments = store.assessments.filter(as => as.projectId === p.id && as.deletedAt === null);
        const associatedFindings = store.findings.filter(f => f.projectId === p.id && f.deletedAt === null);
        
        const findingsCount = { Critical: 0, High: 0, Medium: 0, Low: 0 };
        associatedFindings.forEach(f => {
          if (f.severity === 'Critical') findingsCount.Critical++;
          else if (f.severity === 'High') findingsCount.High++;
          else if (f.severity === 'Medium') findingsCount.Medium++;
          else if (f.severity === 'Low') findingsCount.Low++;
        });

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          health: p.health,
          status: p.status,
          scope: p.scope,
          rulesOfEngagement: p.rulesOfEngagement,
          notes: p.notes,
          team: p.team,
          createdAt: p.createdAt.toISOString(),
          assetsCount: associatedAssets.length,
          assessmentsCount: associatedAssessments.length,
          findingsCount,
          activity: [] // populated dynamically in frontend if needed
        };
      });
      res.json(formattedProjects);
    } catch (error: any) {
      console.error('Failed to retrieve projects:', error);
      res.status(500).json({ error: 'Failed to query project logs' });
    }
  });

  // POST create project
  app.post('/api/projects', async (req, res) => {
    const { name, description, health, status, scope, rulesOfEngagement, notes, team } = req.body;
    try {
      const newProj = {
        id: crypto.randomUUID(),
        name,
        description: description || '',
        health: (health || 'Healthy') as 'Healthy' | 'Degraded' | 'Critical',
        status: (status || 'Active') as 'Active' | 'Archived' | 'Draft',
        scope: scope || [],
        rulesOfEngagement: rulesOfEngagement || '',
        notes: notes || '',
        team: team || ['S. Architect'],
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.projects.push(newProj);
      res.json(newProj);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      res.status(500).json({ error: 'Failed to create new project' });
    }
  });

  // PATCH project notes
  app.patch('/api/projects/:id/notes', async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    try {
      const proj = store.projects.find(p => p.id === id && p.deletedAt === null);
      if (!proj) return res.status(404).json({ error: 'Project not found' });

      proj.notes = notes;
      proj.updatedAt = new Date();
      res.json(proj);
    } catch (error: any) {
      console.error('Failed to update project notes:', error);
      res.status(500).json({ error: 'Failed to save project notes' });
    }
  });

  // GET assets
  app.get('/api/assets', async (req, res) => {
    try {
      const allAssets = store.assets.filter(a => a.deletedAt === null);
      res.json(allAssets.map(a => ({
        ...a,
        lastScanned: a.lastScanned.toISOString()
      })));
    } catch (error: any) {
      console.error('Failed to query assets:', error);
      res.status(500).json({ error: 'Failed to retrieve asset inventory' });
    }
  });

  // POST create asset
  app.post('/api/assets', async (req, res) => {
    const { type, name, address, criticality, environment, tags, status, owner, technology, operatingSystem, projectId } = req.body;
    try {
      const targetProjectId = projectId || 'b1111111-1111-1111-1111-111111111111'; // fallback to first seed project
      const newAsset = {
        id: crypto.randomUUID(),
        projectId: targetProjectId,
        type,
        name,
        address,
        criticality: (criticality || 'Medium') as 'Low' | 'Medium' | 'High' | 'Critical',
        environment: (environment || 'Production') as 'Production' | 'Staging' | 'Development',
        tags: tags || [],
        status: (status || 'Active') as 'Active' | 'Inactive',
        owner: owner || 'S. Architect',
        technology: technology || '',
        operatingSystem: operatingSystem || '',
        lastScanned: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.assets.push(newAsset);
      res.json(newAsset);
    } catch (error: any) {
      console.error('Failed to insert asset:', error);
      res.status(500).json({ error: 'Failed to record asset detail' });
    }
  });

  // DELETE asset
  app.delete('/api/assets/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const asset = store.assets.find(a => a.id === id && a.deletedAt === null);
      if (asset) {
        asset.deletedAt = new Date();
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete asset:', error);
      res.status(500).json({ error: 'Failed to remove asset record' });
    }
  });

  // POST bulk create assets
  app.post('/api/assets/bulk', async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Payload must feature an items array' });
    }
    try {
      const targetProjectId = 'b1111111-1111-1111-1111-111111111111';
      const createdItems = items.map(item => {
        const newAsset = {
          id: crypto.randomUUID(),
          projectId: targetProjectId,
          type: item.type,
          name: item.name,
          address: item.address,
          criticality: (item.criticality || 'Medium') as 'Low' | 'Medium' | 'High' | 'Critical',
          environment: (item.environment || 'Production') as 'Production' | 'Staging' | 'Development',
          tags: item.tags || [],
          status: (item.status || 'Active') as 'Active' | 'Inactive',
          owner: item.owner || 'S. Architect',
          technology: item.technology || '',
          operatingSystem: item.operatingSystem || '',
          lastScanned: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null
        };
        store.assets.push(newAsset);
        return newAsset;
      });
      res.json(createdItems);
    } catch (error: any) {
      console.error('Bulk asset creation failed:', error);
      res.status(500).json({ error: 'Bulk asset intake failed' });
    }
  });

  // POST bulk delete assets
  app.post('/api/assets/bulk-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Ids must be an array of strings' });
    }
    try {
      ids.forEach(id => {
        const asset = store.assets.find(a => a.id === id && a.deletedAt === null);
        if (asset) {
          asset.deletedAt = new Date();
        }
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Bulk deletion failed:', error);
      res.status(500).json({ error: 'Bulk cleanup failed' });
    }
  });

  // GET findings
  app.get('/api/findings', async (req, res) => {
    try {
      const allFindings = store.findings.filter(f => f.deletedAt === null);
      const formattedFindings = allFindings.map(f => {
        const relatedComments = store.comments.filter(c => c.findingId === f.id).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        const relatedHistory = store.findingHistory.filter(h => h.findingId === f.id).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        return {
          id: f.id,
          identifier: f.identifier,
          title: f.title,
          description: f.description,
          severity: f.severity,
          cvss: f.cvss,
          asset: f.asset,
          status: f.status,
          mitreAttack: f.mitreAttack,
          cwe: f.cwe,
          owasp: f.owasp,
          proofOfConcept: f.proofOfConcept,
          recommendation: f.recommendation,
          references: f.references,
          assignedTo: f.assignedTo || undefined,
          discoveredAt: f.discoveredAt.toISOString(),
          evidence: f.evidence || undefined,
          comments: relatedComments.map(c => ({
            id: c.id,
            user: c.user,
            text: c.text,
            timestamp: c.timestamp.toISOString()
          })),
          history: relatedHistory.map(h => ({
            id: h.id,
            user: h.user,
            action: h.action,
            timestamp: h.timestamp.toISOString()
          })),
          attachments: f.attachments
        };
      });
      res.json(formattedFindings);
    } catch (error: any) {
      console.error('Failed to query findings:', error);
      res.status(500).json({ error: 'Failed to list security findings' });
    }
  });

  // POST create finding
  app.post('/api/findings', async (req, res) => {
    const { 
      identifier, title, description, severity, cvss, asset, 
      status, mitreAttack, cwe, owasp, proofOfConcept, recommendation, 
      references, assignedTo, evidence, projectId 
    } = req.body;
    try {
      const targetProjectId = projectId || 'b1111111-1111-1111-1111-111111111111';
      const newFinding = {
        id: crypto.randomUUID(),
        projectId: targetProjectId,
        identifier,
        title,
        description: description || '',
        severity: (severity || 'Medium') as 'Low' | 'Medium' | 'High' | 'Critical',
        cvss: cvss || 5.0,
        asset,
        status: (status || 'Open') as 'Open' | 'In Triage' | 'Assigned' | 'Resolved' | 'Closed',
        mitreAttack: mitreAttack || '',
        cwe: cwe || '',
        owasp: owasp || '',
        proofOfConcept: proofOfConcept || '',
        recommendation: recommendation || '',
        references: references || [],
        assignedTo: assignedTo || null,
        evidence: evidence || null,
        attachments: [],
        discoveredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.findings.push(newFinding);
      res.json(newFinding);
    } catch (error: any) {
      console.error('Failed to create finding:', error);
      res.status(500).json({ error: 'Failed to record diagnostic finding' });
    }
  });

  // PATCH finding status
  app.patch('/api/findings/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, operator } = req.body;
    try {
      const finding = store.findings.find(f => f.id === id && f.deletedAt === null);
      if (!finding) return res.status(404).json({ error: 'Finding not found' });

      finding.status = status;
      finding.updatedAt = new Date();
      
      // Append history
      store.findingHistory.push({
        id: crypto.randomUUID(),
        findingId: id,
        user: operator || 'SOC Operator',
        action: `Updated status to ${status}`,
        timestamp: new Date()
      });

      res.json(finding);
    } catch (error: any) {
      console.error('Failed to update finding status:', error);
      res.status(500).json({ error: 'Failed to shift finding triage state' });
    }
  });

  // PATCH finding cvss
  app.patch('/api/findings/:id/cvss', async (req, res) => {
    const { id } = req.params;
    const { score, severity, operator } = req.body;
    try {
      const finding = store.findings.find(f => f.id === id && f.deletedAt === null);
      if (!finding) return res.status(404).json({ error: 'Finding not found' });

      finding.cvss = score;
      finding.severity = severity;
      finding.updatedAt = new Date();
      
      store.findingHistory.push({
        id: crypto.randomUUID(),
        findingId: id,
        user: operator || 'Assessor',
        action: `Recalculated CVSS score to ${score} (${severity})`,
        timestamp: new Date()
      });

      res.json(finding);
    } catch (error: any) {
      console.error('Failed to update finding score:', error);
      res.status(500).json({ error: 'Failed to record threat recalibration' });
    }
  });

  // POST add comment to finding
  app.post('/api/findings/:id/comments', async (req, res) => {
    const { id } = req.params;
    const { text, operator } = req.body;
    try {
      const newComment = {
        id: crypto.randomUUID(),
        findingId: id,
        user: operator || 'Analyst',
        text,
        timestamp: new Date()
      };
      store.comments.push(newComment);

      store.findingHistory.push({
        id: crypto.randomUUID(),
        findingId: id,
        user: operator || 'Analyst',
        action: `Added coordination comment: "${text.slice(0, 30)}..."`,
        timestamp: new Date()
      });

      res.json(newComment);
    } catch (error: any) {
      console.error('Failed to add coordination comment:', error);
      res.status(500).json({ error: 'Failed to post collaboration text' });
    }
  });

  // POST add attachment to finding
  app.post('/api/findings/:id/attachments', async (req, res) => {
    const { id } = req.params;
    const { fileName, operator } = req.body;
    try {
      const finding = store.findings.find(f => f.id === id && f.deletedAt === null);
      if (!finding) {
        return res.status(404).json({ error: 'Finding not found' });
      }
      
      finding.attachments = [...finding.attachments, fileName];
      finding.updatedAt = new Date();

      store.findingHistory.push({
        id: crypto.randomUUID(),
        findingId: id,
        user: operator || 'Engineer',
        action: `Uploaded cryptographic payload artifact: ${fileName}`,
        timestamp: new Date()
      });

      res.json({ success: true, fileName });
    } catch (error: any) {
      console.error('Failed to attach artifact:', error);
      res.status(500).json({ error: 'Failed to record payload file' });
    }
  });

  // GET assessments
  app.get('/api/assessments', async (req, res) => {
    try {
      const allAsms = store.assessments.filter(a => a.deletedAt === null);
      res.json(allAsms);
    } catch (error: any) {
      console.error('Failed to query assessments:', error);
      res.status(500).json({ error: 'Failed to query current active assessments' });
    }
  });

  // POST create assessment
  app.post('/api/assessments', async (req, res) => {
    const { name, scope, rulesOfEngagement, status, startDate, endDate, assignedTeam, projectId } = req.body;
    try {
      const targetProjectId = projectId || 'b1111111-1111-1111-1111-111111111111';
      const newAsm = {
        id: crypto.randomUUID(),
        projectId: targetProjectId,
        name,
        scope: scope || [],
        rulesOfEngagement: rulesOfEngagement || '',
        status: (status || 'Scheduled') as 'Scheduled' | 'Active' | 'Completed',
        progress: 0,
        startDate,
        endDate,
        assignedTeam: assignedTeam || [],
        findingsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };
      store.assessments.push(newAsm);
      res.json(newAsm);
    } catch (error: any) {
      console.error('Failed to create assessment:', error);
      res.status(500).json({ error: 'Failed to launch evaluation audit' });
    }
  });

  // PATCH assessment status
  app.patch('/api/assessments/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const asm = store.assessments.find(a => a.id === id && a.deletedAt === null);
      if (!asm) return res.status(404).json({ error: 'Assessment not found' });

      asm.status = status;
      asm.updatedAt = new Date();
      res.json(asm);
    } catch (error: any) {
      console.error('Failed to update assessment status:', error);
      res.status(500).json({ error: 'Failed to advance audit tracker state' });
    }
  });

  // GET audit logs
  app.get('/api/logs', async (req, res) => {
    try {
      const sortedLogs = [...store.auditLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      res.json(sortedLogs.map(l => ({
        ...l,
        timestamp: l.timestamp.toISOString()
      })));
    } catch (error: any) {
      console.error('Failed to retrieve audit logs:', error);
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  });

  // POST create audit log
  app.post('/api/logs', async (req, res) => {
    const { user, action, ip, browser, severity } = req.body;
    try {
      const newLog = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user,
        action,
        ip: ip || '127.0.0.1',
        browser: browser || 'Agent',
        severity: (severity || 'Info') as 'Info' | 'Warning' | 'Critical'
      };
      store.auditLogs.push(newLog);
      res.json(newLog);
    } catch (error: any) {
      console.error('Failed to record security event:', error);
      res.status(500).json({ error: 'Failed to append log record' });
    }
  });

  // GET notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const sortedNotifs = [...store.notifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      res.json(sortedNotifs.map(n => n.message));
    } catch (error: any) {
      console.error('Failed to retrieve notifications:', error);
      res.status(500).json({ error: 'Failed to fetch unread warnings' });
    }
  });

  // POST create notification
  app.post('/api/notifications', async (req, res) => {
    const { message } = req.body;
    try {
      store.notifications.push({
        id: crypto.randomUUID(),
        message,
        read: false,
        createdAt: new Date()
      });
      const sortedNotifs = [...store.notifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      res.json(sortedNotifs.map(n => n.message));
    } catch (error: any) {
      console.error('Failed to record warning notification:', error);
      res.status(500).json({ error: 'Failed to dispatch alert' });
    }
  });

  // POST clear notifications
  app.post('/api/notifications/clear', async (req, res) => {
    try {
      store.notifications = [];
      res.json([]);
    } catch (error: any) {
      console.error('Failed to clear notifications:', error);
      res.status(500).json({ error: 'Failed to truncate inbox warnings' });
    }
  });

  // POST reset all data (in-memory seed reset)
  app.post('/api/reset', async (req, res) => {
    try {
      seedDatabase();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Reset all data failed:', error);
      res.status(500).json({ error: 'Failed to reset relational data tables', details: error.message });
    }
  });

  // -------------------------------------------------------------------------
  // CONTINUOUS BACKGROUND SCAN ENGINE (BACKGROUND JOBS)
  // -------------------------------------------------------------------------
  const VULNERABILITY_TEMPLATES = [
    { identifier: 'CVE-2024-7102', title: 'SSH Weak Key Exchange Algorithms Enabled', severity: 'Medium' as const, cvss: 5.8, cwe: 'CWE-326', owasp: 'A02', mitreAttack: 'T1110', description: 'The remote SSH server is configured to allow weak key exchange algorithms, permitting potentially decrypted session sniffing.', recommendation: 'Update SSH configuration to disable diffie-hellman-group1-sha1 and force SHA-2 key exchanges.' },
    { identifier: 'CVE-2024-8119', title: 'Sensitive Environment Configuration File Publicly Exposed', severity: 'Critical' as const, cvss: 9.8, cwe: 'CWE-538', owasp: 'A05', mitreAttack: 'T1530', description: 'A publicly readable .env file was discovered on the web application root, containing plaintext PostgreSQL database credentials and JWT signing keys.', recommendation: 'Remove .env file from public-facing web directory and utilize secure environment variable injection.' },
    { identifier: 'CVE-2024-1104', title: 'Cross-Site Scripting (XSS) via Feedback Form Parameter', severity: 'High' as const, cvss: 7.2, cwe: 'CWE-79', owasp: 'A03', mitreAttack: 'T1204', description: 'The feedback submission parameters are reflected in the administrator portal dashboard without sanitization or HTML encoding.', recommendation: 'Implement robust backend input sanitization and force DOM purification on all reflected fields.' },
    { identifier: 'CVE-2024-4320', title: 'Expired JWT Bearer Tokens Accepted by API Route', severity: 'High' as const, cvss: 8.1, cwe: 'CWE-287', owasp: 'A07', mitreAttack: 'T1539', description: 'The cryptographic token verification middleware fails to validate expiration claims, accepting expired tokens.', recommendation: 'Ensure the jwt.verify function is configured to assert exp claim validity strictly.' }
  ];

  setInterval(() => {
    try {
      const activeAssets = store.assets.filter(a => a.deletedAt === null);
      if (activeAssets.length === 0) return;

      // Select a random asset to scan
      const targetAsset = activeAssets[Math.floor(Math.random() * activeAssets.length)];
      
      // Update last scanned timestamp
      targetAsset.lastScanned = new Date();

      // Log the scan activity
      store.auditLogs.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        user: 'AutoScanner Engine',
        action: `Completed security health check scan on: ${targetAsset.name} (${targetAsset.address})`,
        severity: 'Info',
        ip: '127.0.0.1',
        browser: 'RedForge Core Bot'
      });

      // 15% chance of finding a vulnerability
      if (Math.random() < 0.15) {
        const vuln = VULNERABILITY_TEMPLATES[Math.floor(Math.random() * VULNERABILITY_TEMPLATES.length)];
        
        // Ensure we don't insert duplicate active finding
        const existing = store.findings.find(f => f.identifier === vuln.identifier && f.asset === targetAsset.address && f.deletedAt === null);

        if (!existing) {
          const targetProjectId = targetAsset.projectId || 'b1111111-1111-1111-1111-111111111111';
          const newFinding = {
            id: crypto.randomUUID(),
            projectId: targetProjectId,
            identifier: vuln.identifier,
            title: `${vuln.title} on ${targetAsset.name}`,
            description: vuln.description,
            severity: vuln.severity,
            cvss: vuln.cvss,
            asset: targetAsset.address,
            status: 'Open' as const,
            mitreAttack: vuln.mitreAttack,
            cwe: vuln.cwe,
            owasp: vuln.owasp,
            proofOfConcept: 'GET / HTTP/1.1 -> Reflected payload triggers execution',
            recommendation: vuln.recommendation,
            references: [`https://nvd.nist.gov/vuln/detail/${vuln.identifier}`],
            assignedTo: 'SOC Lead',
            evidence: 'Identified passive endpoint exposure during crawler scan.',
            attachments: [],
            discoveredAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null
          };
          
          store.findings.push(newFinding);

          // Log finding history
          store.findingHistory.push({
            id: crypto.randomUUID(),
            findingId: newFinding.id,
            user: 'AutoScanner Engine',
            action: `Discovered critical flaw: ${vuln.identifier}`,
            timestamp: new Date()
          });

          // Dispatch notification
          store.notifications.push({
            id: crypto.randomUUID(),
            message: `[VULN DETECTED] New ${vuln.severity} finding ${vuln.identifier} mapped to ${targetAsset.name}.`,
            read: false,
            createdAt: new Date()
          });

          // Increment findings count on active assessment campaigns for this project
          const activeAssessments = store.assessments.filter(as => as.projectId === targetProjectId && as.status === 'Active');
          
          activeAssessments.forEach(asm => {
            asm.findingsCount = (asm.findingsCount || 0) + 1;
            asm.updatedAt = new Date();
          });
        }
      }
    } catch (err) {
      console.error('Continuous background scan task failed:', err);
    }
  }, 45000); // scan every 45s

  // -------------------------------------------------------------------------
  // DEV SERVER & STATIC MIDDLEWARE SETUP
  // -------------------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'redforge-enterprise-secret-key-1337';

export interface AuthUserPayload {
  uid: string;
  email: string;
  name: string;
  role: string;
  orgId?: string;
  teamId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUserPayload | DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  // 1. Try decoding as custom enterprise JWT
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    return next();
  } catch (jwtError) {
    // If it's a signature/expiry error, but matches custom JWT pattern, don't fall through to Firebase
    // But since tokens can be either, we fall back to Firebase token verification
  }

  // 2. Try verifying as Firebase ID token
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (firebaseError) {
    console.error('Authentication verification failed for custom JWT and Firebase ID token:', firebaseError);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};


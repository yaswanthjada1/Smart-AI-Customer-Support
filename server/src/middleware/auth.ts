import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';
import { query } from '../db';
import { User } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateFirebaseUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header. Expected Bearer <token>.' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1].trim();
  if (!idToken) {
    res.status(401).json({ error: 'Missing authentication token.' });
    return;
  }

  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    const userEmail = decoded.email || `${decoded.uid}@example.com`;
    const userDisplayName = decoded.name || userEmail.split('@')[0];

    // Atomic find/create or sync application user in PostgreSQL
    const upsertRes = await query<User>(
      `INSERT INTO users (firebase_uid, email, display_name, photo_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (firebase_uid) DO UPDATE
       SET email = EXCLUDED.email,
           display_name = COALESCE(EXCLUDED.display_name, users.display_name),
           photo_url = COALESCE(EXCLUDED.photo_url, users.photo_url)
       RETURNING id, firebase_uid, email, display_name, photo_url, created_at`,
      [decoded.uid, userEmail, userDisplayName, decoded.picture || null]
    );

    req.user = upsertRes.rows[0];
    next();
  } catch (err: any) {
    console.error('[authenticateFirebaseUser Error]', err.message);
    res.status(401).json({ error: 'Unauthorized: ' + (err.message || 'Token verification failed.') });
  }
}

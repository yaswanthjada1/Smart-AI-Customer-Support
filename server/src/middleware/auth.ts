import { Request, Response, NextFunction } from 'express';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';
import { query } from '../db';
import { User } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authenticateFirebaseUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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
    
    // Find or create application user
    const existingUser = await query<User>(
      'SELECT id, firebase_uid, email, display_name, photo_url, created_at FROM users WHERE firebase_uid = $1 LIMIT 1',
      [decoded.uid]
    );

    let user: User;
    if (existingUser.rows.length > 0) {
      user = existingUser.rows[0];
      // Update display_name / photo_url if provided and changed
      if (decoded.name && decoded.name !== user.display_name) {
        await query(
          'UPDATE users SET display_name = $1, photo_url = COALESCE($2, photo_url) WHERE id = $3',
          [decoded.name, decoded.picture || null, user.id]
        );
        user.display_name = decoded.name;
      }
    } else {
      const newUser = await query<User>(
        `INSERT INTO users (firebase_uid, email, display_name, photo_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, firebase_uid, email, display_name, photo_url, created_at`,
        [decoded.uid, decoded.email, decoded.name || null, decoded.picture || null]
      );
      user = newUser.rows[0];
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: ' + (err.message || 'Token verification failed.') });
  }
}

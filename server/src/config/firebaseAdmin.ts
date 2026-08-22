import admin from 'firebase-admin';
import { config } from './env';

let isFirebaseInitialized = false;

export function getFirebaseAdmin() {
  if (!isFirebaseInitialized) {
    if (config.firebase.clientEmail && config.firebase.privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.firebase.projectId,
            clientEmail: config.firebase.clientEmail,
            privateKey: config.firebase.privateKey,
          }),
          storageBucket: config.firebase.storageBucket || undefined,
        });
        isFirebaseInitialized = true;
        console.log('[Firebase Admin] Initialized with service account credentials.');
      } catch (err: any) {
        console.warn('[Firebase Admin] Failed to initialize with provided service account:', err.message);
      }
    } else {
      console.log('[Firebase Admin] Service account not configured. Dev/test auth mode enabled.');
    }
  }
  return admin;
}

export async function verifyFirebaseIdToken(token: string): Promise<{ uid: string; email: string; name?: string; picture?: string }> {
  const adminApp = getFirebaseAdmin();

  // If live Firebase credentials are active, verify with Firebase Admin SDK
  if (isFirebaseInitialized) {
    const decoded = await adminApp.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email || `${decoded.uid}@example.com`,
      name: decoded.name,
      picture: decoded.picture,
    };
  }

  // Development / Test token verification fallback
  // Accepts 'dev-token-<uid>' or basic JSON web token or mock payload
  if (token.startsWith('dev-token-') || token.startsWith('mock-')) {
    const uid = token.replace('dev-token-', '').replace('mock-', '');
    return {
      uid,
      email: `${uid}@example.com`,
      name: `User ${uid.substring(0, 5)}`,
    };
  }

  // Check if token is a base64 JWT payload we can inspect for dev
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.user_id || payload.sub || payload.uid) {
        return {
          uid: payload.user_id || payload.sub || payload.uid,
          email: payload.email || 'user@example.com',
          name: payload.name,
          picture: payload.picture,
        };
      }
    }
  } catch (e) {
    // Ignore and fail below
  }

  throw new Error('Invalid or unverified Firebase ID token.');
}

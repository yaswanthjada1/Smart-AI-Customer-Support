import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDF1tp_nkMUyiT-9Z5WF205XlGMTj1hKZ4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-ai-customer-suppor-24d0e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smart-ai-customer-suppor-24d0e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-ai-customer-suppor-24d0e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "58034439041",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:58034439041:web:e35678f28f4fc737549e80",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JQKY8Y7PYB",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
};

export type { FirebaseUser };

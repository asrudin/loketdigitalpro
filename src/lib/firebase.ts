/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support both local development config and environment variables for GitHub/Vercel/production support
const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig?.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig?.appId,
};

const customDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfig as any)?.firestoreDatabaseId;

// Initialize Firebase
const app = initializeApp(resolvedConfig);
export const auth = getAuth(app);

let firestoreInstance: any;
try {
  const settings = {
    experimentalForceLongPolling: true,
  };
  if (customDbId) {
    firestoreInstance = initializeFirestore(app, settings, customDbId);
  } else {
    firestoreInstance = initializeFirestore(app, settings);
  }
} catch (e) {
  console.error("Failed to initialize custom Firestore database, falling back to default:", e);
  try {
    firestoreInstance = initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch (err2) {
    console.error("Failed to initialize default Firestore:", err2);
  }
}

export const db = firestoreInstance;


const provider = new GoogleAuthProvider();
// Add required Google Drive scopes
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('firebase_cached_drive_token');

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken || "");
      }
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('firebase_cached_drive_token');
      
      // Fallback to custom persistent local device ID for seamless automated cloud sync
      let cloudUserId = localStorage.getItem('cloud_user_id');
      if (!cloudUserId || cloudUserId === 'loket-desa-sukomaju-db') {
        cloudUserId = 'loket-desa-gemblengan-db';
        localStorage.setItem('cloud_user_id', cloudUserId);
      }
      
      if (onAuthSuccess) {
        onAuthSuccess({
          uid: cloudUserId,
          isAnonymous: true,
          displayName: 'Loket Digital',
          email: 'otomatis@loket.digital'
        } as any, "");
      }
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('firebase_cached_drive_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('firebase_cached_drive_token');
};

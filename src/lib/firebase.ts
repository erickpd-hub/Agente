import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  deleteDoc,
  Firestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { PlatformUser, Message, UploadedFile } from '../types';

// Firebase configuration — values injected by Vite (import.meta.env) at build time
const env = (import.meta as any).env || {};

const firebaseConfig = {
  projectId:         env.VITE_FIREBASE_PROJECT_ID          || "",
  appId:             env.VITE_FIREBASE_APP_ID              || "",
  apiKey:            env.VITE_FIREBASE_API_KEY             || "",
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN         || "",
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET      || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
};

// Separate: custom Firestore database id (not part of the base config object)
const firestoreDatabaseId = env.VITE_FIREBASE_DATABASE_ID || "(default)";

// Guard: check required Firebase config values
const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;
const missingKeys = requiredKeys.filter(k => !firebaseConfig[k]);

if (missingKeys.length > 0) {
  console.warn('[Firebase] Missing env variables:', missingKeys.join(', '),
    '— Firebase features will be unavailable. Set VITE_* env vars in Vercel dashboard.');
}

// --- Lazy initialization to prevent crashes when env vars are missing ---
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _initAttempted = false;

function initFirebase(): boolean {
  if (_initAttempted) return _app !== null;
  _initAttempted = true;

  if (missingKeys.length > 0) {
    console.warn('[Firebase] Skipping initialization — missing required config keys.');
    return false;
  }

  try {
    _app = initializeApp(firebaseConfig);
    _db = getFirestore(_app, firestoreDatabaseId);
    _auth = getAuth(_app);
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to initialize:', err);
    _app = null;
    _db = null;
    _auth = null;
    return false;
  }
}

/** Returns the Firestore instance, or null if Firebase is not configured. */
export function getDb(): Firestore | null {
  initFirebase();
  return _db;
}

/** Returns the Auth instance, or null if Firebase is not configured. */
export function getFirebaseAuth(): Auth | null {
  initFirebase();
  return _auth;
}

// Legacy exports for backward compatibility (may be null)
export const db = null as Firestore | null; // Use getDb() instead
export const auth = null as Auth | null;     // Use getFirebaseAuth() instead

// --- Error Handler for Firestore ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const authInstance = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid || null,
      email: authInstance?.currentUser?.email || null,
      emailVerified: authInstance?.currentUser?.emailVerified || null,
      isAnonymous: authInstance?.currentUser?.isAnonymous || null,
      tenantId: authInstance?.currentUser?.tenantId || null,
      providerInfo: authInstance?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Helper: get db or return null with warning ---
function requireDb(operation: string): Firestore | null {
  const database = getDb();
  if (!database) {
    console.warn(`[Firebase] Cannot perform "${operation}" — Firebase is not configured.`);
  }
  return database;
}

// --- Platform Users (Shared/Admin management) ---
export async function loadPlatformUsers(): Promise<PlatformUser[] | null> {
  const database = requireDb('loadPlatformUsers');
  if (!database) return null;

  const path = 'platform_users';
  try {
    const q = query(collection(database, path));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const list: PlatformUser[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as PlatformUser);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function savePlatformUsers(users: PlatformUser[]): Promise<void> {
  const database = requireDb('savePlatformUsers');
  if (!database) return;

  const path = 'platform_users';
  try {
    // Save each user as an individual document to make it queryable/manageable
    for (const u of users) {
      const userRef = doc(database, path, u.id);
      await setDoc(userRef, u, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePlatformUserFromDb(userId: string): Promise<void> {
  const database = requireDb('deletePlatformUserFromDb');
  if (!database) return;

  const path = `platform_users/${userId}`;
  try {
    const userRef = doc(database, 'platform_users', userId);
    await deleteDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- User Profile (Private per user email) ---
export interface UserProfileData {
  name: string;
  email: string;
  phone: string;
  language: string;
  timeZone: string;
  twoFactor: boolean;
  notifyEmail: boolean;
  notifySystem: boolean;
  notifySound: boolean;
}

export async function loadUserProfile(email: string): Promise<UserProfileData | null> {
  const database = requireDb('loadUserProfile');
  if (!database) return null;

  const path = `user_profiles/${email.toLowerCase()}`;
  try {
    const docRef = doc(database, 'user_profiles', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(email: string, profile: UserProfileData): Promise<void> {
  const database = requireDb('saveUserProfile');
  if (!database) return;

  const path = `user_profiles/${email.toLowerCase()}`;
  try {
    const docRef = doc(database, 'user_profiles', email.toLowerCase());
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- User Chats (Private per user email) ---
export async function loadUserChats(email: string): Promise<any[] | null> {
  const database = requireDb('loadUserChats');
  if (!database) return null;

  const path = `user_chats/${email.toLowerCase()}`;
  try {
    const docRef = doc(database, 'user_chats', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.chats || [];
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserChats(email: string, chats: any[]): Promise<void> {
  const database = requireDb('saveUserChats');
  if (!database) return;

  const path = `user_chats/${email.toLowerCase()}`;
  try {
    const docRef = doc(database, 'user_chats', email.toLowerCase());
    await setDoc(docRef, { chats }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- User Knowledge Base (Private per user email) ---
export async function loadUserKnowledgeBase(email: string): Promise<UploadedFile[] | null> {
  const database = requireDb('loadUserKnowledgeBase');
  if (!database) return null;

  const path = `user_knowledge_base/${email.toLowerCase()}`;
  try {
    const docRef = doc(database, 'user_knowledge_base', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.files || [];
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserKnowledgeBase(email: string, files: UploadedFile[]): Promise<void> {
  const database = requireDb('saveUserKnowledgeBase');
  if (!database) return;

  const path = `user_knowledge_base/${email.toLowerCase()}`;
  try {
    const docRef = doc(database, 'user_knowledge_base', email.toLowerCase());
    await setDoc(docRef, { files }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { PlatformUser, Message, UploadedFile } from '../types';

// Firebase configuration (supports VITE_ environment overrides for production/Vercel)
const firebaseConfig = {
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "",
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "",
  firestoreDatabaseId: (import.meta as any).env.VITE_FIREBASE_DATABASE_ID || "",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || ""
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// --- Error Handler for Firestore (As requested by skill) ---
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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

// --- Platform Users (Shared/Admin management) ---
export async function loadPlatformUsers(): Promise<PlatformUser[] | null> {
  const path = 'platform_users';
  try {
    const q = query(collection(db, path));
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
  const path = 'platform_users';
  try {
    // Save each user as an individual document to make it queryable/manageable
    for (const u of users) {
      const userRef = doc(db, path, u.id);
      await setDoc(userRef, u, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePlatformUserFromDb(userId: string): Promise<void> {
  const path = `platform_users/${userId}`;
  try {
    const userRef = doc(db, 'platform_users', userId);
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
  const path = `user_profiles/${email.toLowerCase()}`;
  try {
    const docRef = doc(db, 'user_profiles', email.toLowerCase());
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
  const path = `user_profiles/${email.toLowerCase()}`;
  try {
    const docRef = doc(db, 'user_profiles', email.toLowerCase());
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- User Chats (Private per user email) ---
export async function loadUserChats(email: string): Promise<any[] | null> {
  const path = `user_chats/${email.toLowerCase()}`;
  try {
    const docRef = doc(db, 'user_chats', email.toLowerCase());
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
  const path = `user_chats/${email.toLowerCase()}`;
  try {
    const docRef = doc(db, 'user_chats', email.toLowerCase());
    await setDoc(docRef, { chats }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- User Knowledge Base (Private per user email) ---
export async function loadUserKnowledgeBase(email: string): Promise<UploadedFile[] | null> {
  const path = `user_knowledge_base/${email.toLowerCase()}`;
  try {
    const docRef = doc(db, 'user_knowledge_base', email.toLowerCase());
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
  const path = `user_knowledge_base/${email.toLowerCase()}`;
  try {
    const docRef = doc(db, 'user_knowledge_base', email.toLowerCase());
    await setDoc(docRef, { files }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

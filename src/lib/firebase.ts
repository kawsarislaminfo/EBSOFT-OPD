import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, signOut, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Import the provisioned config
import firebaseConfigJson from "../../firebase-applet-config.json";

export const firebaseConfig: FirebaseOptions = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== "undefined") ? import.meta.env.VITE_FIREBASE_API_KEY : firebaseConfigJson.apiKey,
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN !== "undefined") ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : firebaseConfigJson.authDomain,
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_PROJECT_ID !== "undefined") ? import.meta.env.VITE_FIREBASE_PROJECT_ID : firebaseConfigJson.projectId,
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET !== "undefined") ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : firebaseConfigJson.storageBucket,
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID !== "undefined") ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : firebaseConfigJson.messagingSenderId,
  appId: (import.meta.env.VITE_FIREBASE_APP_ID && import.meta.env.VITE_FIREBASE_APP_ID !== "undefined") ? import.meta.env.VITE_FIREBASE_APP_ID : firebaseConfigJson.appId,
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID !== "undefined") ? import.meta.env.VITE_FIREBASE_MEASUREMENT_ID : firebaseConfigJson.measurementId,
};

// Only initialize if we have a valid API key to prevent crashes
export const isConfigured = !!firebaseConfig.apiKey && 
                           firebaseConfig.apiKey !== "undefined" && 
                           firebaseConfig.apiKey !== "" &&
                           !firebaseConfig.apiKey.includes("YOUR_") &&
                           !firebaseConfig.apiKey.includes("remixed-") &&
                           !firebaseConfig.apiKey.includes("TODO_");

export const getMissingVars = () => {
  const missing = [];
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("remixed-") || firebaseConfig.apiKey.includes("TODO_")) missing.push("VITE_FIREBASE_API_KEY");
  if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes("remixed-")) missing.push("VITE_FIREBASE_AUTH_DOMAIN");
  if (!firebaseConfig.projectId || firebaseConfig.projectId.includes("remixed-")) missing.push("VITE_FIREBASE_PROJECT_ID");
  if (!firebaseConfig.appId || firebaseConfig.appId.includes("remixed-")) missing.push("VITE_FIREBASE_APP_ID");
  return missing;
};

export const app = isConfigured 
  ? (getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)) 
  : null;

export { initializeApp, signOut, signInWithPopup };

// Use getFirestore with the specific database ID from config, allowing override via env var
const firestoreDatabaseId = (import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID && import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID !== "undefined")
  ? import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
  : firebaseConfigJson.firestoreDatabaseId;

export const db = app ? getFirestore(app, firestoreDatabaseId) : null as any;

// Use getAuth for safer initialization
export const auth = app ? getAuth(app) : null as any;

if (auth) {
  indexedDBLocalPersistence; // Reference to ensure it's available
}

export const storage = app ? getStorage(app) : null as any;

// Error Handling Spec for Firestore Permissions
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo = {
    error: errorMessage,
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    }
  };
  
  console.error('Firestore Error: ', errInfo);
  
  // Only throw the JSON string if it's a permission error or similar
  // to help the agent diagnose issues.
  if (errorMessage.includes('insufficient permissions') || errorMessage.includes('permission-denied')) {
    const safeStringify = (obj: any) => {
      try {
        const cache = new WeakSet();
        return JSON.stringify(obj, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
              return;
            }
            cache.add(value);
            
            // Handle Firestore Timestamp
            if (value.seconds !== undefined && value.nanoseconds !== undefined && typeof value.toDate === 'function') {
              return value.toDate().toISOString();
            }
            
            // Handle Firestore DocumentReference
            if (typeof value.path === 'string' && typeof value.id === 'string' && value.firestore) {
              return `ref:${value.path}`;
            }
          }
          return value;
        });
      } catch (e) {
        return JSON.stringify({ error: 'Could not stringify object', message: e instanceof Error ? e.message : String(e) });
      }
    };

    throw new Error(safeStringify(errInfo));
  }
  
  throw error;
}

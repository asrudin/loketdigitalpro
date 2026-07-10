import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';

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

/**
 * Generates a stable, canonical JSON string representation of an object,
 * sorting keys alphabetically and ignoring undefined/null values.
 */
export function canonicalStringify(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalStringify(item)).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const parts = keys
    .map(key => {
      const val = obj[key];
      if (val === undefined || typeof val === 'function') return null;
      return `${JSON.stringify(key)}:${canonicalStringify(val)}`;
    })
    .filter(Boolean);
  return '{' + parts.join(',') + '}';
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Sync Error: ', JSON.stringify(errInfo));
  if (operationType === OperationType.WRITE) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export interface CloudDbState {
  users: any[];
  areas: any[];
  pelanggan: any[];
  tagihan: any[];
  cashFlow: any[];
  budgets: any[];
}

/**
 * Saves the current application state to Firestore under userStates/{userId}
 */
export async function saveStateToFirestore(userId: string, state: CloudDbState): Promise<void> {
  const docPath = `userStates/${userId}`;
  try {
    const docRef = doc(db, 'userStates', userId);
    // Sanitize state to remove undefined values which Firestore does not support
    const sanitizedState = JSON.parse(JSON.stringify(state));
    await setDoc(docRef, {
      ...sanitizedState,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

/**
 * Retrieves the application state from Firestore
 */
export async function getStateFromFirestore(userId: string): Promise<CloudDbState | null> {
  const docPath = `userStates/${userId}`;
  try {
    const docRef = doc(db, 'userStates', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        users: data.users || [],
        areas: data.areas || [],
        pelanggan: data.pelanggan || [],
        tagihan: data.tagihan || [],
        cashFlow: data.cashFlow || [],
        budgets: data.budgets || []
      };
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, docPath);
    return null;
  }
}

/**
 * Merges local and cloud state by matching IDs and preferring the newer record or concatenating lists uniquely
 */
export function mergeStates(local: CloudDbState, cloud: CloudDbState): CloudDbState {
  const mergeList = (localList: any[], cloudList: any[]) => {
    const map = new Map<string, any>();
    // Add local records
    localList.forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
    // Add cloud records (which will overwrite local if IDs match, or we can resolve smartly)
    cloudList.forEach(item => {
      if (item && item.id) {
        // If it exists in both, we can just let cloud take precedence or merge
        map.set(item.id, item);
      }
    });
    return Array.from(map.values());
  };

  return {
    users: mergeList(local.users, cloud.users),
    areas: mergeList(local.areas, cloud.areas),
    pelanggan: mergeList(local.pelanggan, cloud.pelanggan),
    tagihan: mergeList(local.tagihan, cloud.tagihan),
    cashFlow: mergeList(local.cashFlow, cloud.cashFlow),
    budgets: mergeList(local.budgets, cloud.budgets)
  };
}

/**
 * Subscribes to real-time state changes from Firestore
 */
export function subscribeStateFromFirestore(
  userId: string,
  onUpdate: (state: CloudDbState, exists: boolean) => void,
  onError: (error: any) => void
) {
  const docPath = `userStates/${userId}`;
  const docRef = doc(db, 'userStates', userId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          users: data.users || [],
          areas: data.areas || [],
          pelanggan: data.pelanggan || [],
          tagihan: data.tagihan || [],
          cashFlow: data.cashFlow || [],
          budgets: data.budgets || []
        }, true);
      } else {
        // Document does not exist yet
        onUpdate({
          users: [],
          areas: [],
          pelanggan: [],
          tagihan: [],
          cashFlow: [],
          budgets: []
        }, false);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, docPath);
      onError(err);
    }
  );
}


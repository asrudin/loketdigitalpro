import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  throw new Error(JSON.stringify(errInfo));
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

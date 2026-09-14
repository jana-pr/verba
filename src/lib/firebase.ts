import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyC96nG9NYlSFU1GXzQUVKyIbbGixZ38wVs',
  authDomain: 'futro-app.firebaseapp.com',
  projectId: 'futro-app',
  storageBucket: 'futro-app.firebasestorage.app',
  messagingSenderId: '841177435447',
  appId: '1:841177435447:web:44e0c239721e3d853e9eb2',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestoreDb = getFirestore(app);

export const FIRESTORE_COLLECTION = 'verba';
export const FIRESTORE_DOC_ID = 'user_data';

export interface CloudUserData {
  version?: string;
  lastUpdated?: string;
  courses?: any[];
  states?: any[];
  attemptLogs?: any[];
  deletedCourseIds?: string[];
  activeCourseId?: string;
  openedCourseIds?: string[];
}

/**
 * Uloží stav uživatele do Google Cloud Firestore (trvalá perzistence napříč redeployi i zařízeními)
 */
export async function saveUserDataToCloud(data: Partial<CloudUserData>): Promise<boolean> {
  try {
    const docRef = doc(firestoreDb, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    const sanitized = JSON.parse(
      JSON.stringify({
        ...data,
        lastUpdated: new Date().toISOString(),
      })
    );
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Firebase Firestore] Failed to save state to cloud:', err);
    return false;
  }
}

/**
 * Načte kompletní stav uživatele z Google Cloud Firestore
 */
export async function pullUserDataFromCloud(): Promise<CloudUserData | null> {
  try {
    const docRef = doc(firestoreDb, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as CloudUserData;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase Firestore] Direct pull failed:', err);
    return null;
  }
}

/**
 * Přihlásí realtime poslech změn pro okamžitou synchronizaci (např. mezi PC a mobilem)
 */
export function subscribeToCloudData(
  onDataReceived: (data: CloudUserData) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const docRef = doc(firestoreDb, FIRESTORE_COLLECTION, FIRESTORE_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onDataReceived(snapshot.data() as CloudUserData);
        }
      },
      (err) => {
        console.warn('[Firebase Firestore] Realtime sync error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('[Firebase Firestore] Subscription failed:', err);
    if (onError) onError(err);
    return () => {};
  }
}

import { initializeApp } from 'firebase/app';
import {
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../constants/firebase.js';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function initAnonymousAuth(callback, onError = console.error) {
  let anonymousSignInPending = false;

  return onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      callback(currentUser);
      return;
    }

    if (anonymousSignInPending) return;
    anonymousSignInPending = true;

    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInAnonymously(auth);
    } catch (error) {
      onError(error);
    } finally {
      anonymousSignInPending = false;
    }
  }, onError);
}

export async function signInTeacherWithGoogle() {
  await setPersistence(auth, browserSessionPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return credential.user;
}

export function signOutFirebaseUser() {
  return signOut(auth);
}

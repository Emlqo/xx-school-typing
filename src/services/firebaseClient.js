import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../constants/firebase.js';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function initAnonymousAuth(callback) {
  signInAnonymously(auth).catch((error) => console.error(error));
  return onAuthStateChanged(auth, callback);
}

import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

export default function useDuelSettings({ user, enabled = true }) {
  const [duelEnabled, setDuelEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db) {
      setDuelEnabled(true);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    setIsLoading(true);
    const settingsRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.settings, 'duel');
    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        setDuelEnabled(!snapshot.exists() || snapshot.data()?.enabled !== false);
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setDuelEnabled(false);
        setIsLoading(false);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, user]);

  return { duelEnabled, isLoading, error };
}

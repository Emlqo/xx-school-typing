import { useEffect, useState } from 'react';
import { limit, onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
};

export default function useTeacherLiveDuels({ user, view, enabled = true }) {
  const [duels, setDuels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db || view !== 'teacher') {
      setDuels([]);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    setIsLoading(true);
    const duelsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.duels);
    const liveQuery = query(duelsRef, where('status', '==', 'playing'), limit(20));
    const unsubscribe = onSnapshot(
      liveQuery,
      (snapshot) => {
        const nextDuels = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }))
          .sort((a, b) => toMillis(b.startsAt) - toMillis(a.startsAt));
        setDuels(nextDuels);
        setIsLoading(false);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setDuels([]);
        setIsLoading(false);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, user, view]);

  return { duels, isLoading, error };
}

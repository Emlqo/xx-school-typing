import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

export default function useDuel({ user, duelId = '', enabled = true }) {
  const [duel, setDuel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db || !duelId) {
      setDuel(null);
      return undefined;
    }
    return onSnapshot(
      getPublicDoc(db, APP_ID, FIRESTORE_PATHS.duels, duelId),
      (snapshot) => {
        setDuel(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );
  }, [duelId, enabled, user]);

  return { duel, error };
}

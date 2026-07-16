import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

export default function useDuelScores({ user, duel = null, enabled = true }) {
  const [duelScores, setDuelScores] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const scoreIds = [duel?.challengerScoreId, duel?.targetScoreId].filter(Boolean);
    if (!enabled || !user || !db || scoreIds.length !== 2) {
      setDuelScores([]);
      return undefined;
    }

    const scoresById = new Map();
    const unsubscribes = scoreIds.map((scoreId) => onSnapshot(
      getPublicDoc(db, APP_ID, FIRESTORE_PATHS.duelScores, scoreId),
      (snapshot) => {
        if (snapshot.exists()) scoresById.set(snapshot.id, { id: snapshot.id, ...snapshot.data() });
        else scoresById.delete(snapshot.id);
        setDuelScores([...scoresById.values()]);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    ));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [duel?.challengerScoreId, duel?.targetScoreId, enabled, user]);

  return { duelScores, error };
}

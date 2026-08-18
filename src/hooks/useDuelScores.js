import { useEffect, useState } from 'react';
import { getDoc, onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getDuelScoreReadPlan } from '../utils/duel.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

export default function useDuelScores({
  user,
  duel = null,
  viewerStudentId = '',
  enabled = true,
}) {
  const [duelScores, setDuelScores] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { scoreIds, ownScoreId, realtimeScoreIds } = getDuelScoreReadPlan(duel, viewerStudentId);
    if (!enabled || !user || !db || scoreIds.length !== 2) {
      setDuelScores([]);
      return undefined;
    }

    const scoresById = new Map();
    const publishScores = () => setDuelScores([...scoresById.values()]);
    const handleError = (snapshotError) => {
      console.error(snapshotError);
      setError(snapshotError);
    };
    let cancelled = false;

    if (ownScoreId) {
      getDoc(getPublicDoc(db, APP_ID, FIRESTORE_PATHS.duelScores, ownScoreId))
        .then((snapshot) => {
          if (cancelled) return;
          if (snapshot.exists()) scoresById.set(snapshot.id, { id: snapshot.id, ...snapshot.data() });
          else scoresById.delete(snapshot.id);
          publishScores();
          setError(null);
        })
        .catch((snapshotError) => {
          if (!cancelled) handleError(snapshotError);
        });
    }

    const unsubscribes = realtimeScoreIds.map((scoreId) => onSnapshot(
      getPublicDoc(db, APP_ID, FIRESTORE_PATHS.duelScores, scoreId),
      (snapshot) => {
        if (snapshot.exists()) scoresById.set(snapshot.id, { id: snapshot.id, ...snapshot.data() });
        else scoresById.delete(snapshot.id);
        publishScores();
        setError(null);
      },
      handleError,
    ));

    return () => {
      cancelled = true;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    duel?.challengerScoreId,
    duel?.challengerStudentId,
    duel?.targetScoreId,
    duel?.targetStudentId,
    enabled,
    user,
    viewerStudentId,
  ]);

  return { duelScores, error };
}

import { useCallback, useMemo, useState } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

function getMonthRange(monthKey) {
  const [yearText, monthText] = String(monthKey || '').split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month || month < 1 || month > 12) {
    const now = new Date();
    return {
      monthStart: new Date(now.getFullYear(), now.getMonth(), 1),
      nextMonthStart: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  }

  return {
    monthStart: new Date(year, month - 1, 1),
    nextMonthStart: new Date(year, month, 1),
  };
}

export default function useMonthlyScores({
  user,
  view,
  monthKey,
  isPracticeMode = false,
  enabled = true,
}) {
  const [monthlyScores, setMonthlyScores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { monthStart, nextMonthStart } = useMemo(() => getMonthRange(monthKey), [monthKey]);

  const refreshMonthlyScores = useCallback(async () => {
    if (!enabled || !user || !db || view !== 'teacher' || isPracticeMode) {
      setMonthlyScores([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const scoresRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores);
      const monthlyScoresQuery = query(
        scoresRef,
        where('createdAt', '>=', monthStart),
        where('createdAt', '<', nextMonthStart),
      );
      const snapshot = await getDocs(monthlyScoresQuery);
      const nextScores = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMonthlyScores(nextScores);
      return nextScores;
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isPracticeMode, monthStart, nextMonthStart, user, view]);

  return {
    monthlyScores,
    monthStart,
    nextMonthStart,
    refreshMonthlyScores,
    isLoading,
    error,
  };
}

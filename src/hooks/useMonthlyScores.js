import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { calculateHallOfFame } from '../utils/hallOfFame.js';
import { getPublicCollection, getPublicDoc } from '../utils/firestoreRefs.js';

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

function compactRankingItem(item = {}) {
  return {
    classId: String(item.classId || ''),
    className: String(item.className || ''),
    studentId: String(item.studentId || ''),
    nickname: String(item.nickname || ''),
    value: Number(item.value || 0),
    totalScore: Number(item.totalScore || 0),
    totalQuizCorrectCount: Number(item.totalQuizCorrectCount || 0),
    maxCpm: Number(item.maxCpm || 0),
    gamesPlayed: Number(item.gamesPlayed || 0),
    bestScore: Number(item.bestScore || 0),
    bestCpm: Number(item.bestCpm || 0),
    achievedAt: Number(item.achievedAt || 0),
    firstScore: Number(item.firstScore || 0),
    lastScore: Number(item.lastScore || 0),
    growth: Number(item.growth || 0),
  };
}

function compactHallOfFame(hallOfFame = {}) {
  const compactList = (items) => (Array.isArray(items) ? items.map(compactRankingItem) : []);

  return {
    classMvp: compactList(hallOfFame.classMvp),
    quizKing: compactList(hallOfFame.quizKing),
    speedKing: compactList(hallOfFame.speedKing),
    participationKing: compactList(hallOfFame.participationKing),
    growthKing: compactList(hallOfFame.growthKing),
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
  const [savedHallOfFame, setSavedHallOfFame] = useState(null);
  const [savedScoreCount, setSavedScoreCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { monthStart, nextMonthStart } = useMemo(() => getMonthRange(monthKey), [monthKey]);

  useEffect(() => {
    if (!enabled || !user || !db || view !== 'teacher' || isPracticeMode || !monthKey) {
      setMonthlyScores([]);
      setSavedHallOfFame(null);
      setSavedScoreCount(0);
      setLastSavedAt(null);
      return undefined;
    }

    let cancelled = false;

    const loadSavedHallOfFame = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const savedRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.hallOfFame, monthKey);
        const snapshot = await getDoc(savedRef);

        if (cancelled) return;
        if (!snapshot.exists()) {
          setMonthlyScores([]);
          setSavedHallOfFame(null);
          setSavedScoreCount(0);
          setLastSavedAt(null);
          return;
        }

        const savedData = snapshot.data();
        setMonthlyScores([]);
        setSavedHallOfFame(savedData.hallOfFame || null);
        setSavedScoreCount(
          Number(savedData.sourceScoreCount || 0) + Number(savedData.sourcePracticeCount || 0),
        );
        setLastSavedAt(savedData.updatedAt || null);
      } catch (loadError) {
        if (cancelled) return;
        console.error(loadError);
        setError(loadError);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadSavedHallOfFame();
    return () => {
      cancelled = true;
    };
  }, [enabled, isPracticeMode, monthKey, user, view]);

  const refreshMonthlyScores = useCallback(async () => {
    if (!enabled || !user || !db || view !== 'teacher' || isPracticeMode) {
      setMonthlyScores([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const scoresRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores);
      const practiceRecordsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.practiceRecords);
      const monthlyScoresQuery = query(
        scoresRef,
        where('createdAt', '>=', monthStart),
        where('createdAt', '<', nextMonthStart),
      );
      const monthlyPracticeQuery = query(
        practiceRecordsRef,
        where('createdAt', '>=', monthStart),
        where('createdAt', '<', nextMonthStart),
      );
      const [scoreSnapshot, practiceSnapshot] = await Promise.all([
        getDocs(monthlyScoresQuery),
        getDocs(monthlyPracticeQuery),
      ]);
      const nextScores = scoreSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const nextPracticeRecords = practiceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const nextHallOfFame = compactHallOfFame(
        calculateHallOfFame(nextScores, nextPracticeRecords),
      );
      const savedRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.hallOfFame, monthKey);

      setMonthlyScores(nextScores);
      setSavedHallOfFame(nextHallOfFame);
      setSavedScoreCount(nextScores.length + nextPracticeRecords.length);
      setLastSavedAt(Date.now());

      await setDoc(savedRef, {
        monthKey,
        hallOfFame: nextHallOfFame,
        sourceScoreCount: nextScores.length,
        sourcePracticeCount: nextPracticeRecords.length,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return nextScores;
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isPracticeMode, monthKey, monthStart, nextMonthStart, user, view]);

  return {
    monthlyScores,
    savedHallOfFame,
    savedScoreCount,
    lastSavedAt,
    monthStart,
    nextMonthStart,
    refreshMonthlyScores,
    isLoading,
    error,
  };
}

import { useEffect, useState } from 'react';
import { serverTimestamp, updateDoc } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { calculateCpm } from '../utils/scoring.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export default function useScoreSyncRequest({
  user,
  view,
  isPracticeMode,
  myRoomData,
  currentScoreDocId,
  score,
  correctChars,
  quizCorrectCount,
  gameDuration,
  gameInfoRef,
  lastProcessedSyncRef,
  lastSyncedScoreRef,
  enabled = true,
}) {
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db) return;
    if (view !== 'playing') return;
    if (isPracticeMode) return;
    if (!myRoomData?.syncRequestedAt || !currentScoreDocId) return;
    if (!lastProcessedSyncRef || !lastSyncedScoreRef) return;

    const requestedAt = toMillis(myRoomData.syncRequestedAt);
    if (!requestedAt || requestedAt <= (lastProcessedSyncRef?.current || 0)) return;

    lastProcessedSyncRef.current = requestedAt;
    if (score === lastSyncedScoreRef.current) return;

    const elapsedSeconds = gameInfoRef?.current?.elapsed || gameDuration || 0;
    const cpm = calculateCpm({ chars: correctChars, seconds: elapsedSeconds });
    const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, currentScoreDocId);

    updateDoc(scoreRef, {
      score,
      cpm,
      correctChars,
      quizCorrectCount,
      updatedAt: serverTimestamp(),
    })
      .then(() => {
        lastSyncedScoreRef.current = score;
        setError(null);
      })
      .catch((syncError) => {
        console.error(syncError);
        setError(syncError);
      });
  }, [
    correctChars,
    currentScoreDocId,
    enabled,
    gameDuration,
    gameInfoRef,
    isPracticeMode,
    lastProcessedSyncRef,
    lastSyncedScoreRef,
    myRoomData,
    quizCorrectCount,
    score,
    user,
    view,
  ]);

  return { error };
}

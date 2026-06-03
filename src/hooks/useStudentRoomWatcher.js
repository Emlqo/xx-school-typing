import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

function resolveGameMode(roomMode, difficulty) {
  if (difficulty === 'hell') return 'en';
  if (difficulty === 'hard') return 'mixed';
  return roomMode || 'ko';
}

export default function useStudentRoomWatcher({
  user,
  view,
  selectedRoomId,
  setView = () => {},
  setMyRoomData = () => {},
  currentScoreDocId,
  scores = [],
  quizzes = [],
  pendingQuizzesRef,
  wordCountRef,
  setGameMode = () => {},
  pickRandomWord = () => {},
  enabled = true,
}) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db || !selectedRoomId || view === 'teacher') {
      setRoom(null);
      return undefined;
    }

    const roomRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, selectedRoomId);
    const unsubscribeRoom = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRoom(null);
          setMyRoomData(null);
          return;
        }

        const roomData = { id: snapshot.id, ...snapshot.data() };
        setRoom(roomData);
        setMyRoomData(roomData);
        setError(null);

        if (roomData.status !== 'playing' || view !== 'waiting') return;

        const myScore = scores.find((score) => score.id === currentScoreDocId) || {};
        const myDifficulty = myScore.difficulty || 'normal';
        const gameMode = resolveGameMode(roomData.mode, myDifficulty);
        setGameMode(gameMode);

        if (pendingQuizzesRef) {
          pendingQuizzesRef.current = [...quizzes].sort(() => Math.random() - 0.5);
        }

        if (wordCountRef) {
          wordCountRef.current = 0;
        }

        pickRandomWord(gameMode, { practiceMode: false });
        setView('playing');
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribeRoom();
  }, [
    currentScoreDocId,
    enabled,
    pendingQuizzesRef,
    pickRandomWord,
    quizzes,
    scores,
    selectedRoomId,
    setGameMode,
    setMyRoomData,
    setView,
    user,
    view,
    wordCountRef,
  ]);

  return { room, error };
}

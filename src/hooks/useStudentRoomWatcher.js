import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';
import { createRoomQuizQueue } from '../utils/roomQuizzes.js';

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
  const shouldWatchRoom = view === 'waiting' || view === 'playing' || view === 'subway';

  useEffect(() => {
    if (!enabled || !user || !db || !selectedRoomId || !shouldWatchRoom) {
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
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribeRoom();
  }, [enabled, selectedRoomId, setMyRoomData, shouldWatchRoom, user]);

  useEffect(() => {
    if (!enabled || view !== 'waiting' || !room || room.id !== selectedRoomId || room.status !== 'playing') return;
    if (room.mode === 'subway') {
      setView('subway');
      return;
    }

    const myScore = scores.find((score) => score.id === currentScoreDocId);
    const gameMode = resolveGameMode(room.mode, myScore?.difficulty || 'normal');
    setGameMode(gameMode);
    if (pendingQuizzesRef) pendingQuizzesRef.current = createRoomQuizQueue(room, quizzes);
    if (wordCountRef) wordCountRef.current = 0;
    pickRandomWord(gameMode, { practiceMode: false });
    setView('playing');
  }, [
    currentScoreDocId,
    enabled,
    pendingQuizzesRef,
    pickRandomWord,
    quizzes,
    room,
    scores,
    selectedRoomId,
    setGameMode,
    setView,
    view,
    wordCountRef,
  ]);

  return { room, error };
}

import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useQuizzes({ user, view, isPracticeMode, isDuelMode = false, enabled = true }) {
  const [quizzes, setQuizzes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const isTeacherView = view === 'teacher';
    const isRealtimeGameView = !isPracticeMode
      && !isDuelMode
      && (view === 'waiting' || view === 'playing');

    if (!enabled || !user || !db || (!isTeacherView && !isRealtimeGameView)) {
      setQuizzes([]);
      return undefined;
    }

    const quizzesRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.quizzes);
    const unsubscribe = onSnapshot(
      quizzesRef,
      (snapshot) => {
        setQuizzes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, isDuelMode, isPracticeMode, user, view]);

  return { quizzes, error };
}

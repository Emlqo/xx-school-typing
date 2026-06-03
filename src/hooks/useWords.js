import { useEffect, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useWords({
  user,
  view,
  isPracticeMode = false,
  enabled = true,
}) {
  const [words, setWords] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canSubscribeWords = view === 'teacher' || (view === 'playing' && !isPracticeMode);

    if (!enabled || !user || !db || !canSubscribeWords || isPracticeMode) {
      setWords([]);
      return undefined;
    }

    const wordsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.words);
    const wordsQuery = query(wordsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      wordsQuery,
      (snapshot) => {
        setWords(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, isPracticeMode, user, view]);

  return { words, error };
}

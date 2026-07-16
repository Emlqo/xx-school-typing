import { useEffect, useState } from 'react';
import { onSnapshot, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useClasses({
  user,
  view,
  isPracticeMode = false,
  enabled = true,
}) {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canSubscribe = view === 'teacher' || view === 'studentLogin' || view === 'duelChallenge';
    if (!enabled || !user || !db || !canSubscribe || isPracticeMode) {
      setClasses([]);
      return undefined;
    }

    const classesRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classes);
    const classesQuery = query(classesRef);
    const unsubscribe = onSnapshot(
      classesQuery,
      (snapshot) => {
        const nextClasses = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const gradeDiff = Number(a.grade || 0) - Number(b.grade || 0);
            if (gradeDiff !== 0) return gradeDiff;
            const classDiff = Number(a.classNumber || 0) - Number(b.classNumber || 0);
            if (classDiff !== 0) return classDiff;
            return String(a.name || '').localeCompare(String(b.name || ''));
          });
        setClasses(nextClasses);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, isPracticeMode, user, view]);

  return { classes, error };
}

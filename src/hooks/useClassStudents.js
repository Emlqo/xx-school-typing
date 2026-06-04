import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { normalizeClassStudent } from '../utils/classStudents.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useClassStudents({
  user,
  view,
  classId = '',
  isPracticeMode = false,
  enabled = true,
}) {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canSubscribe = view === 'teacher' || view === 'studentLobby';

    if (!enabled || !user || !db || !classId || !canSubscribe || isPracticeMode) {
      setStudents([]);
      return undefined;
    }

    const studentsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classStudents);
    const studentsQuery = query(
      studentsRef,
      where('classId', '==', classId),
      where('active', '==', true),
    );
    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const nextStudents = snapshot.docs
          .map((doc) => normalizeClassStudent({ id: doc.id, ...doc.data() }))
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setStudents(nextStudents);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [classId, enabled, isPracticeMode, user, view]);

  return { students, error };
}

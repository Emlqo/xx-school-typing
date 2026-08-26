import { useEffect, useState } from 'react';
import { getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getCachedStudentDirectory } from '../services/studentDirectoryCache.js';
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
    const canSubscribe = view === 'teacher' || view === 'studentLogin' || view === 'duelChallenge';

    if (!enabled || !user || !db || !classId || !canSubscribe || isPracticeMode) {
      setStudents([]);
      return undefined;
    }

    const collectionName = view === 'teacher'
      ? FIRESTORE_PATHS.classStudents
      : FIRESTORE_PATHS.classRoster;
    const studentsRef = getPublicCollection(db, APP_ID, collectionName);
    const studentsQuery = query(
      studentsRef,
      where('classId', '==', classId),
      where('active', '==', true),
    );
    const applySnapshot = (snapshot) => {
      const nextStudents = snapshot.docs
        .map((doc) => normalizeClassStudent({ id: doc.id, ...doc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setStudents(nextStudents);
      setError(null);
    };
    const handleError = (snapshotError) => {
      console.error(snapshotError);
      setError(snapshotError);
    };

    if (view !== 'teacher') {
      let cancelled = false;
      const cacheKey = `${user.uid}:class-students:${classId}`;
      getCachedStudentDirectory(cacheKey, () => getDocs(studentsQuery).then((snapshot) => (
        snapshot.docs
          .map((doc) => normalizeClassStudent({ id: doc.id, ...doc.data() }))
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      )))
        .then((nextStudents) => {
          if (!cancelled) {
            setStudents(nextStudents);
            setError(null);
          }
        })
        .catch((snapshotError) => {
          if (!cancelled) handleError(snapshotError);
        });
      return () => {
        cancelled = true;
      };
    }

    const unsubscribe = onSnapshot(studentsQuery, applySnapshot, handleError);

    return () => unsubscribe();
  }, [classId, enabled, isPracticeMode, user, view]);

  return { students, error };
}

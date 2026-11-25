import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection, getPublicDoc } from '../utils/firestoreRefs.js';

export default function useScores({
  user,
  view,
  viewingRoomId,
  currentScoreDocId,
  enabled = true,
}) {
  const [scores, setScores] = useState([]);
  const [error, setError] = useState(null);
  const teacherRoomId = view === 'teacher' ? viewingRoomId : '';
  const studentScoreId = view === 'teacher' || view === 'result' ? '' : currentScoreDocId;

  useEffect(() => {
    if (!enabled || !user || !db) {
      setScores([]);
      return undefined;
    }

    if (teacherRoomId) {
      const scoresRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores);
      const scoresQuery = teacherRoomId === 'all'
        ? query(scoresRef, orderBy('updatedAt', 'desc'), limit(100))
        : query(scoresRef, where('roomId', '==', teacherRoomId));

      const unsubscribeScores = onSnapshot(
        scoresQuery,
        (snapshot) => {
          setScores(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
          setError(null);
        },
        (snapshotError) => {
          console.error(snapshotError);
          setError(snapshotError);
        },
      );

      return () => unsubscribeScores();
    }

    if (!studentScoreId) {
      setScores([]);
      return undefined;
    }

    const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, studentScoreId);
    const unsubscribeScore = onSnapshot(
      scoreRef,
      (snapshot) => {
        setScores(snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() }] : []);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribeScore();
  }, [enabled, studentScoreId, teacherRoomId, user]);

  return { scores, error };
}

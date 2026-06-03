import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useRoomScores({
  user,
  view,
  roomId = '',
  isPracticeMode = false,
  enabled = true,
}) {
  const [roomScores, setRoomScores] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db || view !== 'studentLobby' || !roomId || isPracticeMode) {
      setRoomScores([]);
      return undefined;
    }

    const scoresRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores);
    const scoresQuery = query(scoresRef, where('roomId', '==', roomId));
    const unsubscribe = onSnapshot(
      scoresQuery,
      (snapshot) => {
        setRoomScores(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, isPracticeMode, roomId, user, view]);

  return { roomScores, error };
}

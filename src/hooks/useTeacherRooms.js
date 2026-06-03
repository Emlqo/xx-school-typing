import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useTeacherRooms({ user, view, enabled = true }) {
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db || view !== 'teacher') {
      setRooms([]);
      return undefined;
    }

    const roomsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.rooms);
    const roomsQuery = query(roomsRef, orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        setRooms(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, user, view]);

  return { rooms, error };
}

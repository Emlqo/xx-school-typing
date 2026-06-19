import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function isOpenRoom(room) {
  if (!room.classId) return false;
  if (room.status === 'waiting') return true;
  if (room.status !== 'playing') return false;

  const expiresAt = toMillis(room.expiresAt);
  return !expiresAt || expiresAt > Date.now();
}

export default function useOpenClassRooms({
  user,
  view,
  isPracticeMode = false,
  enabled = true,
}) {
  const [openClassRooms, setOpenClassRooms] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canSubscribe = view === 'studentRoomEntry';
    if (!enabled || !user || !db || !canSubscribe || isPracticeMode) {
      setOpenClassRooms([]);
      return undefined;
    }

    const roomsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.rooms);
    const roomsQuery = query(
      roomsRef,
      where('entryType', '==', 'class'),
      where('status', 'in', ['waiting', 'playing']),
    );
    const unsubscribe = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const nextRooms = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter(isOpenRoom)
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setOpenClassRooms(nextRooms);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, isPracticeMode, user, view]);

  return { openClassRooms, error };
}

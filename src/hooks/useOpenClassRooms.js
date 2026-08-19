import { useCallback, useEffect, useState } from 'react';
import { getDocs, limit, query, where } from 'firebase/firestore';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshOpenClassRooms = useCallback(async () => {
    const canSubscribe = view === 'studentRoomEntry';
    if (!enabled || !user || !db || !canSubscribe || isPracticeMode) {
      setOpenClassRooms([]);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    try {
      const roomsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.rooms);
      const [waitingSnapshot, playingSnapshot] = await Promise.all([
        getDocs(query(
          roomsRef,
          where('entryType', '==', 'class'),
          where('status', '==', 'waiting'),
          limit(20),
        )),
        getDocs(query(
          roomsRef,
          where('expiresAt', '>', Date.now()),
          limit(20),
        )),
      ]);
      const roomDocuments = [...waitingSnapshot.docs, ...playingSnapshot.docs];
      const nextRooms = roomDocuments
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(isOpenRoom)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setOpenClassRooms(nextRooms);
      setError(null);
      return nextRooms;
    } catch (loadError) {
      console.error(loadError);
      setOpenClassRooms([]);
      setError(loadError);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [enabled, isPracticeMode, user, view]);

  useEffect(() => {
    refreshOpenClassRooms();
  }, [refreshOpenClassRooms]);

  return { openClassRooms, error, isLoading, refreshOpenClassRooms };
}

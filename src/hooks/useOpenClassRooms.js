import { useCallback, useEffect, useRef, useState } from 'react';
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

async function loadOpenClassRooms(classId) {
  const roomsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.rooms);
  const classroom = [where('classId', '==', classId), where('entryType', '==', 'class')];
  const [waiting, playing] = await Promise.all([
    getDocs(query(roomsRef, ...classroom, where('status', '==', 'waiting'), limit(20))),
    getDocs(query(roomsRef, ...classroom, where('status', '==', 'playing'), where('expiresAt', '>', Date.now()), limit(20))),
  ]);
  return [...waiting.docs, ...playing.docs]
    .map((doc) => ({ ...doc.data(), id: doc.id }))
    .filter(isOpenRoom)
    .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export default function useOpenClassRooms({
  user,
  view,
  classId = '',
  isPracticeMode = false,
  enabled = true,
}) {
  const loadKey = enabled && user && db && view === 'studentRoomEntry' && !isPracticeMode && classId
    ? `${user.uid}:${classId}` : '';
  const activeKey = useRef(loadKey);
  activeKey.current = loadKey;
  const [result, setResult] = useState(null);

  const refreshOpenClassRooms = useCallback(async () => {
    if (!loadKey) {
      setResult(null);
      return [];
    }
    setResult({ key: loadKey, isLoading: true });
    try {
      const rooms = await loadOpenClassRooms(classId);
      if (activeKey.current === loadKey) setResult({ key: loadKey, rooms });
      return rooms;
    } catch (error) {
      console.error(error);
      if (activeKey.current === loadKey) setResult({ key: loadKey, error });
      return [];
    }
  }, [classId, loadKey]);

  useEffect(() => {
    refreshOpenClassRooms();
  }, [refreshOpenClassRooms]);

  const current = result?.key === loadKey ? result : null;
  return {
    openClassRooms: current?.rooms || [],
    error: current?.error,
    isLoading: Boolean(loadKey && (!current || current.isLoading)),
    refreshOpenClassRooms,
  };
}

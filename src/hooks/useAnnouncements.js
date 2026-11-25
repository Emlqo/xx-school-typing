import { useCallback, useEffect, useRef, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getCachedStudentDirectory, STUDENT_HOME_CACHE_AGE_MS } from '../services/studentDirectoryCache.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

async function loadAnnouncements(serializeDates) {
  const announcementsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.announcements);
  const snapshot = await getDocs(query(announcementsRef, orderBy('createdAt', 'desc')));
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return serializeDates
      ? { id: doc.id, ...data, createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0 }
      : { id: doc.id, ...data };
  });
}

export default function useAnnouncements({ user, enabled = true, studentHomeKey = '' }) {
  const [announcements, setAnnouncements] = useState([]);
  const [state, setState] = useState(null);
  const loadKey = enabled && user && db ? studentHomeKey || user.uid : '';
  const activeKey = useRef(loadKey);
  activeKey.current = loadKey;

  const refreshAnnouncements = useCallback(async (refresh = true) => {
    if (!loadKey) {
      setAnnouncements([]);
      setState(null);
      return [];
    }

    setState({ key: loadKey, loading: true });
    try {
      const nextAnnouncements = studentHomeKey
        ? await getCachedStudentDirectory(`${studentHomeKey}:announcements`, () => loadAnnouncements(true), {
          maxAge: STUDENT_HOME_CACHE_AGE_MS, refresh, persist: true,
        })
        : await loadAnnouncements(false);
      if (activeKey.current === loadKey) {
        setAnnouncements(nextAnnouncements);
        setState({ key: loadKey, loading: false });
      }
      return nextAnnouncements;
    } catch (loadError) {
      console.error(loadError);
      if (activeKey.current === loadKey) setState({ key: loadKey, loading: false, error: loadError });
      return [];
    }
  }, [loadKey, studentHomeKey]);

  useEffect(() => {
    refreshAnnouncements(false);
  }, [refreshAnnouncements]);

  return {
    announcements, error: state?.key === loadKey ? state.error : null,
    isLoading: Boolean(loadKey && (state?.key !== loadKey || state.loading)), refreshAnnouncements,
  };
}

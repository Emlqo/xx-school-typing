import { useCallback, useEffect, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getCachedStudentDirectory, STUDENT_HOME_CACHE_AGE_MS } from '../services/studentDirectoryCache.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

async function loadAnnouncements() {
  const announcementsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.announcements);
  const snapshot = await getDocs(query(announcementsRef, orderBy('createdAt', 'desc')));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export default function useAnnouncements({ user, enabled = true, studentHome = false }) {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);

  const refreshAnnouncements = useCallback(async (refresh = true) => {
    if (!enabled || !user || !db) {
      setAnnouncements([]);
      return [];
    }

    try {
      const nextAnnouncements = studentHome
        ? await getCachedStudentDirectory(`${user.uid}:home-announcements`, loadAnnouncements, { maxAge: STUDENT_HOME_CACHE_AGE_MS, refresh })
        : await loadAnnouncements();
      setAnnouncements(nextAnnouncements);
      setError(null);
      return nextAnnouncements;
    } catch (loadError) {
      console.error(loadError);
      setError(loadError);
      return [];
    }
  }, [enabled, studentHome, user]);

  useEffect(() => {
    refreshAnnouncements(false);
  }, [refreshAnnouncements]);

  return { announcements, error, refreshAnnouncements };
}

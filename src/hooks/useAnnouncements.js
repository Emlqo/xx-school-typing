import { useCallback, useEffect, useState } from 'react';
import { getDocs, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useAnnouncements({ user, enabled = true }) {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);

  const refreshAnnouncements = useCallback(async () => {
    if (!enabled || !user || !db) {
      setAnnouncements([]);
      return [];
    }

    try {
      const announcementsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.announcements);
      const snapshot = await getDocs(query(announcementsRef, orderBy('createdAt', 'desc')));
      const nextAnnouncements = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(nextAnnouncements);
      setError(null);
      return nextAnnouncements;
    } catch (loadError) {
      console.error(loadError);
      setError(loadError);
      return [];
    }
  }, [enabled, user]);

  useEffect(() => {
    refreshAnnouncements();
  }, [refreshAnnouncements]);

  return { announcements, error, refreshAnnouncements };
}

import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useAnnouncements({ user, enabled = true }) {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db) {
      setAnnouncements([]);
      return undefined;
    }

    const announcementsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.announcements);
    const announcementsQuery = query(announcementsRef, orderBy('createdAt', 'desc'), limit(5));

    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        setAnnouncements(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [enabled, user]);

  return { announcements, error };
}

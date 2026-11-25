import { useEffect, useState } from 'react';
import { getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { initializeHomeAnnouncements } from '../services/studentSecurityApi.js';
import { getPublicCollection, getPublicDoc } from '../utils/firestoreRefs.js';

export default function useDuelSettings({ user, enabled = true, includeUrgent = false }) {
  const [duelEnabled, setDuelEnabled] = useState(true);
  const [urgentAnnouncements, setUrgentAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db) {
      setDuelEnabled(true);
      setUrgentAnnouncements([]);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    setIsLoading(true);
    const settingsRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.settings, 'duel');
    let active = true;
    let receivedSummary = false;
    let initializationStarted = false;
    const unsubscribe = onSnapshot(
      settingsRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        const settings = snapshot.data();
        setDuelEnabled(settings?.enabled !== false);
        setIsLoading(false);
        setError(null);
        if (!includeUrgent) return;
        if (Array.isArray(settings?.urgentAnnouncements)) {
          receivedSummary = true;
          setUrgentAnnouncements(settings.urgentAnnouncements);
          return;
        }
        if (initializationStarted || snapshot.metadata.fromCache) return;
        initializationStarted = true;
        initializeHomeAnnouncements()
          .then((result) => {
            if (active && !receivedSummary) setUrgentAnnouncements(result.urgentAnnouncements);
          })
          .catch(async (initializationError) => {
            console.error(initializationError);
            if (!active || receivedSummary) return;
            try {
              const announcements = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.announcements);
              const result = await getDocs(query(announcements, where('isAlert', '==', true)));
              if (active && !receivedSummary) setUrgentAnnouncements(result.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            } catch (fallbackError) {
              console.error(fallbackError);
            }
          });
      },
      (snapshotError) => {
        console.error(snapshotError);
        setDuelEnabled(false);
        setIsLoading(false);
        setError(snapshotError);
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, includeUrgent, user]);

  return { duelEnabled, isLoading, error, urgentAnnouncements };
}

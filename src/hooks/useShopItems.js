import { useEffect, useState } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

export default function useShopItems({
  user,
  view,
  classId = '',
  isPracticeMode = false,
  enabled = true,
}) {
  const [shopItems, setShopItems] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canSubscribe = view === 'teacher' || view === 'studentLobby';

    if (!enabled || !user || !db || !classId || !canSubscribe || isPracticeMode) {
      setShopItems([]);
      return undefined;
    }

    const itemsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.shopItems);
    const itemsQuery = query(itemsRef, where('classId', '==', classId));
    const unsubscribe = onSnapshot(
      itemsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs
          .map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }))
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setShopItems(nextItems);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [classId, enabled, isPracticeMode, user, view]);

  return { shopItems, error };
}

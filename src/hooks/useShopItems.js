import { useCallback, useEffect, useState } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
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

  const refreshShopItems = useCallback(async () => {
    const canSubscribe = view === 'teacher' || view === 'login';

    if (!enabled || !user || !db || !classId || !canSubscribe || isPracticeMode) {
      setShopItems([]);
      return [];
    }

    try {
      const itemsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.shopItems);
      const snapshot = await getDocs(query(itemsRef, where('classId', '==', classId)));
      const nextItems = snapshot.docs
        .map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setShopItems(nextItems);
      setError(null);
      return nextItems;
    } catch (loadError) {
      console.error(loadError);
      setError(loadError);
      return [];
    }
  }, [classId, enabled, isPracticeMode, user, view]);

  useEffect(() => {
    refreshShopItems();
  }, [refreshShopItems]);

  return { shopItems, error, refreshShopItems };
}

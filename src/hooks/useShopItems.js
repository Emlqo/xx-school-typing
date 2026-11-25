import { useCallback, useEffect, useState } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getCachedStudentDirectory, STUDENT_HOME_CACHE_AGE_MS, updateCachedStudentDirectory } from '../services/studentDirectoryCache.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';
import { SHOP_SEASON } from '../utils/gacha.js';

async function loadShopItems() {
  const itemsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.shopItems);
  const snapshot = await getDocs(query(itemsRef, where('season', '==', SHOP_SEASON)));
  return snapshot.docs
    .map((itemDoc) => ({ id: itemDoc.id, ...itemDoc.data() }))
    .filter(item => item.scope === 'school')
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

export default function useShopItems({
  user,
  view,
  isPracticeMode = false,
  enabled = true,
}) {
  const [shopItems, setShopItems] = useState([]);
  const [error, setError] = useState(null);

  const cacheKey = view === 'login' && user ? `${user.uid}:home-shop:${SHOP_SEASON}` : '';
  const refreshShopItems = useCallback(async (refresh = true) => {
    const canSubscribe = view === 'teacher' || view === 'login';

    if (!enabled || !user || !db || !canSubscribe || isPracticeMode) {
      setShopItems([]);
      return [];
    }

    try {
      const nextItems = cacheKey
        ? await getCachedStudentDirectory(cacheKey, loadShopItems, { maxAge: STUDENT_HOME_CACHE_AGE_MS, refresh })
        : await loadShopItems();
      setShopItems(nextItems);
      setError(null);
      return nextItems;
    } catch (loadError) {
      console.error(loadError);
      setError(loadError);
      return [];
    }
  }, [cacheKey, enabled, isPracticeMode, user, view]);

  useEffect(() => {
    refreshShopItems(false);
  }, [refreshShopItems]);

  const applyShopPurchase = useCallback(result => {
    if (!result?.itemId || !Number.isFinite(result.itemStock)) return;
    const applyStock = (items) => items.map((item) => item.id === result.itemId ? { ...item, stock: result.itemStock } : item);
    if (cacheKey) updateCachedStudentDirectory(cacheKey, applyStock);
    setShopItems(applyStock);
  }, [cacheKey]);
  return { shopItems, error, refreshShopItems, applyShopPurchase };
}

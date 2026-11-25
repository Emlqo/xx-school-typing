import { useCallback, useEffect, useRef, useState } from 'react';
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
  studentHomeKey = '',
}) {
  const [shopItems, setShopItems] = useState([]);
  const [state, setState] = useState(null);

  const cacheKey = view === 'login' && studentHomeKey ? `${studentHomeKey}:shop:${SHOP_SEASON}` : '';
  const loadKey = enabled && user && db && !isPracticeMode && (view === 'teacher' || view === 'login')
    ? cacheKey || user.uid : '';
  const activeKey = useRef(loadKey);
  activeKey.current = loadKey;
  const refreshShopItems = useCallback(async (refresh = true) => {
    if (!loadKey) {
      setShopItems([]);
      setState(null);
      return [];
    }

    setState({ key: loadKey, loading: true });
    try {
      const nextItems = cacheKey
        ? await getCachedStudentDirectory(cacheKey, loadShopItems, { maxAge: STUDENT_HOME_CACHE_AGE_MS, refresh, persist: true })
        : await loadShopItems();
      if (activeKey.current === loadKey) {
        setShopItems(nextItems);
        setState({ key: loadKey, loading: false });
      }
      return nextItems;
    } catch (loadError) {
      console.error(loadError);
      if (activeKey.current === loadKey) setState({ key: loadKey, loading: false, error: loadError });
      return [];
    }
  }, [cacheKey, loadKey]);

  useEffect(() => {
    refreshShopItems(false);
  }, [refreshShopItems]);

  const applyShopPurchase = useCallback(result => {
    if (!result?.itemId || !Number.isFinite(result.itemStock)) return;
    const applyStock = (items) => items.map((item) => item.id === result.itemId ? { ...item, stock: result.itemStock } : item);
    if (cacheKey) updateCachedStudentDirectory(cacheKey, applyStock);
    setShopItems(applyStock);
  }, [cacheKey]);
  return {
    shopItems, error: state?.key === loadKey ? state.error : null,
    isLoading: Boolean(loadKey && (state?.key !== loadKey || state.loading)), refreshShopItems, applyShopPurchase,
  };
}

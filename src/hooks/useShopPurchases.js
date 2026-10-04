import { useEffect, useState } from 'react';
import { listShopHistory } from '../services/studentSecurityApi.js';

// Fetch on section/class changes only; no live listener or polling.
export default function useShopPurchases({ user, view, classId = '', isPracticeMode = false, enabled = true }) {
  const [shopPurchases, setShopPurchases] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setShopPurchases([]);
    if (!enabled || !user || !classId || view !== 'teacher' || isPracticeMode) return undefined;
    listShopHistory({ teacher: true, classId }).then(data => {
      if (!cancelled) { setShopPurchases(data.items); setError(null); }
    }).catch(e => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [classId, enabled, isPracticeMode, user, view]);
  return { shopPurchases, error };
}

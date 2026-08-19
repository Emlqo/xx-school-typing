import { useEffect, useState } from 'react';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export default function useShopPurchases({
  user,
  view,
  classId = '',
  isPracticeMode = false,
  enabled = true,
}) {
  const [shopPurchases, setShopPurchases] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const canSubscribe = view === 'teacher';

    if (!enabled || !user || !db || !classId || !canSubscribe || isPracticeMode) {
      setShopPurchases([]);
      return undefined;
    }

    const purchasesRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.shopPurchases);
    const purchasesQuery = query(
      purchasesRef,
      orderBy('createdAt', 'desc'),
      limit(100),
    );
    const unsubscribe = onSnapshot(
      purchasesQuery,
      (snapshot) => {
        const nextPurchases = snapshot.docs
          .map((purchaseDoc) => ({ id: purchaseDoc.id, ...purchaseDoc.data() }))
          .filter((purchase) => purchase.classId === classId)
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setShopPurchases(nextPurchases);
        setError(null);
      },
      (snapshotError) => {
        console.error(snapshotError);
        setError(snapshotError);
      },
    );

    return () => unsubscribe();
  }, [classId, enabled, isPracticeMode, user, view]);

  return { shopPurchases, error };
}

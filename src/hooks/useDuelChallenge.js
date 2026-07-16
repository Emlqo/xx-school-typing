import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicDoc } from '../utils/firestoreRefs.js';

function subscribeChallenge(docId, onValue, onError) {
  if (!docId) {
    onValue(null);
    return () => {};
  }
  return onSnapshot(
    getPublicDoc(db, APP_ID, FIRESTORE_PATHS.duelChallenges, docId),
    (snapshot) => onValue(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  );
}

export default function useDuelChallenge({
  user,
  studentId = '',
  outgoingTargetStudentId = '',
  enabled = true,
}) {
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [outgoingChallenge, setOutgoingChallenge] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !user || !db || !studentId) {
      setIncomingChallenge(null);
      return undefined;
    }
    return subscribeChallenge(studentId, setIncomingChallenge, (snapshotError) => {
      console.error(snapshotError);
      setError(snapshotError);
    });
  }, [enabled, studentId, user]);

  useEffect(() => {
    if (!enabled || !user || !db || !outgoingTargetStudentId) {
      setOutgoingChallenge(null);
      return undefined;
    }
    return subscribeChallenge(outgoingTargetStudentId, setOutgoingChallenge, (snapshotError) => {
      console.error(snapshotError);
      setError(snapshotError);
    });
  }, [enabled, outgoingTargetStudentId, user]);

  return { incomingChallenge, outgoingChallenge, error };
}

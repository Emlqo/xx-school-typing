import { useEffect, useState } from 'react';
import { db, initAnonymousAuth } from '../services/firebaseClient.js';

export default function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};

    try {
      unsubscribe = initAnonymousAuth((nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
      });
    } catch (authError) {
      console.error(authError);
      setError(authError);
      setAuthReady(true);
    }

    return () => unsubscribe();
  }, []);

  return { user, db, authReady, error };
}

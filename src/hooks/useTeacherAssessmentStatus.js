import { useEffect, useMemo, useState } from 'react';
import { getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { db } from '../services/firebaseClient.js';
import { getPublicCollection } from '../utils/firestoreRefs.js';

const rosterCache = new Map();
const rosterRequests = new Map();

function loadClassRoster(classId) {
  if (rosterCache.has(classId)) return Promise.resolve(rosterCache.get(classId));
  if (rosterRequests.has(classId)) return rosterRequests.get(classId);

  const rosterQuery = query(
    getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classStudents),
    where('classId', '==', classId),
  );
  const request = getDocs(rosterQuery)
    .then((snapshot) => {
      const roster = snapshot.docs
        .filter((item) => item.data().active !== false)
        .map((item) => ({ studentId: item.id, name: item.data().name || '' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      rosterCache.set(classId, roster);
      rosterRequests.delete(classId);
      return roster;
    })
    .catch((error) => {
      rosterRequests.delete(classId);
      throw error;
    });
  rosterRequests.set(classId, request);
  return request;
}

function normalizeSubmission(data = {}) {
  return {
    status: data.status || '',
    attemptCount: Math.max(0, Number(data.attemptCount || 0)),
    latestScore: Math.max(0, Number(data.latestScore || 0)),
    bestScore: Math.max(0, Number(data.bestScore || 0)),
  };
}

export default function useTeacherAssessmentStatus({ assessmentId = '', classId = '' }) {
  const [roster, setRoster] = useState([]);
  const [submissions, setSubmissions] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);

  useEffect(() => {
    if (!assessmentId || !classId || !db) {
      setRoster([]);
      setSubmissions(new Map());
      setIsLoading(false);
      setError(null);
      setLastUpdatedAt(0);
      return undefined;
    }

    let cancelled = false;
    let rosterReady = false;
    let submissionsReady = false;
    const updateLoading = () => {
      if (!cancelled) setIsLoading(!(rosterReady && submissionsReady));
    };
    setIsLoading(true);
    setError(null);
    setRoster([]);
    setSubmissions(new Map());

    loadClassRoster(classId)
      .then((nextRoster) => {
        rosterReady = true;
        if (!cancelled) {
          setRoster(nextRoster);
          updateLoading();
        }
      })
      .catch((rosterError) => {
        console.error(rosterError);
        rosterReady = true;
        if (!cancelled) {
          setRoster([]);
          setError(rosterError);
          updateLoading();
        }
      });

    const submissionsQuery = query(
      getPublicCollection(db, APP_ID, FIRESTORE_PATHS.assessmentSubmissions),
      where('assessmentId', '==', assessmentId),
      where('classId', '==', classId),
    );
    const unsubscribe = onSnapshot(
      submissionsQuery,
      (snapshot) => {
        if (cancelled) return;
        submissionsReady = true;
        setSubmissions(new Map(snapshot.docs.map((item) => [
          item.data().studentId,
          normalizeSubmission(item.data()),
        ])));
        setLastUpdatedAt(Date.now());
        updateLoading();
      },
      (snapshotError) => {
        console.error(snapshotError);
        submissionsReady = true;
        if (!cancelled) {
          setError(snapshotError);
          updateLoading();
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [assessmentId, classId]);

  const rows = useMemo(() => roster.map((student) => ({
    ...student,
    submission: submissions.get(student.studentId) || null,
  })), [roster, submissions]);

  return { rows, isLoading, error, lastUpdatedAt };
}

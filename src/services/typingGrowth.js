import { arrayRemove, arrayUnion, getDocFromServer, getDocsFromServer, limit, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { APP_ID } from '../constants/gameRules.js';
import { FIRESTORE_PATHS } from '../constants/firestorePaths.js';
import { isTeacherUser } from '../constants/admin.js';
import { auth, db } from './firebaseClient.js';
import { getPublicCollection, getPublicDoc } from '../utils/firestoreRefs.js';

const MAX_RECORDS = 5000;
const cache = new Map();
const pending = new Map();
let cacheOwner = '';

function teacherUid() {
  if (!isTeacherUser(auth.currentUser)) throw new Error('관리자 인증을 다시 확인해주세요.');
  if (cacheOwner !== auth.currentUser.uid) {
    cache.clear();
    pending.clear();
    cacheOwner = auth.currentUser.uid;
  }
  return auth.currentUser.uid;
}

// Manual, class-scoped reads only. Cached data stays in this tab's memory, never localStorage.
export async function loadClassTypingGrowth(classId, { force = false } = {}) {
  const uid = teacherUid();
  if (!classId) throw new Error('학급을 선택해주세요.');
  const key = `${uid}:${classId}`;
  if (pending.has(key)) return pending.get(key);
  if (!force && cache.has(key)) return cache.get(key);
  const request = (async () => {
    const snapshot = await getDocsFromServer(query(getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores),
      where('classId', '==', classId), limit(MAX_RECORDS + 1)));
    if (snapshot.size > MAX_RECORDS) throw new Error('학급 기록이 5,000건을 넘었습니다. 읽기 한도 보호를 위해 분석을 중단했습니다.');
    const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const roomIds = [...new Set(scores.filter(score => score.entryType === 'class' && score.gameType !== 'subway'
      && !score.screenExitDetected && !score.roomDeleted && !score.excludedFromHallOfFame
      && Number(score.cpm) > 0 && Number(score.correctChars) > 0).map(score => score.roomId).filter(Boolean))];
    const rooms = new Map();
    // Keep request concurrency bounded even for a long-running school history.
    for (let offset = 0; offset < roomIds.length; offset += 10) {
      const batch = roomIds.slice(offset, offset + 10);
      const documents = await Promise.all(batch.map(id => getDocFromServer(getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, id))));
      documents.forEach(doc => rooms.set(doc.id, doc.exists() ? doc.data() : null));
    }
    if (teacherUid() !== uid) throw new Error('관리자 세션이 변경되었습니다.');
    const result = { records: scores.map(score => ({ ...score, room: rooms.get(score.roomId) || null })),
      scoreCount: scores.length, roomCount: roomIds.length, loadedAt: Date.now() };
    cache.set(key, result);
    return result;
  })();
  pending.set(key, request);
  try { return await request; } finally { if (pending.get(key) === request) pending.delete(key); }
}

export async function saveTypingGrowthExclusion(classId, studentId, excluded) {
  teacherUid();
  if (!classId || !studentId) throw new Error('학급과 학생을 확인해주세요.');
  await updateDoc(getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classes, classId), {
    typingGrowthExcludedStudentIds: excluded ? arrayUnion(studentId) : arrayRemove(studentId),
    updatedAt: serverTimestamp(),
  });
}

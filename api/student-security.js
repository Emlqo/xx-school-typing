import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const APP_ID = 'xx-school-typing-app';
const TEACHER_UID = String(process.env.TEACHER_UID || 'hnjJNGDuydcd4SfQ2Xq5cE6IujD3').trim();
const SESSION_MINUTES = 30;

const PATHS = {
  rooms: 'typing_rooms',
  scores: 'typing_scores',
  classes: 'typing_classes',
  classStudents: 'typing_class_students',
  classRoster: 'typing_class_roster',
  studentSessions: 'typing_student_sessions',
  roomPresence: 'typing_room_presence',
  shopItems: 'typing_shop_items',
  shopPurchases: 'typing_shop_purchases',
  practiceRecords: 'typing_practice_records',
  duelChallenges: 'typing_duel_challenges',
  duels: 'typing_duels',
  duelScores: 'typing_duel_scores',
};

const DUEL_RULES = {
  challengeDurationMs: 60 * 1000,
  countdownMs: 5 * 1000,
  durationMs: 5 * 60 * 1000,
  stakePoints: 5,
  dailyWinPointLimit: 15,
  finalizeGraceMs: 3 * 1000,
};

const REWARD_RULES = {
  quizCorrectPoints: 3,
  bestScoreBonus: 10,
  growthBonus: 10,
  growthRateThreshold: 0.1,
};

const PRACTICE_RECORD_RULES = {
  minDurationSec: 300,
  minCpm: 30,
};

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.private_key)?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new ApiError(500, 'api/configuration-error', 'Firebase Admin 환경변수가 설정되지 않았습니다.');
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

function database() {
  return getFirestore(getAdminApp());
}

function publicCollection(name) {
  return database().collection(`artifacts/${APP_ID}/public/data/${name}`);
}

function requireString(value, field, maxLength = 100) {
  const text = String(value || '').trim();
  if (!text || text.length > maxLength) {
    throw new ApiError(400, 'api/invalid-argument', `${field} 값이 올바르지 않습니다.`);
  }
  return text;
}

function requirePin(value) {
  const pin = String(value || '');
  if (!/^\d{4}$/.test(pin)) {
    throw new ApiError(400, 'api/invalid-argument', 'PIN은 숫자 4자리여야 합니다.');
  }
  return pin;
}

function requirePracticeRunId(value) {
  const runId = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(runId)) {
    throw new ApiError(400, 'api/invalid-argument', '연습 기록 식별자가 올바르지 않습니다.');
  }
  return runId;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  return 0;
}

export function isDuelExpired(endsAt, now = Date.now(), graceMs = DUEL_RULES.finalizeGraceMs) {
  const endsAtMillis = toMillis(endsAt);
  return endsAtMillis > 0 && Number(now) >= endsAtMillis + Number(graceMs || 0);
}

export function calculateDuelSettlement(challengerScore, targetScore, stakePoints = DUEL_RULES.stakePoints) {
  const challengerFinalScore = Number(challengerScore || 0);
  const targetFinalScore = Number(targetScore || 0);
  const stake = Math.max(0, Number(stakePoints || 0));
  const isDraw = challengerFinalScore === targetFinalScore;
  const winnerSide = isDraw ? null : challengerFinalScore > targetFinalScore ? 'challenger' : 'target';
  return {
    isDraw,
    winnerSide,
    pointTransfer: isDraw ? 0 : stake,
    challengerRefund: isDraw ? stake : winnerSide === 'challenger' ? stake * 2 : 0,
    targetRefund: isDraw ? stake : winnerSide === 'target' ? stake * 2 : 0,
  };
}

function getKoreanDateKey(now = Date.now()) {
  const koreanTime = new Date(Number(now) + (9 * 60 * 60 * 1000));
  return koreanTime.toISOString().slice(0, 10);
}

function getDuelDailyWinPoints(data = {}, dateKey = getKoreanDateKey()) {
  if (String(data.duelDailyWinDate || '') !== dateKey) return 0;
  return Math.max(0, Number(data.duelDailyWinPoints || 0));
}

function assertDuelDailyLimit(student = {}) {
  if (getDuelDailyWinPoints(student) >= DUEL_RULES.dailyWinPointLimit) {
    throw new ApiError(
      409,
      'api/duel-daily-limit',
      `오늘 결투로 획득할 수 있는 ${DUEL_RULES.dailyWinPointLimit}P를 모두 획득했습니다. 자정 이후 다시 도전하세요.`,
    );
  }
}

function safeProfile(studentId, data = {}) {
  const duelDailyWinDate = getKoreanDateKey();
  return {
    id: studentId,
    classId: data.classId || '',
    className: data.className || '',
    name: data.name || '',
    active: data.active !== false,
    totalPoints: Math.max(0, Number(data.totalPoints || 0)),
    bestScore: Math.max(0, Number(data.bestScore || 0)),
    ownedCosmetics: Array.isArray(data.ownedCosmetics) ? data.ownedCosmetics.filter(Boolean) : [],
    equippedCosmetic: data.equippedCosmetic || null,
    hasPin: Boolean(data.studentPin),
    duelDailyWinDate,
    duelDailyWinPoints: getDuelDailyWinPoints(data, duelDailyWinDate),
  };
}

async function safeLoginProfile(studentId, data = {}) {
  let className = data.className || '';
  if (!className && data.classId) {
    const classSnapshot = await publicCollection(PATHS.classes).doc(data.classId).get();
    className = classSnapshot.exists ? classSnapshot.data().name || '' : '';
  }
  return safeProfile(studentId, { ...data, className });
}

function safeScore(scoreId, data = {}) {
  return {
    id: scoreId,
    ...data,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
  };
}

function safeDuel(duelId, data = {}) {
  return {
    id: duelId,
    ...data,
    startsAt: toMillis(data.startsAt),
    endsAt: toMillis(data.endsAt),
    createdAt: toMillis(data.createdAt),
    completedAt: toMillis(data.completedAt),
  };
}

function safeDuelHistoryItem(duelId, data = {}) {
  return {
    id: duelId,
    status: data.status || '',
    result: data.result || '',
    challengerStudentId: data.challengerStudentId || '',
    challengerName: data.challengerName || '',
    challengerClassName: data.challengerClassName || '',
    targetStudentId: data.targetStudentId || '',
    targetName: data.targetName || '',
    targetClassName: data.targetClassName || '',
    winnerStudentId: data.winnerStudentId || null,
    loserStudentId: data.loserStudentId || null,
    pointTransfer: Math.max(0, Number(data.pointTransfer || 0)),
    finalScores: data.finalScores || null,
    completedAt: toMillis(data.completedAt),
  };
}

function sanitizeQuizSequence(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).map((quiz, index) => {
    const question = String(quiz?.question || '').trim().slice(0, 300);
    const options = Array.isArray(quiz?.options)
      ? quiz.options.slice(0, 4).map((option) => String(option || '').trim().slice(0, 200))
      : [];
    const answer = Math.max(0, Math.min(3, Number(quiz?.answer || 0)));
    if (!question || options.length !== 4 || options.some((option) => !option)) return null;
    return { id: String(quiz?.id || `duel-quiz-${index}`), question, options, answer };
  }).filter(Boolean);
}

function activeChallengeFields(challengeId, role, expiresAt) {
  return {
    activeChallengeId: challengeId,
    activeChallengeRole: role,
    activeChallengeExpiresAt: expiresAt,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function clearChallengeFields() {
  return {
    activeChallengeId: FieldValue.delete(),
    activeChallengeRole: FieldValue.delete(),
    activeChallengeExpiresAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function hasActiveStudentActivity(student = {}) {
  return Boolean(student.activeDuelId)
    || (Boolean(student.activeChallengeId) && toMillis(student.activeChallengeExpiresAt) > Date.now());
}

async function authenticate(request) {
  const authorization = String(request.headers.authorization || '');
  if (!authorization.startsWith('Bearer ')) {
    throw new ApiError(401, 'api/unauthenticated', '로그인이 필요합니다.');
  }
  try {
    return await getAuth(getAdminApp()).verifyIdToken(authorization.slice(7));
  } catch {
    throw new ApiError(401, 'api/unauthenticated', '로그인 정보가 유효하지 않습니다.');
  }
}

async function getActiveStudent(studentId) {
  const snapshot = await publicCollection(PATHS.classStudents).doc(studentId).get();
  if (!snapshot.exists || snapshot.data().active === false) {
    throw new ApiError(404, 'api/not-found', '학생 정보를 찾을 수 없습니다.');
  }
  return { snapshot, data: snapshot.data() };
}

async function requireOpenClassRoom(roomId, classId) {
  const snapshot = await publicCollection(PATHS.rooms).doc(roomId).get();
  if (!snapshot.exists) throw new ApiError(404, 'api/not-found', '게임방을 찾을 수 없습니다.');
  const room = snapshot.data();
  const isOpen = room.status === 'waiting'
    || (room.status === 'playing' && (!toMillis(room.expiresAt) || toMillis(room.expiresAt) > Date.now()));
  if (!isOpen || room.entryType !== 'class' || room.classId !== classId) {
    throw new ApiError(403, 'api/permission-denied', '현재 열린 학급 게임이 아닙니다.');
  }
  return room;
}

async function createSession(uid, studentId, student) {
  const expiresAt = Timestamp.fromMillis(Date.now() + SESSION_MINUTES * 60 * 1000);
  await publicCollection(PATHS.studentSessions).doc(uid).set({
    userId: uid,
    studentId,
    classId: student.classId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt,
  });
  return expiresAt.toMillis();
}

async function getStudentSession(uid) {
  const sessionRef = publicCollection(PATHS.studentSessions).doc(uid);
  const sessionSnapshot = await sessionRef.get();
  if (!sessionSnapshot.exists) return { profile: null, sessionExpiresAt: 0 };

  const session = sessionSnapshot.data();
  const sessionExpiresAt = toMillis(session.expiresAt);
  if (!session.studentId || sessionExpiresAt <= Date.now()) {
    await sessionRef.delete().catch(() => {});
    return { profile: null, sessionExpiresAt: 0 };
  }

  const { data: student } = await getActiveStudent(session.studentId);
  if (student.classId !== session.classId) {
    await sessionRef.delete().catch(() => {});
    return { profile: null, sessionExpiresAt: 0 };
  }

  return {
    profile: await safeLoginProfile(session.studentId, student),
    sessionExpiresAt,
  };
}

async function logoutStudentSession(uid) {
  await publicCollection(PATHS.studentSessions).doc(uid).delete();
  return { success: true };
}

async function verifyStudentLoginPin(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  const pin = requirePin(body.pin);
  const { data } = await getActiveStudent(studentId);
  if (!data.studentPin || String(data.studentPin) !== pin) {
    throw new ApiError(403, 'api/permission-denied', '개인 PIN이 일치하지 않습니다.');
  }
  const sessionExpiresAt = await createSession(uid, studentId, data);
  return { profile: await safeLoginProfile(studentId, data), sessionExpiresAt };
}

async function setInitialStudentLoginPin(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  const pin = requirePin(body.pin);
  const { data: initialStudent } = await getActiveStudent(studentId);
  const studentRef = publicCollection(PATHS.classStudents).doc(studentId);
  const rosterRef = publicCollection(PATHS.classRoster).doc(studentId);
  let student;

  await database().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(studentRef);
    if (!snapshot.exists || snapshot.data().active === false) {
      throw new ApiError(404, 'api/not-found', '학생 정보를 찾을 수 없습니다.');
    }
    student = snapshot.data();
    if (student.classId !== initialStudent.classId) {
      throw new ApiError(409, 'api/failed-precondition', '학급 정보가 변경되었습니다.');
    }
    if (student.studentPin) {
      throw new ApiError(409, 'api/already-exists', '이미 PIN이 설정된 학생입니다.');
    }
    student = { ...student, studentPin: pin };
    transaction.update(studentRef, { studentPin: pin, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(rosterRef, {
      classId: student.classId,
      name: student.name || '',
      active: student.active !== false,
      hasPin: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const sessionExpiresAt = await createSession(uid, studentId, student);
  return { profile: await safeLoginProfile(studentId, student), sessionExpiresAt };
}

async function requireSession(uid, studentId) {
  const snapshot = await publicCollection(PATHS.studentSessions).doc(uid).get();
  if (!snapshot.exists) throw new ApiError(403, 'api/permission-denied', 'PIN 인증이 필요합니다.');
  const session = snapshot.data();
  if (session.studentId !== studentId || toMillis(session.expiresAt) <= Date.now()) {
    throw new ApiError(403, 'api/permission-denied', '학생 인증이 만료되었습니다.');
  }
  return session;
}

async function verifyStudentPin(uid, body) {
  const roomId = requireString(body.roomId, 'roomId');
  const studentId = requireString(body.studentId, 'studentId');
  const pin = requirePin(body.pin);
  const { data } = await getActiveStudent(studentId);
  await requireOpenClassRoom(roomId, data.classId);
  if (!data.studentPin || String(data.studentPin) !== pin) {
    throw new ApiError(403, 'api/permission-denied', '개인 PIN이 일치하지 않습니다.');
  }
  const sessionExpiresAt = await createSession(uid, studentId, data);
  return { profile: safeProfile(studentId, data), sessionExpiresAt };
}

async function setInitialStudentPin(uid, body) {
  const roomId = requireString(body.roomId, 'roomId');
  const studentId = requireString(body.studentId, 'studentId');
  const pin = requirePin(body.pin);
  const { data: initialStudent } = await getActiveStudent(studentId);
  await requireOpenClassRoom(roomId, initialStudent.classId);
  const studentRef = publicCollection(PATHS.classStudents).doc(studentId);
  const rosterRef = publicCollection(PATHS.classRoster).doc(studentId);
  let student;
  await database().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(studentRef);
    if (!snapshot.exists || snapshot.data().active === false) {
      throw new ApiError(404, 'api/not-found', '학생 정보를 찾을 수 없습니다.');
    }
    student = snapshot.data();
    if (student.studentPin) throw new ApiError(409, 'api/already-exists', '이미 PIN이 설정된 학생입니다.');
    student = { ...student, studentPin: pin };
    transaction.update(studentRef, { studentPin: pin, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(rosterRef, {
      classId: student.classId,
      name: student.name || '',
      active: student.active !== false,
      hasPin: true,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  const sessionExpiresAt = await createSession(uid, studentId, student);
  return { profile: safeProfile(studentId, student), sessionExpiresAt };
}

async function joinClassGame(uid, body) {
  const roomId = requireString(body.roomId, 'roomId');
  const studentId = requireString(body.studentId, 'studentId');
  const session = await requireSession(uid, studentId);
  const { data: student } = await getActiveStudent(studentId);
  const room = await requireOpenClassRoom(roomId, student.classId);
  if (session.classId !== student.classId) throw new ApiError(403, 'api/permission-denied', '학급 정보가 일치하지 않습니다.');
  const sessionExpiresAt = await createSession(uid, studentId, student);

  const existing = await publicCollection(PATHS.scores)
    .where('roomId', '==', roomId)
    .where('studentId', '==', studentId)
    .limit(1)
    .get();
  let scoreRef;
  let score;
  if (!existing.empty) {
    scoreRef = existing.docs[0].ref;
    await scoreRef.update({ userId: uid, updatedAt: FieldValue.serverTimestamp() });
    score = { ...existing.docs[0].data(), userId: uid, updatedAt: Timestamp.now() };
  } else {
    scoreRef = publicCollection(PATHS.scores).doc();
    score = {
      roomId,
      classId: room.classId,
      className: room.className || room.name || '',
      studentId,
      nickname: student.name || '',
      entryType: 'class',
      equippedCosmetic: student.equippedCosmetic || null,
      score: 0,
      cpm: 0,
      correctChars: 0,
      difficulty: 'normal',
      boosterEnabled: true,
      pointWeight: 1,
      userId: uid,
      quizCorrectCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await scoreRef.set(score);
    score = { ...score, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  }
  await publicCollection(PATHS.roomPresence).doc(`${roomId}_${studentId}`).set({
    roomId,
    classId: room.classId,
    studentId,
    nickname: student.name || '',
    joinedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { score: safeScore(scoreRef.id, score), profile: safeProfile(studentId, student), sessionExpiresAt };
}

async function joinGuestGame(uid, body) {
  const roomCode = requireString(body.roomCode, 'roomCode', 4);
  const nickname = requireString(body.nickname, 'nickname', 30);
  if (!/^\d{4}$/.test(roomCode)) throw new ApiError(400, 'api/invalid-argument', '방 코드는 숫자 4자리여야 합니다.');
  const roomQuery = await publicCollection(PATHS.rooms).where('roomCode', '==', roomCode).get();
  const roomDoc = roomQuery.docs
    .filter((candidate) => {
      const room = candidate.data();
      if (room.entryType === 'class') return false;
      if (room.status === 'waiting') return true;
      return room.status === 'playing' && (!toMillis(room.expiresAt) || toMillis(room.expiresAt) > Date.now());
    })
    .sort((a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt))[0];
  if (!roomDoc) throw new ApiError(404, 'api/not-found', '입장 가능한 방을 찾을 수 없습니다.');
  const room = roomDoc.data();
  const roomScores = await publicCollection(PATHS.scores).where('roomId', '==', roomDoc.id).get();
  const existing = roomScores.docs
    .filter((candidate) => candidate.data().nickname === nickname && !candidate.data().studentId)
    .sort((a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt))[0];
  let scoreRef;
  let score;
  if (existing) {
    scoreRef = existing.ref;
    await scoreRef.update({ userId: uid, updatedAt: FieldValue.serverTimestamp() });
    score = { ...existing.data(), userId: uid, updatedAt: Timestamp.now() };
  } else {
    scoreRef = publicCollection(PATHS.scores).doc();
    score = {
      roomId: roomDoc.id,
      nickname,
      score: 0,
      cpm: 0,
      correctChars: 0,
      difficulty: 'normal',
      boosterEnabled: true,
      pointWeight: 1,
      userId: uid,
      quizCorrectCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    await scoreRef.set(score);
    score = { ...score, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
  }
  return {
    room: {
      id: roomDoc.id,
      ...room,
      createdAt: toMillis(room.createdAt),
      expiresAt: toMillis(room.expiresAt),
    },
    score: safeScore(scoreRef.id, score),
  };
}

async function buyStudentShopItem(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  const itemId = requireString(body.itemId, 'itemId');
  await requireSession(uid, studentId);
  const studentRef = publicCollection(PATHS.classStudents).doc(studentId);
  const itemRef = publicCollection(PATHS.shopItems).doc(itemId);
  const purchaseRef = publicCollection(PATHS.shopPurchases).doc();
  let profile;
  await database().runTransaction(async (transaction) => {
    const [studentSnapshot, itemSnapshot] = await Promise.all([transaction.get(studentRef), transaction.get(itemRef)]);
    if (!studentSnapshot.exists || !itemSnapshot.exists) throw new ApiError(404, 'api/not-found', '학생 또는 상품을 찾을 수 없습니다.');
    const student = studentSnapshot.data();
    const item = itemSnapshot.data();
    const points = Math.max(0, Number(student.totalPoints || 0));
    const price = Math.max(0, Number(item.price || 0));
    const stock = Math.max(0, Number(item.stock || 0));
    const owned = Array.isArray(student.ownedCosmetics) ? student.ownedCosmetics.filter(Boolean) : [];
    if (item.classId !== student.classId) throw new ApiError(403, 'api/permission-denied', '다른 학급의 상품입니다.');
    if (item.active === false) throw new ApiError(409, 'api/failed-precondition', '판매 중인 상품이 아닙니다.');
    if (stock < 1) throw new ApiError(409, 'api/resource-exhausted', '상품이 품절되었습니다.');
    if (points < price) throw new ApiError(409, 'api/failed-precondition', '포인트가 부족합니다.');
    if (item.itemType === 'cosmetic' && (!item.cosmeticId || owned.includes(item.cosmeticId))) {
      throw new ApiError(409, 'api/already-exists', '이미 보유한 장식입니다.');
    }
    const nextOwned = item.itemType === 'cosmetic' ? [...owned, item.cosmeticId] : owned;
    const updates = { totalPoints: points - price, updatedAt: FieldValue.serverTimestamp() };
    if (item.itemType === 'cosmetic') updates.ownedCosmetics = nextOwned;
    transaction.update(studentRef, updates);
    transaction.update(itemRef, { stock: stock - 1, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(purchaseRef, {
      itemId,
      itemName: item.name || '',
      itemType: item.itemType || 'stock',
      cosmeticId: item.cosmeticId || null,
      classId: student.classId,
      studentId,
      studentName: student.name || '',
      quantity: 1,
      pointsSpent: price,
      status: 'completed',
      userId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    profile = safeProfile(studentId, { ...student, totalPoints: points - price, ownedCosmetics: nextOwned });
  });
  return { profile };
}

async function equipStudentCosmetic(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  const cosmeticId = requireString(body.cosmeticId, 'cosmeticId');
  await requireSession(uid, studentId);
  const studentRef = publicCollection(PATHS.classStudents).doc(studentId);
  const snapshot = await studentRef.get();
  if (!snapshot.exists) throw new ApiError(404, 'api/not-found', '학생 정보를 찾을 수 없습니다.');
  const student = snapshot.data();
  const owned = Array.isArray(student.ownedCosmetics) ? student.ownedCosmetics : [];
  if (!owned.includes(cosmeticId)) throw new ApiError(403, 'api/permission-denied', '보유하지 않은 장식입니다.');
  await studentRef.update({ equippedCosmetic: cosmeticId, updatedAt: FieldValue.serverTimestamp() });
  return { profile: safeProfile(studentId, { ...student, equippedCosmetic: cosmeticId }) };
}

async function finalizeStudentReward(uid, body) {
  const scoreId = requireString(body.scoreId, 'scoreId');
  const scoreRef = publicCollection(PATHS.scores).doc(scoreId);
  const initialScore = await scoreRef.get();
  if (!initialScore.exists) throw new ApiError(404, 'api/not-found', '점수 기록을 찾을 수 없습니다.');
  const initialData = initialScore.data();
  if (initialData.userId !== uid || initialData.entryType !== 'class' || !initialData.studentId) {
    throw new ApiError(403, 'api/permission-denied', '보상을 받을 수 없는 기록입니다.');
  }
  await requireSession(uid, initialData.studentId);

  let reward;
  await database().runTransaction(async (transaction) => {
    const scoreSnapshot = await transaction.get(scoreRef);
    const score = scoreSnapshot.data();
    if (score.rewardGranted === true) {
      reward = score.rewardBreakdown || { totalEarned: Number(score.rewardEarned || 0) };
      return;
    }
    const studentRef = publicCollection(PATHS.classStudents).doc(score.studentId);
    const studentSnapshot = await transaction.get(studentRef);
    if (!studentSnapshot.exists) throw new ApiError(404, 'api/not-found', '학생 정보를 찾을 수 없습니다.');
    const student = studentSnapshot.data();
    const currentScore = Math.max(0, Number(score.score || 0));
    const quizCount = Math.max(0, Number(score.quizCorrectCount || 0));
    const previousBest = Math.max(0, Number(student.bestScore || 0));
    const isNewBestScore = currentScore > previousBest;
    const growthRate = previousBest > 0 ? (currentScore - previousBest) / previousBest : 0;
    const isGrowthAchieved = isNewBestScore && growthRate >= REWARD_RULES.growthRateThreshold;
    reward = {
      totalEarned: quizCount * REWARD_RULES.quizCorrectPoints
        + (isNewBestScore ? REWARD_RULES.bestScoreBonus : 0)
        + (isGrowthAchieved ? REWARD_RULES.growthBonus : 0),
      gameCompletePoints: 0,
      quizPoints: quizCount * REWARD_RULES.quizCorrectPoints,
      bestScoreBonus: isNewBestScore ? REWARD_RULES.bestScoreBonus : 0,
      growthBonus: isGrowthAchieved ? REWARD_RULES.growthBonus : 0,
      isNewBestScore,
      isGrowthAchieved,
      nextBestScore: isNewBestScore ? currentScore : previousBest,
    };
    transaction.update(studentRef, {
      totalPoints: Math.max(0, Number(student.totalPoints || 0)) + reward.totalEarned,
      bestScore: reward.nextBestScore,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(scoreRef, {
      rewardGranted: true,
      rewardEarned: reward.totalEarned,
      rewardBreakdown: reward,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { reward };
}

async function recordPracticeCompletion(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  const practiceRunId = requirePracticeRunId(body.practiceRunId);
  const requestedDuration = Number(body.durationSec || 0);
  const durationSec = Number.isFinite(requestedDuration)
    ? Math.max(0, Math.floor(requestedDuration))
    : 0;
  const requestedCorrectChars = Number(body.correctChars || 0);
  const correctChars = Number.isFinite(requestedCorrectChars)
    ? Math.max(0, Math.floor(requestedCorrectChars))
    : 0;
  const requestedCpm = Number(body.cpm || 0);
  const cpm = Number.isFinite(requestedCpm)
    ? Math.max(0, Math.floor(requestedCpm))
    : 0;

  if (
    durationSec < PRACTICE_RECORD_RULES.minDurationSec
    || cpm < PRACTICE_RECORD_RULES.minCpm
    || correctChars <= 0
  ) {
    return {
      recorded: false,
      reason: 'practice-threshold-not-met',
      minDurationSec: PRACTICE_RECORD_RULES.minDurationSec,
      minCpm: PRACTICE_RECORD_RULES.minCpm,
    };
  }

  const session = await requireSession(uid, studentId);
  const { data: student } = await getActiveStudent(studentId);
  if (session.classId !== student.classId) {
    throw new ApiError(403, 'api/permission-denied', '학급 정보가 일치하지 않습니다.');
  }
  const profile = await safeLoginProfile(studentId, student);

  const recordRef = publicCollection(PATHS.practiceRecords).doc(`${studentId}_${practiceRunId}`);
  let created = false;
  await database().runTransaction(async (transaction) => {
    const existing = await transaction.get(recordRef);
    if (existing.exists) return;

    transaction.create(recordRef, {
      entryType: 'practice',
      classId: student.classId,
      className: profile.className,
      studentId,
      nickname: profile.name,
      userId: uid,
      practiceRunId,
      durationSec,
      correctChars,
      cpm,
      createdAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });
    created = true;
  });

  return { recorded: created };
}

async function findActiveStudentSession(studentId) {
  const sessions = await publicCollection(PATHS.studentSessions)
    .where('studentId', '==', studentId)
    .get();
  const activeSessions = sessions.docs
    .map((snapshot) => ({ uid: snapshot.id, data: snapshot.data() }))
    .filter((session) => toMillis(session.data.expiresAt) > Date.now())
    .sort((a, b) => toMillis(b.data.expiresAt) - toMillis(a.data.expiresAt));
  return activeSessions[0] || null;
}

async function createDuelChallenge(uid, body) {
  const targetStudentId = requireString(body.targetStudentId, 'targetStudentId');
  const callerSession = await publicCollection(PATHS.studentSessions).doc(uid).get();
  if (!callerSession.exists || toMillis(callerSession.data().expiresAt) <= Date.now()) {
    throw new ApiError(403, 'api/permission-denied', '학생 인증이 만료되었습니다.');
  }
  const challengerStudentId = callerSession.data().studentId;
  if (!challengerStudentId || challengerStudentId === targetStudentId) {
    throw new ApiError(400, 'api/invalid-argument', '본인에게는 결투를 신청할 수 없습니다.');
  }
  const [{ data: initialChallenger }, { data: initialTarget }] = await Promise.all([
    getActiveStudent(challengerStudentId),
    getActiveStudent(targetStudentId),
  ]);
  if (callerSession.data().classId !== initialChallenger.classId) {
    throw new ApiError(403, 'api/permission-denied', '신청 학생의 학급 정보가 일치하지 않습니다.');
  }
  const [challengerProfile, targetProfile] = await Promise.all([
    safeLoginProfile(challengerStudentId, initialChallenger),
    safeLoginProfile(targetStudentId, initialTarget),
  ]);

  const targetSession = await findActiveStudentSession(targetStudentId);
  if (!targetSession) {
    throw new ApiError(409, 'api/failed-precondition', '상대 학생이 현재 로그인 상태가 아닙니다.');
  }

  const challengeRef = publicCollection(PATHS.duelChallenges).doc(targetSession.uid);
  const challengerRef = publicCollection(PATHS.classStudents).doc(challengerStudentId);
  const targetRef = publicCollection(PATHS.classStudents).doc(targetStudentId);
  const now = Date.now();
  const expiresAt = Timestamp.fromMillis(now + DUEL_RULES.challengeDurationMs);
  let challenge;

  await database().runTransaction(async (transaction) => {
    const [challengerSnapshot, targetSnapshot, existingChallenge] = await Promise.all([
      transaction.get(challengerRef),
      transaction.get(targetRef),
      transaction.get(challengeRef),
    ]);
    if (!challengerSnapshot.exists || challengerSnapshot.data().active === false) {
      throw new ApiError(404, 'api/not-found', '신청 학생 정보를 찾을 수 없습니다.');
    }
    if (!targetSnapshot.exists || targetSnapshot.data().active === false) {
      throw new ApiError(404, 'api/not-found', '상대 학생 정보를 찾을 수 없습니다.');
    }
    const challenger = challengerSnapshot.data();
    const target = targetSnapshot.data();
    if (hasActiveStudentActivity(challenger) || hasActiveStudentActivity(target)) {
      throw new ApiError(409, 'api/failed-precondition', '이미 진행 중인 결투 신청 또는 결투가 있습니다.');
    }
    if (Number(challenger.totalPoints || 0) < DUEL_RULES.stakePoints) {
      throw new ApiError(409, 'api/failed-precondition', '결투 신청에는 5P 이상이 필요합니다.');
    }
    if (Number(target.totalPoints || 0) < DUEL_RULES.stakePoints) {
      throw new ApiError(409, 'api/failed-precondition', '상대 학생의 포인트가 5P보다 적습니다.');
    }
    assertDuelDailyLimit(challenger);
    assertDuelDailyLimit(target);
    if (
      existingChallenge.exists
      && existingChallenge.data().status === 'pending'
      && toMillis(existingChallenge.data().expiresAt) > now
    ) {
      throw new ApiError(409, 'api/already-exists', '상대 학생에게 이미 도착한 결투 신청이 있습니다.');
    }

    challenge = {
      status: 'pending',
      challengerStudentId,
      challengerName: challenger.name || challengerProfile.name || '',
      challengerClassId: challenger.classId || '',
      challengerClassName: challengerProfile.className || challenger.className || '',
      challengerUserId: uid,
      targetStudentId,
      targetName: target.name || targetProfile.name || '',
      targetClassId: target.classId || '',
      targetClassName: targetProfile.className || target.className || '',
      targetUserId: targetSession.uid,
      participantUids: [uid, targetSession.uid],
      stakePoints: DUEL_RULES.stakePoints,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.set(challengeRef, challenge);
    transaction.update(challengerRef, activeChallengeFields(targetSession.uid, 'challenger', expiresAt));
    transaction.update(targetRef, activeChallengeFields(targetSession.uid, 'target', expiresAt));
  });

  return {
    challenge: {
      ...challenge,
      id: targetSession.uid,
      createdAt: now,
      updatedAt: now,
      expiresAt: expiresAt.toMillis(),
    },
  };
}

async function rejectDuelChallenge(uid, body) {
  const targetStudentId = requireString(body.targetStudentId, 'targetStudentId');
  await requireSession(uid, targetStudentId);
  const challengeRef = publicCollection(PATHS.duelChallenges).doc(uid);

  await database().runTransaction(async (transaction) => {
    const challengeSnapshot = await transaction.get(challengeRef);
    if (!challengeSnapshot.exists) return;
    const challenge = challengeSnapshot.data();
    if (challenge.targetUserId !== uid || challenge.targetStudentId !== targetStudentId) {
      throw new ApiError(403, 'api/permission-denied', '결투 신청을 거절할 권한이 없습니다.');
    }
    if (challenge.status !== 'pending') return;
    const challengerRef = publicCollection(PATHS.classStudents).doc(challenge.challengerStudentId);
    const targetRef = publicCollection(PATHS.classStudents).doc(targetStudentId);
    const [challengerSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(challengerRef),
      transaction.get(targetRef),
    ]);
    transaction.update(challengeRef, {
      status: 'rejected',
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (challengerSnapshot.exists) transaction.update(challengerRef, clearChallengeFields());
    if (targetSnapshot.exists) transaction.update(targetRef, clearChallengeFields());
  });
  return { success: true };
}

async function acceptDuelChallenge(uid, body) {
  const targetStudentId = requireString(body.targetStudentId, 'targetStudentId');
  await requireSession(uid, targetStudentId);
  const quizSequence = sanitizeQuizSequence(body.quizSequence);
  const challengeRef = publicCollection(PATHS.duelChallenges).doc(uid);
  const duelRef = publicCollection(PATHS.duels).doc();
  let responseDuel;

  await database().runTransaction(async (transaction) => {
    const challengeSnapshot = await transaction.get(challengeRef);
    if (!challengeSnapshot.exists) throw new ApiError(404, 'api/not-found', '결투 신청을 찾을 수 없습니다.');
    const challenge = challengeSnapshot.data();
    if (challenge.targetUserId !== uid || challenge.targetStudentId !== targetStudentId) {
      throw new ApiError(403, 'api/permission-denied', '결투 신청을 수락할 권한이 없습니다.');
    }
    if (challenge.status !== 'pending' || toMillis(challenge.expiresAt) <= Date.now()) {
      throw new ApiError(409, 'api/failed-precondition', '결투 신청 시간이 만료되었습니다.');
    }

    const challengerRef = publicCollection(PATHS.classStudents).doc(challenge.challengerStudentId);
    const targetRef = publicCollection(PATHS.classStudents).doc(targetStudentId);
    const [challengerSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(challengerRef),
      transaction.get(targetRef),
    ]);
    if (!challengerSnapshot.exists || !targetSnapshot.exists) {
      throw new ApiError(404, 'api/not-found', '결투 참가 학생 정보를 찾을 수 없습니다.');
    }
    const challenger = challengerSnapshot.data();
    const target = targetSnapshot.data();
    const challengerPoints = Math.max(0, Number(challenger.totalPoints || 0));
    const targetPoints = Math.max(0, Number(target.totalPoints || 0));
    if (challengerPoints < DUEL_RULES.stakePoints || targetPoints < DUEL_RULES.stakePoints) {
      throw new ApiError(409, 'api/failed-precondition', '두 학생 모두 5P 이상 보유해야 합니다.');
    }
    assertDuelDailyLimit(challenger);
    assertDuelDailyLimit(target);

    const startsAt = Timestamp.fromMillis(Date.now() + DUEL_RULES.countdownMs);
    const endsAt = Timestamp.fromMillis(startsAt.toMillis() + DUEL_RULES.durationMs);
    const challengerScoreRef = publicCollection(PATHS.duelScores).doc(`${duelRef.id}_${challenge.challengerStudentId}`);
    const targetScoreRef = publicCollection(PATHS.duelScores).doc(`${duelRef.id}_${targetStudentId}`);
    const participantUids = [challenge.challengerUserId, uid];
    const randomSeed = Math.floor(Math.random() * 2147483646) + 1;
    const baseDuelScore = {
      duelId: duelRef.id,
      entryType: 'duel',
      participantUids,
      score: 0,
      cpm: 0,
      correctChars: 0,
      quizCorrectCount: 0,
      wordIndex: 0,
      quizIndex: 0,
      wordCountSinceQuiz: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const duel = {
      status: 'playing',
      duration: DUEL_RULES.durationMs / 1000,
      mode: 'mixed',
      stakePoints: DUEL_RULES.stakePoints,
      randomSeed,
      quizSequence,
      participantUids,
      participantStudentIds: [challenge.challengerStudentId, targetStudentId],
      challengerStudentId: challenge.challengerStudentId,
      challengerName: challenge.challengerName || challenger.name || '',
      challengerClassId: challenger.classId || challenge.challengerClassId || '',
      challengerClassName: challenge.challengerClassName || challenger.className || '',
      challengerUserId: challenge.challengerUserId,
      challengerScoreId: challengerScoreRef.id,
      targetStudentId,
      targetName: challenge.targetName || target.name || '',
      targetClassId: target.classId || challenge.targetClassId || '',
      targetClassName: challenge.targetClassName || target.className || '',
      targetUserId: uid,
      targetScoreId: targetScoreRef.id,
      startsAt,
      endsAt,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    transaction.create(duelRef, duel);
    transaction.create(challengerScoreRef, {
      ...baseDuelScore,
      studentId: challenge.challengerStudentId,
      classId: challenger.classId || '',
      className: challenge.challengerClassName || challenger.className || '',
      nickname: challenge.challengerName || challenger.name || '',
      userId: challenge.challengerUserId,
    });
    transaction.create(targetScoreRef, {
      ...baseDuelScore,
      studentId: targetStudentId,
      classId: target.classId || '',
      className: challenge.targetClassName || target.className || '',
      nickname: challenge.targetName || target.name || '',
      userId: uid,
    });
    transaction.update(challengerRef, {
      ...clearChallengeFields(),
      totalPoints: challengerPoints - DUEL_RULES.stakePoints,
      activeDuelId: duelRef.id,
    });
    transaction.update(targetRef, {
      ...clearChallengeFields(),
      totalPoints: targetPoints - DUEL_RULES.stakePoints,
      activeDuelId: duelRef.id,
    });
    transaction.update(challengeRef, {
      status: 'accepted',
      duelId: duelRef.id,
      respondedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    responseDuel = safeDuel(duelRef.id, duel);
  });

  return { duel: responseDuel };
}

async function getActiveDuel(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  await requireSession(uid, studentId);
  const { data: student } = await getActiveStudent(studentId);
  if (!student.activeDuelId) {
    return {
      duel: null,
      outgoingChallengeTargetId: student.activeChallengeRole === 'challenger'
        && toMillis(student.activeChallengeExpiresAt) > Date.now()
        ? student.activeChallengeId || ''
        : '',
    };
  }
  const duelSnapshot = await publicCollection(PATHS.duels).doc(student.activeDuelId).get();
  if (!duelSnapshot.exists) {
    await publicCollection(PATHS.classStudents).doc(studentId).update({
      activeDuelId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { duel: null, outgoingChallengeTargetId: '' };
  }
  const duel = duelSnapshot.data();
  if (!Array.isArray(duel.participantUids) || !duel.participantUids.includes(uid)) {
    throw new ApiError(403, 'api/permission-denied', '결투 참가 정보가 일치하지 않습니다.');
  }
  return { duel: safeDuel(duelSnapshot.id, duel), outgoingChallengeTargetId: '' };
}

async function getDuelHistory(uid, body) {
  const studentId = requireString(body.studentId, 'studentId');
  await requireSession(uid, studentId);
  const cursorMillis = Math.max(0, Number(body.cursorMillis || 0));

  let historyQuery = publicCollection(PATHS.duels)
    .where('participantStudentIds', 'array-contains', studentId)
    .where('status', '==', 'completed')
    .orderBy('completedAt', 'desc')
    .limit(10);
  if (cursorMillis > 0) {
    historyQuery = historyQuery.startAfter(Timestamp.fromMillis(cursorMillis));
  }

  const snapshot = await historyQuery.get();
  const records = snapshot.docs.map((duelSnapshot) => (
    safeDuelHistoryItem(duelSnapshot.id, duelSnapshot.data())
  ));
  const lastRecord = records[records.length - 1] || null;

  return {
    records,
    nextCursorMillis: records.length === 10 ? Number(lastRecord?.completedAt || 0) : 0,
    hasMore: records.length === 10,
  };
}

async function getTeacherDuelHistory(uid, body) {
  if (uid !== TEACHER_UID) {
    throw new ApiError(403, 'api/permission-denied', '관리자 권한이 필요합니다.');
  }
  const cursorMillis = Math.max(0, Number(body.cursorMillis || 0));

  let historyQuery = publicCollection(PATHS.duels)
    .orderBy('completedAt', 'desc')
    .limit(10);
  if (cursorMillis > 0) {
    historyQuery = historyQuery.startAfter(Timestamp.fromMillis(cursorMillis));
  }

  const snapshot = await historyQuery.get();
  const records = snapshot.docs.map((duelSnapshot) => (
    safeDuelHistoryItem(duelSnapshot.id, duelSnapshot.data())
  ));
  const lastRecord = records[records.length - 1] || null;

  return {
    records,
    nextCursorMillis: records.length === 10 ? Number(lastRecord?.completedAt || 0) : 0,
    hasMore: records.length === 10,
  };
}

async function finalizeDuelInternal(uid, body, teacherFinalize = false) {
  const duelId = requireString(body.duelId, 'duelId');
  const studentId = teacherFinalize ? '' : requireString(body.studentId, 'studentId');
  if (teacherFinalize) {
    if (uid !== TEACHER_UID) throw new ApiError(403, 'api/permission-denied', '관리자 권한이 필요합니다.');
  } else {
    await requireSession(uid, studentId);
  }
  const duelRef = publicCollection(PATHS.duels).doc(duelId);
  let finalizedDuel;

  await database().runTransaction(async (transaction) => {
    const duelSnapshot = await transaction.get(duelRef);
    if (!duelSnapshot.exists) throw new ApiError(404, 'api/not-found', '결투 기록을 찾을 수 없습니다.');
    const duel = duelSnapshot.data();
    if (!teacherFinalize && (!duel.participantStudentIds?.includes(studentId) || !duel.participantUids?.includes(uid))) {
      throw new ApiError(403, 'api/permission-denied', '결투 결과를 확정할 권한이 없습니다.');
    }
    if (duel.status === 'completed') {
      finalizedDuel = safeDuel(duelSnapshot.id, duel);
      return;
    }

    const challengerScoreRef = publicCollection(PATHS.duelScores).doc(duel.challengerScoreId);
    const targetScoreRef = publicCollection(PATHS.duelScores).doc(duel.targetScoreId);
    const [challengerScoreSnapshot, targetScoreSnapshot] = await Promise.all([
      transaction.get(challengerScoreRef),
      transaction.get(targetScoreRef),
    ]);
    if (!challengerScoreSnapshot.exists || !targetScoreSnapshot.exists) {
      throw new ApiError(404, 'api/not-found', '결투 점수 기록을 찾을 수 없습니다.');
    }
    const challengerScore = challengerScoreSnapshot.data();
    const targetScore = targetScoreSnapshot.data();
    const bothFinished = Boolean(challengerScore.finishedAt) && Boolean(targetScore.finishedAt);
    const isExpired = isDuelExpired(duel.endsAt);
    if (teacherFinalize && !isExpired) {
      throw new ApiError(409, 'api/failed-precondition', '종료 시간이 지난 결투만 관리자가 확정할 수 있습니다.');
    }
    if (!teacherFinalize && !isExpired && !bothFinished) {
      throw new ApiError(409, 'api/failed-precondition', '아직 결투가 종료되지 않았습니다.');
    }

    const challengerRef = publicCollection(PATHS.classStudents).doc(duel.challengerStudentId);
    const targetRef = publicCollection(PATHS.classStudents).doc(duel.targetStudentId);
    const [challengerSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(challengerRef),
      transaction.get(targetRef),
    ]);
    if (!challengerSnapshot.exists || !targetSnapshot.exists) {
      throw new ApiError(404, 'api/not-found', '결투 참가 학생 정보를 찾을 수 없습니다.');
    }
    const challengerPoints = Math.max(0, Number(challengerSnapshot.data().totalPoints || 0));
    const targetPoints = Math.max(0, Number(targetSnapshot.data().totalPoints || 0));
    const challengerFinalScore = Number(challengerScore.score || 0);
    const targetFinalScore = Number(targetScore.score || 0);
    const stake = Number(duel.stakePoints || DUEL_RULES.stakePoints);
    const settlement = calculateDuelSettlement(challengerFinalScore, targetFinalScore, stake);
    const { isDraw, challengerRefund, targetRefund } = settlement;
    const winnerStudentId = settlement.winnerSide === 'challenger'
      ? duel.challengerStudentId
      : settlement.winnerSide === 'target'
        ? duel.targetStudentId
        : null;
    const loserStudentId = isDraw
      ? null
      : winnerStudentId === duel.challengerStudentId
        ? duel.targetStudentId
        : duel.challengerStudentId;
    const completedAt = Timestamp.now();
    const completedDateKey = getKoreanDateKey(completedAt.toMillis());
    const challengerDailyWinPoints = getDuelDailyWinPoints(challengerSnapshot.data(), completedDateKey);
    const targetDailyWinPoints = getDuelDailyWinPoints(targetSnapshot.data(), completedDateKey);
    const updates = {
      status: 'completed',
      result: isDraw ? 'draw' : 'win',
      winnerStudentId,
      loserStudentId,
      pointTransfer: settlement.pointTransfer,
      rewardDateKey: completedDateKey,
      finalScores: {
        challenger: {
          studentId: duel.challengerStudentId,
          nickname: duel.challengerName || '',
          score: challengerFinalScore,
          cpm: Number(challengerScore.cpm || 0),
          correctChars: Number(challengerScore.correctChars || 0),
          quizCorrectCount: Number(challengerScore.quizCorrectCount || 0),
        },
        target: {
          studentId: duel.targetStudentId,
          nickname: duel.targetName || '',
          score: targetFinalScore,
          cpm: Number(targetScore.cpm || 0),
          correctChars: Number(targetScore.correctChars || 0),
          quizCorrectCount: Number(targetScore.quizCorrectCount || 0),
        },
      },
      completedAt,
      ...(teacherFinalize ? {
        finalizedBy: 'teacher',
        finalizedByUid: uid,
        finalizeReason: 'expired',
      } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.update(challengerRef, {
      totalPoints: challengerPoints + challengerRefund,
      ...(winnerStudentId === duel.challengerStudentId ? {
        duelDailyWinDate: completedDateKey,
        duelDailyWinPoints: challengerDailyWinPoints + stake,
      } : {}),
      activeDuelId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(targetRef, {
      totalPoints: targetPoints + targetRefund,
      ...(winnerStudentId === duel.targetStudentId ? {
        duelDailyWinDate: completedDateKey,
        duelDailyWinPoints: targetDailyWinPoints + stake,
      } : {}),
      activeDuelId: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(challengerScoreRef, { finalizedAt: completedAt, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(targetScoreRef, { finalizedAt: completedAt, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(duelRef, updates);
    finalizedDuel = safeDuel(duelSnapshot.id, { ...duel, ...updates });
  });

  if (teacherFinalize) return { duel: finalizedDuel };
  const { data: student } = await getActiveStudent(studentId);
  return { duel: finalizedDuel, profile: await safeLoginProfile(studentId, student) };
}

async function finalizeDuel(uid, body) {
  return finalizeDuelInternal(uid, body, false);
}

async function finalizeExpiredDuel(uid, body) {
  return finalizeDuelInternal(uid, body, true);
}

async function syncPublicClassRoster(uid) {
  if (uid !== TEACHER_UID) throw new ApiError(403, 'api/permission-denied', '관리자 권한이 없습니다.');
  const students = await publicCollection(PATHS.classStudents).get();
  let batch = database().batch();
  let pending = 0;
  let synced = 0;
  for (const student of students.docs) {
    const data = student.data();
    batch.set(publicCollection(PATHS.classRoster).doc(student.id), {
      classId: data.classId || '',
      name: data.name || '',
      active: data.active !== false,
      hasPin: Boolean(data.studentPin),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    pending += 1;
    synced += 1;
    if (pending === 400) {
      await batch.commit();
      batch = database().batch();
      pending = 0;
    }
  }
  if (pending) await batch.commit();
  return { synced };
}

const actions = {
  getStudentSession,
  logoutStudentSession,
  verifyStudentLoginPin,
  setInitialStudentLoginPin,
  verifyStudentPin,
  setInitialStudentPin,
  joinClassGame,
  joinGuestGame,
  buyStudentShopItem,
  equipStudentCosmetic,
  finalizeStudentReward,
  recordPracticeCompletion,
  syncPublicClassRoster,
  createDuelChallenge,
  rejectDuelChallenge,
  acceptDuelChallenge,
  getActiveDuel,
  getDuelHistory,
  getTeacherDuelHistory,
  finalizeDuel,
  finalizeExpiredDuel,
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: { code: 'api/method-not-allowed', message: 'POST 요청만 허용됩니다.' } });
  }

  try {
    const decodedToken = await authenticate(request);
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body || {};
    const action = requireString(body.action, 'action', 50);
    const actionHandler = actions[action];
    if (!actionHandler) throw new ApiError(404, 'api/not-found', '지원하지 않는 보안 작업입니다.');
    const data = await actionHandler(decodedToken.uid, body);
    return response.status(200).json({ data });
  } catch (error) {
    console.error(error);
    const status = error instanceof ApiError ? error.status : 500;
    const code = error instanceof ApiError ? error.code : 'api/internal';
    const message = error instanceof ApiError ? error.message : '서버 처리 중 오류가 발생했습니다.';
    return response.status(status).json({ error: { code, message } });
  }
}

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

function safeProfile(studentId, data = {}) {
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

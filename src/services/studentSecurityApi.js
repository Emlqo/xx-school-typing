import { auth } from './firebaseClient.js';

export const getGachaShop = (payload) => call('getGachaShop', payload);
export const saveGachaShop = (payload) => call('saveGachaShop', payload);
export const drawGacha = (payload) => call('drawGacha', payload);
export const listShopHistory = (payload) => call('listShopHistory', payload);
export const fulfillShopPurchase = (purchaseId) => call('fulfillShopPurchase', { purchaseId });

export const submitSubwayRun = (scoreId, answers, hints = {}) => call('submitSubwayRun', { scoreId, answers, hints });

async function call(action, payload = {}, signal) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('로그인이 필요합니다.');

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/student-security', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ action, ...payload }),
    signal,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || '보안 API 요청에 실패했습니다.');
    error.code = result.error?.code || 'api/error';
    error.status = response.status;
    throw error;
  }
  return result.data;
}

export const verifyStudentPin = (roomId, studentId, pin) => call('verifyStudentPin', { roomId, studentId, pin });
export const setInitialStudentPin = (roomId, studentId, pin) => call('setInitialStudentPin', { roomId, studentId, pin });
export const getStudentSession = () => call('getStudentSession');
export const getStudentHome = () => call('getStudentHome');
export const initializeHomeAnnouncements = () => call('initializeHomeAnnouncements');
export const updateSchoolAnnouncement = (payload) => call('updateSchoolAnnouncement', payload);
export const createTypeforgeEntry = (payload) => call('createTypeforgeEntry', payload);
export const getTypeforgeProfileGear = () => call('getTypeforgeProfileGear');
export const verifyTypeforgePracticeGear = (ticket) => call('verifyTypeforgePracticeGear', { ticket });
export const logoutStudentSession = () => call('logoutStudentSession');
export const verifyStudentLoginPin = (classId, name, pin) => call('verifyStudentLoginPin', { classId, name, pin });
export const setInitialStudentLoginPin = (classId, name, pin) => call('setInitialStudentLoginPin', { classId, name, pin });
export const joinClassGame = (roomId, studentId) => call('joinClassGame', { roomId, studentId });
export async function useTypeforgeRoomBenefit(scoreId, benefit, attemptId) {
  const payload = { scoreId, benefit, attemptId };
  try {
    return await call('useTypeforgeRoomBenefit', payload, AbortSignal.timeout(2500));
  } catch (error) {
    if (error.status && error.status < 500) throw error;
    return call('useTypeforgeRoomBenefit', payload, AbortSignal.timeout(3000));
  }
}
export const joinGuestGame = (roomCode, nickname) => call('joinGuestGame', { roomCode, nickname });
export async function buyStudentShopItem(studentId, itemId, expectedPrice) {
  const key = `shop-season2-buy-${studentId}-${itemId}`;
  const pending = JSON.parse(localStorage.getItem(key) || 'null') || { studentId, itemId, expectedPrice, requestId: crypto.randomUUID() };
  localStorage.setItem(key, JSON.stringify(pending));
  try {
    const result = await call('buyStudentShopItem', pending);
    localStorage.removeItem(key);
    return result;
  } catch (error) {
    if (['api/failed-precondition', 'api/invalid-argument', 'api/resource-exhausted', 'api/already-exists', 'api/not-found'].includes(error.code)) localStorage.removeItem(key);
    throw error;
  }
}
export const equipStudentCosmetic = (studentId, cosmeticId) => call('equipStudentCosmetic', { studentId, cosmeticId });
export const finalizeStudentReward = (scoreId, finalScore) => call('finalizeStudentReward', { scoreId, finalScore });
export const getFinishedClassScoreboard = (roomId, signal) => call('getFinishedClassScoreboard', { roomId }, signal);
export const finalizeFinishedClassRankRewards = (roomId) => call('finalizeFinishedClassRankRewards', { roomId });
export const removeClassRoomScoreboard = (roomId, excludeScores = false) => call('removeClassRoomScoreboard', { roomId, excludeScores });
export const recordPracticeCompletion = (studentId, practiceRunId, durationSec, correctChars, cpm) => call(
  'recordPracticeCompletion',
  { studentId, practiceRunId, durationSec, correctChars, cpm },
);
export const syncPublicClassRoster = () => call('syncPublicClassRoster');
export const createDuelChallenge = (targetStudentId) => call('createDuelChallenge', { targetStudentId });
export const rejectDuelChallenge = (targetStudentId) => call('rejectDuelChallenge', { targetStudentId });
export const acceptDuelChallenge = (targetStudentId, quizSequence) => call(
  'acceptDuelChallenge',
  { targetStudentId, quizSequence },
);
export const getActiveDuel = (studentId) => call('getActiveDuel', { studentId });
export const getDuelHistory = (studentId, cursorMillis = 0) => call(
  'getDuelHistory',
  { studentId, cursorMillis },
);
export const getTeacherDuelHistory = (cursorMillis = 0) => call(
  'getTeacherDuelHistory',
  { cursorMillis },
);
export const finalizeDuel = (duelId, studentId) => call('finalizeDuel', { duelId, studentId });
export const activateDuelBooster = (duelId, studentId) => call(
  'activateDuelBooster',
  { duelId, studentId },
);
export const finalizeExpiredDuel = (duelId) => call('finalizeExpiredDuel', { duelId });
export const cancelAllActiveDuels = () => call('cancelAllActiveDuels');
export const listActiveAssessments = () => call('listActiveAssessments');
export const reportGameScreenExit = (scoreId, reason, revision = 0) => call('reportGameScreenExit', { scoreId, reason, revision });
export const allowGameReentry = (scoreId) => call('allowGameReentry', { scoreId });
export const startAssessment = (assessmentId) => call('startAssessment', { assessmentId });
export const submitAssessment = (assessmentId, answers) => call('submitAssessment', { assessmentId, answers });
export const listTeacherAssessmentQuestions = () => call('listTeacherAssessmentQuestions');
export const createTeacherAssessmentQuestions = (questions) => call(
  'createTeacherAssessmentQuestions',
  { questions },
);
export const updateTeacherAssessmentQuestion = (question) => call(
  'updateTeacherAssessmentQuestion',
  { question },
);
export const deleteTeacherAssessmentQuestion = (questionId) => call(
  'deleteTeacherAssessmentQuestion',
  { questionId },
);
export const deleteTeacherAssessmentQuestions = (questionIds) => call(
  'deleteTeacherAssessmentQuestions',
  { questionIds },
);
export const listTeacherAssessments = () => call('listTeacherAssessments');
export const getTeacherAssessment = (assessmentId) => call('getTeacherAssessment', { assessmentId });
export const saveTeacherAssessment = (assessment) => call('saveTeacherAssessment', { assessment });
export const updateTeacherAssessmentStatus = (assessmentId, status) => call(
  'updateTeacherAssessmentStatus',
  { assessmentId, status },
);
export const deleteTeacherAssessment = (assessmentId) => call('deleteTeacherAssessment', { assessmentId });
export const getTeacherAssessmentStatus = (assessmentId, classId) => call(
  'getTeacherAssessmentStatus',
  { assessmentId, classId },
);
export const resetTeacherAssessmentSubmission = (assessmentId, studentId) => call(
  'resetTeacherAssessmentSubmission',
  { assessmentId, studentId },
);

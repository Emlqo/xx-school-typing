import { auth } from './firebaseClient.js';

async function call(action, payload = {}) {
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
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error?.message || '보안 API 요청에 실패했습니다.');
    error.code = result.error?.code || 'api/error';
    throw error;
  }
  return result.data;
}

export const verifyStudentPin = (roomId, studentId, pin) => call('verifyStudentPin', { roomId, studentId, pin });
export const setInitialStudentPin = (roomId, studentId, pin) => call('setInitialStudentPin', { roomId, studentId, pin });
export const getStudentSession = () => call('getStudentSession');
export const logoutStudentSession = () => call('logoutStudentSession');
export const verifyStudentLoginPin = (studentId, pin) => call('verifyStudentLoginPin', { studentId, pin });
export const setInitialStudentLoginPin = (studentId, pin) => call('setInitialStudentLoginPin', { studentId, pin });
export const joinClassGame = (roomId, studentId) => call('joinClassGame', { roomId, studentId });
export const joinGuestGame = (roomCode, nickname) => call('joinGuestGame', { roomCode, nickname });
export const buyStudentShopItem = (studentId, itemId) => call('buyStudentShopItem', { studentId, itemId });
export const equipStudentCosmetic = (studentId, cosmeticId) => call('equipStudentCosmetic', { studentId, cosmeticId });
export const finalizeStudentReward = (scoreId) => call('finalizeStudentReward', { scoreId });
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
export const finalizeExpiredDuel = (duelId) => call('finalizeExpiredDuel', { duelId });
export const cancelAllActiveDuels = () => call('cancelAllActiveDuels');

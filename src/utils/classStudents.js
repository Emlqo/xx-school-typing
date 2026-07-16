export function getDefaultClassStudentRewardFields() {
  return {
    totalPoints: 0,
    bestScore: 0,
    ownedCosmetics: [],
    equippedCosmetic: null,
    studentPin: '',
    duelDailyWinDate: '',
    duelDailyWinPoints: 0,
  };
}

export function getKoreanDateKey(now = Date.now()) {
  return new Date(Number(now) + (9 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}

export function getCurrentDuelDailyWinPoints(student = {}, now = Date.now()) {
  if (String(student.duelDailyWinDate || '') !== getKoreanDateKey(now)) return 0;
  return Math.max(0, Number(student.duelDailyWinPoints || 0));
}

export function normalizeClassStudent(student = {}) {
  const ownedCosmetics = Array.isArray(student.ownedCosmetics)
    ? student.ownedCosmetics.filter(Boolean)
    : [];

  return {
    ...student,
    totalPoints: Math.max(0, Number(student.totalPoints || 0)),
    bestScore: Math.max(0, Number(student.bestScore || 0)),
    ownedCosmetics,
    equippedCosmetic: student.equippedCosmetic || null,
    studentPin: student.studentPin ? String(student.studentPin) : '',
    duelDailyWinDate: student.duelDailyWinDate ? String(student.duelDailyWinDate) : '',
    duelDailyWinPoints: Math.max(0, Number(student.duelDailyWinPoints || 0)),
  };
}

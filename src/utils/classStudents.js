export function getDefaultClassStudentRewardFields() {
  return {
    totalPoints: 0,
    bestScore: 0,
    ownedCosmetics: [],
    equippedCosmetic: null,
    studentPin: '',
  };
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
  };
}

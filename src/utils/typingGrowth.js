const SAMPLE_SIZE = 3;
const TYPING_MODES = new Set(['ko', 'en', 'mixed']);

export function growthMillis(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
}

export function growthDateKey(value) {
  const millis = growthMillis(value);
  return millis > 0 ? new Date(millis + 9 * 60 * 60 * 1000).toISOString().slice(0, 10) : '';
}

// Compare two non-overlapping samples; points, quizzes and attendance do not affect the ranking.
export function calculateTypingGrowth(records = [], { classId, fromDate = '', toDate = '', now = Date.now() } = {}) {
  const games = new Map();
  for (const score of records) {
    const room = score.room;
    const createdAt = growthMillis(score.createdAt);
    const dateKey = growthDateKey(score.createdAt);
    const cpm = Number(score.cpm);
    if (score.entryType !== 'class' || !score.classId || !score.studentId || !score.roomId
      || (classId && score.classId !== classId) || !room || !TYPING_MODES.has(room.mode)
      || (score.gameType && score.gameType !== 'typing') || !createdAt
      || !Number.isFinite(cpm) || cpm <= 0 || !(Number(score.correctChars) > 0)
      || score.screenExitDetected || score.excludedFromHallOfFame || score.roomDeleted
      || room.deleted || room.deletedAt || room.status === 'waiting'
      || (growthMillis(room.expiresAt) > now)
      || (score.difficulty || 'normal') !== 'normal' || Number(score.pointWeight ?? 1) !== 1
      || (fromDate && dateKey < fromDate) || (toDate && dateKey > toDate)) continue;
    const key = `${score.classId}:${score.studentId}:${score.roomId}`;
    const previous = games.get(key);
    const savedAt = growthMillis(score.updatedAt) || createdAt;
    if (!previous || savedAt > previous.savedAt) games.set(key, { ...score, cpm, createdMillis: createdAt, savedAt });
  }

  const students = new Map();
  for (const score of games.values()) {
    const key = `${score.classId}:${score.studentId}`;
    if (!students.has(key)) students.set(key, []);
    students.get(key).push(score);
  }
  const rankings = [];
  let eligibleStudentCount = 0;
  for (const scores of students.values()) {
    scores.sort((a, b) => a.createdMillis - b.createdMillis || String(a.roomId).localeCompare(String(b.roomId)));
    if (scores.length < SAMPLE_SIZE * 2) continue;
    eligibleStudentCount++;
    const sample = list => list.map(score => ({ date: growthDateKey(score.createdAt), cpm: score.cpm }));
    const first = sample(scores.slice(0, SAMPLE_SIZE));
    const recent = sample(scores.slice(-SAMPLE_SIZE));
    const average = list => list.reduce((sum, record) => sum + record.cpm, 0) / list.length;
    const initialCpm = average(first);
    const recentCpm = average(recent);
    if (recentCpm <= initialCpm) continue;
    const latest = scores.at(-1);
    rankings.push({ studentId: latest.studentId, classId: latest.classId, nickname: latest.nickname || '이름 없음',
      recordCount: scores.length, initialCpm, recentCpm, gain: recentCpm - initialCpm,
      growthPercent: (recentCpm / initialCpm - 1) * 100, first, recent });
  }
  rankings.sort((a, b) => b.gain - a.gain || b.recentCpm - a.recentCpm
    || a.nickname.localeCompare(b.nickname, 'ko') || String(a.studentId).localeCompare(String(b.studentId)));
  return { rankings, validRecordCount: games.size, eligibleStudentCount };
}

export function selectGrowthTopFive(rankings = [], excludedStudentIds = []) {
  const excluded = new Set(excludedStudentIds);
  const winners = rankings.filter(row => !excluded.has(row.studentId)).slice(0, 5);
  const places = new Map(winners.map((row, index) => [row.studentId, index + 1]));
  return rankings.filter(row => excluded.has(row.studentId) || places.has(row.studentId))
    .map(row => ({ ...row, excluded: excluded.has(row.studentId), rank: places.get(row.studentId) || null }));
}

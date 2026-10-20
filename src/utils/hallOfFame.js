import { LINE_4 } from './subway.js';

const TOP_LIMIT = 10;

export function getMonthKey(date = new Date()) {
  const targetDate = date instanceof Date ? date : new Date(date);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getScoreCreatedMillis(score = {}) {
  const value = score.createdAt;

  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeClassScore(score = {}) {
  if (score.screenExitDetected) return null;
  if (score.gameType === 'subway') return null;
  if (score.excludedFromHallOfFame === true || score.roomDeleted === true) return null;
  if (score.entryType !== 'class' || !score.classId || !score.studentId) return null;

  return {
    ...score,
    classId: String(score.classId),
    className: score.className || '',
    studentId: String(score.studentId),
    nickname: score.nickname || '',
    score: Number(score.score || 0),
    cpm: Number(score.cpm || 0),
    quizCorrectCount: Number(score.quizCorrectCount || 0),
    createdMillis: getScoreCreatedMillis(score),
  };
}

function getClassScores(monthlyScores = []) {
  return monthlyScores
    .map((score) => normalizeClassScore(score))
    .filter(Boolean);
}

function normalizePracticeRecord(record = {}) {
  if (record.entryType !== 'practice' || !record.classId || !record.studentId) return null;

  return {
    ...record,
    classId: String(record.classId),
    className: record.className || '',
    studentId: String(record.studentId),
    nickname: record.nickname || '',
  };
}

function getStudentKey(score) {
  return `${score.classId}:${score.studentId}`;
}

function createStudentSummary(score) {
  return {
    classId: score.classId,
    className: score.className,
    studentId: score.studentId,
    nickname: score.nickname,
    totalScore: 0,
    totalQuizCorrectCount: 0,
    maxCpm: 0,
    gamesPlayed: 0,
    scores: [],
  };
}

function summarizeByStudent(monthlyScores = []) {
  const summaries = new Map();

  getClassScores(monthlyScores).forEach((score) => {
    const key = getStudentKey(score);
    const summary = summaries.get(key) || createStudentSummary(score);

    summary.className = summary.className || score.className;
    summary.nickname = summary.nickname || score.nickname;
    summary.totalScore += score.score;
    summary.totalQuizCorrectCount += score.quizCorrectCount;
    summary.maxCpm = Math.max(summary.maxCpm, score.cpm);
    summary.gamesPlayed += 1;
    summary.scores.push(score);
    summaries.set(key, summary);
  });

  return [...summaries.values()];
}

function sortRankings(items, getValue) {
  return [...items].sort((a, b) => {
    const valueDiff = getValue(b) - getValue(a);
    if (valueDiff !== 0) return valueDiff;

    const scoreDiff = (b.totalScore || b.score || 0) - (a.totalScore || a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return String(a.nickname || '').localeCompare(String(b.nickname || ''));
  });
}

export function calculateClassMvp(monthlyScores = []) {
  const classScores = getClassScores(monthlyScores);
  const summariesByStudent = new Map(
    summarizeByStudent(monthlyScores).map((summary) => [getStudentKey(summary), summary]),
  );
  const bestByClass = new Map();

  classScores.forEach((score) => {
    const previous = bestByClass.get(score.classId);
    if (!previous || score.score > previous.score) {
      bestByClass.set(score.classId, score);
      return;
    }

    if (score.score === previous.score && score.cpm > previous.cpm) {
      bestByClass.set(score.classId, score);
      return;
    }

    if (
      score.score === previous.score
      && score.cpm === previous.cpm
      && score.createdMillis < previous.createdMillis
    ) {
      bestByClass.set(score.classId, score);
    }
  });

  return [...bestByClass.values()]
    .sort((a, b) => String(a.className || a.classId).localeCompare(String(b.className || b.classId)))
    .map((score) => {
      const summary = summariesByStudent.get(getStudentKey(score)) || createStudentSummary(score);

      return {
        ...summary,
        bestScore: score.score,
        bestCpm: score.cpm,
        achievedAt: score.createdMillis,
        value: score.score,
      };
    });
}

export function calculateQuizKing(monthlyScores = []) {
  const summariesByStudent = new Map(
    summarizeByStudent(monthlyScores).map((summary) => [getStudentKey(summary), summary]),
  );
  const bestQuizScoreByStudent = new Map();

  getClassScores(monthlyScores).forEach((score) => {
    if (score.quizCorrectCount <= 0) return;

    const previous = bestQuizScoreByStudent.get(getStudentKey(score));
    if (!previous || score.quizCorrectCount > previous.quizCorrectCount) {
      bestQuizScoreByStudent.set(getStudentKey(score), score);
      return;
    }

    if (score.quizCorrectCount === previous.quizCorrectCount && score.score > previous.score) {
      bestQuizScoreByStudent.set(getStudentKey(score), score);
      return;
    }

    if (
      score.quizCorrectCount === previous.quizCorrectCount
      && score.score === previous.score
      && score.cpm > previous.cpm
    ) {
      bestQuizScoreByStudent.set(getStudentKey(score), score);
    }
  });

  return sortRankings(
    [...bestQuizScoreByStudent.values()].map((score) => {
      const summary = summariesByStudent.get(getStudentKey(score)) || createStudentSummary(score);

      return {
        ...summary,
        bestQuizCorrectCount: score.quizCorrectCount,
        bestScore: score.score,
        bestCpm: score.cpm,
        achievedAt: score.createdMillis,
        value: score.quizCorrectCount,
      };
    }),
    (summary) => summary.bestQuizCorrectCount || summary.value || 0,
  )
    .slice(0, TOP_LIMIT);
}

export function calculateSpeedKing(monthlyScores = []) {
  return sortRankings(
    summarizeByStudent(monthlyScores),
    (summary) => summary.maxCpm,
  )
    .slice(0, TOP_LIMIT)
    .map((summary) => ({
      ...summary,
      value: summary.maxCpm,
    }));
}

export function calculateParticipationKing(monthlyPracticeRecords = []) {
  const summaries = new Map();
  monthlyPracticeRecords
    .map((record) => normalizePracticeRecord(record))
    .filter(Boolean)
    .forEach((record) => {
      const key = getStudentKey(record);
      const summary = summaries.get(key) || createStudentSummary(record);
      summary.gamesPlayed += 1;
      summaries.set(key, summary);
    });

  return sortRankings(
    [...summaries.values()],
    (summary) => summary.gamesPlayed,
  )
    .slice(0, TOP_LIMIT)
    .map((summary) => ({
      ...summary,
      value: summary.gamesPlayed,
    }));
}

export function calculateGrowthKing(monthlyScores = []) {
  const growthRankings = summarizeByStudent(monthlyScores)
    .map((summary) => {
      const sortedScores = [...summary.scores].sort((a, b) => a.createdMillis - b.createdMillis);
      if (sortedScores.length < 2) return null;

      const firstScore = sortedScores[0].score;
      const lastScore = sortedScores[sortedScores.length - 1].score;
      const growth = lastScore - firstScore;

      return {
        ...summary,
        firstScore,
        lastScore,
        growth,
        value: growth,
      };
    })
    .filter(Boolean);

  return sortRankings(growthRankings, (summary) => summary.growth).slice(0, TOP_LIMIT);
}

export function calculateMemoryKing(monthlyScores = []) {
  const bestByStudent = new Map();
  const compare = (a, b) => b.value - a.value
    || (a.memoryCompleted && b.memoryCompleted ? a.memoryElapsedMs - b.memoryElapsedMs : 0)
    || a.nickname.localeCompare(b.nickname, 'ko')
    || a.studentId.localeCompare(b.studentId);

  for (const record of monthlyScores) {
    if (record.entryType !== 'class' || !record.classId || !record.studentId
      || record.gameType !== 'subway' || record.screenExitDetected
      || record.excludedFromHallOfFame === true || record.roomDeleted === true
      || !['completed', 'timeout'].includes(record.subwayStatus)) continue;
    // Legacy recall records uniquely contain subwayAnswers; ordered modes do not.
    if ((record.subwayPractice && record.subwayPractice !== 'recall')
      || (record.subwayLine && record.subwayLine !== '4')
      || (record.subwayRouteCount && record.subwayRouteCount !== LINE_4.length)
      || !Array.isArray(record.subwayAnswers)) continue;
    if (record.subwayAnswers.some(name => !LINE_4.includes(name))) continue;
    const count = new Set(record.subwayAnswers).size;
    if (!count) continue;
    const completed = count === LINE_4.length;
    const elapsed = Number(record.subwayElapsedMs);
    if (completed && (record.subwayStatus !== 'completed' || !Number.isFinite(elapsed) || elapsed <= 0)) continue;
    const item = {
      classId: String(record.classId), className: record.className || '',
      studentId: String(record.studentId), nickname: String(record.nickname || ''),
      value: count, memoryCompleted: completed, memoryElapsedMs: completed ? elapsed : 0,
      achievedAt: getScoreCreatedMillis(record),
    };
    const key = getStudentKey(item);
    if (!bestByStudent.has(key) || compare(item, bestByStudent.get(key)) < 0) bestByStudent.set(key, item);
  }
  return [...bestByStudent.values()].sort(compare).slice(0, TOP_LIMIT);
}

export function calculateHallOfFame(monthlyScores = [], monthlyPracticeRecords = []) {
  return {
    classMvp: calculateClassMvp(monthlyScores),
    quizKing: calculateQuizKing(monthlyScores),
    speedKing: calculateSpeedKing(monthlyScores),
    memoryKing: calculateMemoryKing(monthlyScores),
    participationKing: calculateParticipationKing(monthlyPracticeRecords),
    growthKing: calculateGrowthKing(monthlyScores),
  };
}

export function getHallOfFameTitleWinners(hallOfFame = {}) {
  const overallMvp = (hallOfFame.classMvp || []).reduce((best, candidate) => (
    !best || Number(candidate.value || 0) > Number(best.value || 0) ? candidate : best
  ), null);

  return [
    { category: 'mvp', winner: overallMvp },
    { category: 'quizKing', winner: hallOfFame.quizKing?.[0] || null },
    { category: 'speedKing', winner: hallOfFame.speedKing?.[0] || null },
    { category: 'memoryKing', winner: hallOfFame.memoryKing?.[0] || null },
    { category: 'participationKing', winner: hallOfFame.participationKing?.[0] || null },
  ].filter(({ winner }) => winner?.studentId);
}

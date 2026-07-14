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

export function calculateHallOfFame(monthlyScores = [], monthlyPracticeRecords = []) {
  return {
    classMvp: calculateClassMvp(monthlyScores),
    quizKing: calculateQuizKing(monthlyScores),
    speedKing: calculateSpeedKing(monthlyScores),
    participationKing: calculateParticipationKing(monthlyPracticeRecords),
    growthKing: calculateGrowthKing(monthlyScores),
  };
}

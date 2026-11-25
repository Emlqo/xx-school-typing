export const CLASS_SCOREBOARD_SETTLE_MS = 10000;

export function getScoreboardTime(value) {
  if (typeof value === 'number') return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function getClassScoreboardEnd(room) {
  if (room?.entryType !== 'class' || room.mode === 'subway' || room.status !== 'playing') return 0;
  return getScoreboardTime(room.expiresAt);
}

export function selectLeaderboardScores(scores, preferProgress = true) {
  const latestByStudent = new Map();
  const hasProgress = (record) => Number(record?.score || 0) !== 0
    || Number(record?.correctChars || 0) > 0 || Number(record?.quizCorrectCount || 0) > 0;
  const updatedAt = (record) => getScoreboardTime(record?.updatedAt) || getScoreboardTime(record?.createdAt);

  for (const record of scores) {
    const key = record.studentId ? `student:${record.studentId}` : `guest:${record.nickname || record.userId || record.id}`;
    const previous = latestByStudent.get(key);
    if (!previous) {
      latestByStudent.set(key, record);
      continue;
    }
    if (preferProgress && hasProgress(record) !== hasProgress(previous)) {
      if (hasProgress(record)) latestByStudent.set(key, record);
      continue;
    }
    const timeDifference = updatedAt(record) - updatedAt(previous);
    if (timeDifference > 0 || (timeDifference === 0 && Number(record.score || 0) > Number(previous.score || 0))) {
      latestByStudent.set(key, record);
    }
  }
  return [...latestByStudent.values()].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
}

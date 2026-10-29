import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTypingGrowth, growthDateKey, selectGrowthTopFive } from '../src/utils/typingGrowth.js';

const start = Date.UTC(2026, 5, 1);
const room = { mode: 'mixed', status: 'playing', expiresAt: start - 1 };
const recordsFor = (studentId, initial = 30, recent = 60) => Array.from({ length: 6 }, (_, index) => ({
  id: `${studentId}-${index}`, classId: 'class1', studentId, nickname: studentId,
  roomId: `room-${index}`, entryType: 'class', gameType: 'typing', correctChars: 100,
  cpm: index < 3 ? initial : recent, createdAt: start + index * 86400000, room,
}));

test('first and last three valid games determine growth, not points or quizzes', () => {
  const records = recordsFor('student');
  records[0].score = 999999;
  records[0].quizCorrectCount = 100;
  const result = calculateTypingGrowth(records, { classId: 'class1' });
  assert.equal(result.rankings[0].initialCpm, 30);
  assert.equal(result.rankings[0].recentCpm, 60);
  assert.equal(result.rankings[0].gain, 30);
  assert.equal(result.rankings[0].growthPercent, 100);
  assert.equal(result.rankings[0].recordCount, 6);
  assert.equal(result.validRecordCount, 6);
  assert.equal(calculateTypingGrowth(records.slice(0, 5)).rankings.length, 0);
  assert.equal(calculateTypingGrowth(recordsFor('falling', 60, 30)).rankings.length, 0);
});

test('invalid, guest, subway, missing/deleted rooms, weighted and ongoing records are excluded', () => {
  const patches = [{ entryType: 'guest' }, { gameType: 'subway' }, { room: null },
    { screenExitDetected: true }, { roomDeleted: true }, { excludedFromHallOfFame: true },
    { room: { ...room, mode: 'subway' } }, { room: { ...room, deletedAt: start } },
    { room: { ...room, expiresAt: Date.now() + 60000 } }, { room: { ...room, status: 'waiting' } },
    { cpm: 0 }, { correctChars: 0 }, { cpm: Infinity }, { pointWeight: 1.5 }, { difficulty: 'hard' },
    { createdAt: null }, { studentId: '' }, { classId: 'other' }];
  for (const patch of patches) {
    const invalid = recordsFor('bad').map(item => ({ ...item, ...patch }));
    assert.equal(calculateTypingGrowth(invalid, { classId: 'class1' }).validRecordCount, 0, JSON.stringify(patch));
  }
  const legacy = recordsFor('legacy').map(({ gameType, ...rest }) => rest);
  assert.equal(calculateTypingGrowth(legacy).rankings.length, 1);
});

test('same-room duplicates use latest saved record and cannot create extra participation', () => {
  const records = recordsFor('student');
  records.push({ ...records[0], id: 'duplicate', cpm: 45, updatedAt: start + 10 });
  const result = calculateTypingGrowth(records);
  assert.equal(result.validRecordCount, 6);
  assert.equal(result.rankings[0].initialCpm, 35);
  assert.equal(result.rankings[0].gain, 25);
});

test('Korean date boundaries and selected period are applied without mixing class identities', () => {
  assert.equal(growthDateKey(Date.UTC(2026, 5, 1, 15)), '2026-06-02');
  const a = recordsFor('student');
  const b = recordsFor('student', 10, 90).map(item => ({ ...item, classId: 'class2' }));
  assert.equal(calculateTypingGrowth([...a, ...b]).rankings.length, 2);
  assert.equal(calculateTypingGrowth(a, { fromDate: '2026-06-02' }).rankings.length, 0);
  assert.equal(calculateTypingGrowth(a, { toDate: '2026-06-05' }).rankings.length, 0);
});

test('excluded rows remain visible and the next candidate fills the fifth slot; restore is reversible', () => {
  const records = Array.from({ length: 8 }, (_, index) => recordsFor(`student${index}`, 30, 110 - index * 5)).flat();
  const { rankings } = calculateTypingGrowth(records);
  const excluded = ['student0', 'student2'];
  const rows = selectGrowthTopFive(rankings, excluded);
  assert.equal(rows.length, 7);
  assert.deepEqual(rows.filter(row => !row.excluded).map(row => row.studentId), ['student1', 'student3', 'student4', 'student5', 'student6']);
  assert.deepEqual(rows.filter(row => !row.excluded).map(row => row.rank), [1, 2, 3, 4, 5]);
  assert.equal(rows.find(row => row.studentId === 'student0').rank, null);
  assert.deepEqual(selectGrowthTopFive(rankings, []).map(row => row.studentId), ['student0', 'student1', 'student2', 'student3', 'student4']);
  assert.equal(records.length, 48);
});

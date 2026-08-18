import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDuelQuizSequence,
  getDuelRemainingSeconds,
  getDuelScoreReadPlan,
  getDuelWord,
} from '../src/utils/duel.js';
import { calculateDuelSettlement, isDuelExpired } from '../api/student-security.js';
import { getCurrentDuelDailyWinPoints, getKoreanDateKey } from '../src/utils/classStudents.js';
import { DUEL_RULES } from '../src/constants/duelRules.js';

test('duel score synchronization uses a traffic-safe interval', () => {
  assert.equal(DUEL_RULES.scoreSyncIntervalMs, 15_000);
});

test('students listen only to the opponent score while teachers can listen to both', () => {
  const duel = {
    challengerStudentId: 'student-a',
    challengerScoreId: 'score-a',
    targetStudentId: 'student-b',
    targetScoreId: 'score-b',
  };

  assert.deepEqual(getDuelScoreReadPlan(duel, 'student-a'), {
    scoreIds: ['score-a', 'score-b'],
    ownScoreId: 'score-a',
    realtimeScoreIds: ['score-b'],
  });
  assert.deepEqual(getDuelScoreReadPlan(duel, ''), {
    scoreIds: ['score-a', 'score-b'],
    ownScoreId: '',
    realtimeScoreIds: ['score-a', 'score-b'],
  });
});

test('missing active duel produces an empty score read plan', () => {
  assert.deepEqual(getDuelScoreReadPlan(null, 'student-a'), {
    scoreIds: [],
    ownScoreId: '',
    realtimeScoreIds: [],
  });
});

test('same duel seed produces the same word sequence', () => {
  const first = Array.from({ length: 30 }, (_, index) => getDuelWord(123456, index));
  const second = Array.from({ length: 30 }, (_, index) => getDuelWord(123456, index));
  assert.deepEqual(first, second);
  assert.ok(new Set(first).size > 1);
});

test('duel quiz snapshot keeps only valid four-option quizzes', () => {
  const sequence = createDuelQuizSequence([
    { id: 'q1', question: 'Q1', options: ['1', '2', '3', '4'], answer: 2 },
    { id: 'invalid', question: 'Q2', options: ['1', '2'], answer: 0 },
  ]);
  assert.equal(sequence.length, 1);
  assert.equal(sequence[0].id, 'q1');
  assert.equal(sequence[0].answer, 2);
});

test('remaining duel time is calculated from the shared server end time', () => {
  assert.equal(getDuelRemainingSeconds({ endsAt: 310000 }, 10000), 300);
  assert.equal(getDuelRemainingSeconds({ endsAt: 9000 }, 10000), 0);
});

test('daily duel winnings reset at Korean midnight without a database write', () => {
  const beforeMidnight = Date.parse('2026-07-16T14:59:59.000Z');
  const afterMidnight = Date.parse('2026-07-16T15:00:00.000Z');
  const student = {
    duelDailyWinDate: getKoreanDateKey(beforeMidnight),
    duelDailyWinPoints: 15,
  };

  assert.equal(getCurrentDuelDailyWinPoints(student, beforeMidnight), 15);
  assert.equal(getCurrentDuelDailyWinPoints(student, afterMidnight), 0);
});

test('teacher can finalize only after the duel end grace period', () => {
  const endsAt = 1_000_000;
  assert.equal(isDuelExpired(null, endsAt + 10_000, 3_000), false);
  assert.equal(isDuelExpired(endsAt, endsAt + 2_999, 3_000), false);
  assert.equal(isDuelExpired(endsAt, endsAt + 3_000, 3_000), true);
});

test('expired duel settlement awards the pot once or refunds a draw', () => {
  assert.deepEqual(calculateDuelSettlement(1200, 800, 5), {
    isDraw: false,
    winnerSide: 'challenger',
    pointTransfer: 5,
    challengerRefund: 10,
    targetRefund: 0,
  });
  assert.deepEqual(calculateDuelSettlement(900, 900, 5), {
    isDraw: true,
    winnerSide: null,
    pointTransfer: 0,
    challengerRefund: 5,
    targetRefund: 5,
  });
});

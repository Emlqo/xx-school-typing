import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDuelQuizSequence,
  getDuelRemainingSeconds,
  getDuelWord,
} from '../src/utils/duel.js';
import { getCurrentDuelDailyWinPoints, getKoreanDateKey } from '../src/utils/classStudents.js';

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

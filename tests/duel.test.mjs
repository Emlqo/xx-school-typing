import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDuelQuizSequence,
  getDuelBoosterState,
  getDuelRemainingSeconds,
  getDuelScoreReadPlan,
  getDuelWord,
} from '../src/utils/duel.js';
import {
  areDuelsEnabled,
  calculateDuelSettlement,
  DUEL_RULES as DUEL_SERVER_RULES,
  isDuelExpired,
} from '../api/student-security.js';
import { getCurrentDuelDailyWinPoints, getKoreanDateKey } from '../src/utils/classStudents.js';
import { DUEL_RULES } from '../src/constants/duelRules.js';
import { KOREAN_WORDS, ENGLISH_WORDS } from '../src/constants/words.js';
import { LEGACY_DUEL_WORDS } from '../src/constants/legacyDuelWords.js';

test('duel score synchronization uses a traffic-safe interval', () => {
  assert.equal(DUEL_RULES.scoreSyncIntervalMs, 15_000);
});

test('duel duration is three minutes on the client and server', () => {
  assert.equal(DUEL_RULES.durationSeconds, 180);
  assert.equal(DUEL_SERVER_RULES.durationMs, 180_000);
});

test('duel booster duration matches on the client and trusted server', () => {
  assert.equal(DUEL_RULES.boosterDurationSeconds, 25);
  assert.equal(DUEL_SERVER_RULES.boosterDurationMs, 25_000);
});

test('duel availability defaults to on and respects the teacher switch', () => {
  assert.equal(areDuelsEnabled(null), true);
  assert.equal(areDuelsEnabled({}), true);
  assert.equal(areDuelsEnabled({ enabled: true }), true);
  assert.equal(areDuelsEnabled({ enabled: false }), false);
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

test('the new word bank replaces both languages and legacy duels keep their original word bank', () => {
  const legacy = new Set(LEGACY_DUEL_WORDS);
  for (const words of [KOREAN_WORDS, ENGLISH_WORDS]) {
    assert.ok(words.filter((word) => word.includes(' ')).length >= 100);
    assert.ok(words.filter((word) => !word.includes(' ')).length >= 150);
    assert.ok(words.every((word) => !legacy.has(word)));
    assert.equal(new Set(words).size, words.length);
  }
  const restored = Array.from({ length: 30 }, (_, index) => getDuelWord(123456, index, 1));
  assert.ok(restored.every((word) => legacy.has(word)));
  assert.ok(restored.every((word, index) => word !== getDuelWord(123456, index)));
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

test('duel booster use survives refresh and restores only the remaining time', () => {
  const now = 100_000;
  assert.deepEqual(getDuelBoosterState({}, now), {
    available: true,
    active: false,
    timeLeft: 0,
  });
  assert.deepEqual(getDuelBoosterState({ boosterUsed: true, boosterEndsAt: now + 12_400 }, now), {
    available: false,
    active: true,
    timeLeft: 13,
  });
  assert.deepEqual(getDuelBoosterState({ boosterUsed: true, boosterEndsAt: now - 1 }, now), {
    available: false,
    active: false,
    timeLeft: 0,
  });
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

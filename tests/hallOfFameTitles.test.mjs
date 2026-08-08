import test from 'node:test';
import assert from 'node:assert/strict';
import { getHallOfFameTitleWinners } from '../src/utils/hallOfFame.js';

test('hall of fame title winners use one overall MVP and each ranking first place', () => {
  const winners = getHallOfFameTitleWinners({
    classMvp: [
      { studentId: 'student-a', nickname: 'A', value: 1200 },
      { studentId: 'student-b', nickname: 'B', value: 2500 },
      { studentId: 'student-c', nickname: 'C', value: 1800 },
    ],
    quizKing: [
      { studentId: 'student-c', value: 8 },
      { studentId: 'student-a', value: 7 },
    ],
    speedKing: [{ studentId: 'student-d', value: 420 }],
    participationKing: [{ studentId: 'student-b', value: 5 }],
  });

  assert.deepEqual(
    winners.map(({ category, winner }) => [category, winner.studentId]),
    [
      ['mvp', 'student-b'],
      ['quizKing', 'student-c'],
      ['speedKing', 'student-d'],
      ['participationKing', 'student-b'],
    ],
  );
});

test('hall of fame title winners skip categories without a first-place record', () => {
  assert.deepEqual(getHallOfFameTitleWinners({ classMvp: [] }), []);
});

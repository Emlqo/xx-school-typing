import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE_4, subwayRoute, subwayStart, formatRaceTime, rankSubwayResults, stationInitials, subwayHintPenalty } from '../src/utils/subway.js';
import { normalizeClassScore } from '../src/utils/hallOfFame.js';
import { calculateRankRewards } from '../src/utils/rewards.js';

test('line 4 route includes endpoints, reverses direction, rejects invalid segments', () => {
  assert.equal(LINE_4.length, 51);
  assert.equal(new Set(LINE_4).size, 51);
  assert.deepEqual(subwayRoute({ line: '4', from: '진접', to: '별내별가람' }), ['진접', '오남', '별내별가람']);
  assert.deepEqual(subwayRoute({ line: '4', from: '별내별가람', to: '진접' }), ['별내별가람', '오남', '진접']);
  assert.equal(subwayRoute().length, 6);
  assert.deepEqual(subwayRoute({ line: '4', from: '진접', to: '진접' }), []);
  assert.deepEqual(subwayRoute({ line: '4', from: '미개통', to: '진접' }), []);
});

test('memory preview is excluded and hints add time', () => {
  const room = { mode: 'subway', subway: { practice: 'memory' }, startedAt: 10000, expiresAt: 325000, duration: 300 };
  assert.equal(subwayStart(room), 25000);
  assert.equal(subwayStart({ ...room, startedAt: null }), 25000);
  assert.equal(stationInitials('별내별가람'), 'ㅂㄴㅂㄱㄹ');
  assert.equal(subwayHintPenalty({ 0: 1, 1: 2 }), 11000);
});

test('clock uses shared room start and centiseconds', () => {
  assert.equal(subwayStart({ startedAt: { seconds: 10 }, expiresAt: 310000, duration: 300 }), 10000);
  assert.equal(subwayStart({ expiresAt: 310000, duration: 300 }), 10000);
  assert.equal(formatRaceTime(65129), '01:05.12');
});

test('ties share rank and incomplete entries follow finishers', () => {
  const ranked = rankSubwayResults([
    { id: 'a', subwayStatus: 'running', subwayProgress: 12 },
    { id: 'b', subwayStatus: 'completed', subwayElapsedMs: 9000 },
    { id: 'c', subwayStatus: 'completed', subwayElapsedMs: 5000 },
    { id: 'd', subwayStatus: 'completed', subwayElapsedMs: 5000 },
  ]);
  assert.deepEqual(ranked.map((x) => x.subwayRank), [1, 1, 3, null]);
  assert.equal(ranked.at(-1).id, 'a');
});

test('subway records do not award points or enter typing hall of fame', () => {
  const record = { entryType: 'class', classId: 'c', studentId: 's', gameType: 'subway', score: 0 };
  assert.equal(normalizeClassScore(record), null);
  assert.deepEqual(calculateRankRewards([record]), []);
});

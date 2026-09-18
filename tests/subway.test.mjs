import test from 'node:test';
import assert from 'node:assert/strict';
import { LINE_4, subwayRoute, subwayStart, formatRaceTime, rankSubwayResults, stationInitials, subwayHintPenalty, subwayPreviewMs, subwayProgressSummary } from '../src/utils/subway.js';
import { normalizeClassScore } from '../src/utils/hallOfFame.js';
import { calculateRankRewards } from '../src/utils/rewards.js';
import { validSubwayAnswers } from '../src/utils/subway.js';

test('recall accepts unique stations in any order and ranks by count with ties', () => {
  const route = subwayRoute({ line: '4', practice: 'recall' });
  assert.equal(route.length, 51);
  assert.equal(validSubwayAnswers(route, ['오이도', '진접'], 'recall'), true);
  assert.equal(validSubwayAnswers(route, ['오이도', '오이도'], 'recall'), false);
  assert.equal(validSubwayAnswers(route, ['강남'], 'recall'), false);
  assert.equal(validSubwayAnswers(route, ['오이도', '진접'], 'copy'), false);
  assert.equal(subwayPreviewMs({ mode: 'subway', subway: { practice: 'recall' } }), 0);
  const room = { mode: 'subway', startedAt: 10000, duration: 180, expiresAt: 220000, subway: { practice: 'recall', previewEnabled: true, previewSeconds: 30 } };
  assert.equal(subwayPreviewMs(room), 30000);
  assert.equal(subwayStart(room), 40000);
  assert.equal(subwayStart({ ...room, startedAt: null }), 40000);
  assert.deepEqual(rankSubwayResults([{ subwayProgress: 2 }, { subwayProgress: 8 }, { subwayProgress: 8 }, { subwayProgress: 0 }], 'recall').map(s => s.subwayRank), [1, 1, 3, 4]);
});

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

test('custom preview time is shared by client/server with legacy fallback and bounds', () => {
  const room = { mode: 'subway', subway: { practice: 'memory', previewSeconds: 45 }, startedAt: 10000, duration: 300, expiresAt: 355000 };
  assert.equal(subwayPreviewMs(room), 45000);
  assert.equal(subwayStart(room), 55000);
  assert.equal(subwayStart({ ...room, startedAt: null }), 55000);
  for (const [value, expected] of [[undefined, 15000], [NaN, 15000], [-1, 5000], [900, 300000]]) {
    assert.equal(subwayPreviewMs({ ...room, subway: { practice: 'memory', previewSeconds: value } }), expected);
  }
  assert.equal(subwayPreviewMs({ ...room, subway: { practice: 'copy', previewSeconds: 45 } }), 0);
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

test('unfinished results preserve last saved stop, clamp progress and handle no arrivals', () => {
  const route = subwayRoute();
  assert.deepEqual(subwayProgressSummary(route, { subwayProgress: 2, subwayStatus: 'timeout' }), { count: 2, total: 6, percent: 33, lastStation: '오남' });
  assert.equal(subwayProgressSummary(route, {}).lastStation, null);
  assert.equal(subwayProgressSummary(route, { subwayProgress: -5 }).count, 0);
  assert.equal(subwayProgressSummary(route, { subwayProgress: 999 }).count, 6);
  assert.equal(subwayProgressSummary(route, { subwayStatus: 'completed' }).lastStation, '노원');
});

test('subway records do not award points or enter typing hall of fame', () => {
  const record = { entryType: 'class', classId: 'c', studentId: 's', gameType: 'subway', score: 0 };
  assert.equal(normalizeClassScore(record), null);
  assert.deepEqual(calculateRankRewards([record]), []);
});

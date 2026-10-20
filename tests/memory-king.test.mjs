import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LINE_4 } from '../src/utils/subway.js';
import { calculateMemoryKing, calculateHallOfFame, getHallOfFameTitleWinners } from '../src/utils/hallOfFame.js';
import { getCosmeticById, HALL_OF_FAME_TITLE_ID_LIST, HALL_OF_FAME_TITLE_IDS, isCosmeticForSale } from '../src/constants/cosmetics.js';

const record = (id, count, extra = {}) => ({
  studentId: id, classId: 'c1', className: '1학년 1반', nickname: id,
  entryType: 'class', gameType: 'subway', subwayStatus: count === 51 ? 'completed' : 'timeout',
  subwayAnswers: LINE_4.slice(0, count), subwayElapsedMs: 60000, ...extra,
});
test('count first, complete ties by time, incomplete ties by Korean name (not time)', () => {
  const scores = [record('나', 30, { subwayElapsedMs: 1000 }), record('가', 30, { subwayElapsedMs: 999999 }),
    record('완주늦음', 51, { subwayElapsedMs: 90000 }), record('완주빠름', 51),
    record('다', 40), record('완주빠름', 20)];
  assert.deepEqual(calculateMemoryKing(scores).map(x => x.studentId), ['완주빠름', '완주늦음', '다', '가', '나']);
  assert.equal(calculateMemoryKing(scores).length, 5);
});
test('exclude guest, practice, ordered modes, disqualification, deleted and unfinished games', () => {
  const variants = [
    { entryType: 'guest' }, { entryType: 'practice' }, { gameType: 'typing' },
    { subwayPractice: 'memory' }, { subwayPractice: 'copy' }, { subwayLine: '2' },
    { subwayRouteCount: 6 }, { screenExitDetected: true }, { roomDeleted: true },
    { excludedFromHallOfFame: true }, { subwayStatus: 'running' }, { studentId: '' },
    { subwayAnswers: undefined }, { subwayAnswers: ['강남'] },
  ];
  assert.deepEqual(calculateMemoryKing(variants.map((extra, i) => record(String(i), 10, extra))), []);
  assert.deepEqual(calculateMemoryKing([record('bad', 51, { subwayElapsedMs: 0 })]), []);
  assert.equal(calculateMemoryKing([record('legacy', 10)])[0].value, 10);
  assert.equal(calculateMemoryKing([record('dup', 10, { subwayAnswers: ['진접', '진접', '오남'] })])[0].value, 2);
});
test('best game rather than sum, TOP10, five title categories and no typing rewards', () => {
  const rows = Array.from({ length: 15 }, (_, i) => record(`s${i}`, i + 1));
  rows.push(record('s14', 2));
  const hall = calculateHallOfFame(rows);
  assert.equal(hall.memoryKing.length, 10);
  assert.equal(hall.memoryKing[0].value, 15);
  assert.deepEqual(hall.classMvp, []);
  const winner = getHallOfFameTitleWinners(hall).find(x => x.category === 'memoryKing');
  assert.equal(winner.winner.studentId, 's14');
  const id = HALL_OF_FAME_TITLE_IDS.memoryKing;
  assert.equal(getCosmeticById(id).name, '암기왕');
  assert.equal(HALL_OF_FAME_TITLE_ID_LIST.includes(id), true);
  assert.equal(isCosmeticForSale(id), false);
});

test('saved monthly summaries retain count/time and old summaries have empty memory rankings', () => {
  const source = readFileSync(new URL('../src/hooks/useMonthlyScores.js', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('function compactRankingItem'), source.indexOf('function sanitizeSavedHallOfFame'));
  const compact = new Function(`${block}; return compactHallOfFame;`)();
  const hall = calculateHallOfFame([record('s', 51)]);
  const saved = compact(hall);
  assert.equal(saved.memoryKing[0].memoryCompleted, true);
  assert.equal(saved.memoryKing[0].memoryElapsedMs, 60000);
  assert.equal(saved.memoryKing[0].value, 51);
  assert.deepEqual(compact({}).memoryKing, []);
  assert.equal('memoryCompleted' in compact({ quizKing: [{ value: 10 }] }).quizKing[0], false);
});

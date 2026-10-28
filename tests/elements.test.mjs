import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ELEMENTS, DEFAULT_ELEMENT_CONFIG } from '../src/constants/elements.js';
import { elementRange, isValidElementConfig, memoryAnswers, memoryPreviewMs, memoryStart, rankElementResults } from '../src/utils/memoryGame.js';
import { calculateHallOfFame, calculateElementMemoryKing, getHallOfFameTitleWinners } from '../src/utils/hallOfFame.js';
import { calculateRankRewards } from '../src/utils/rewards.js';
import { HALL_OF_FAME_TITLE_IDS, HALL_OF_FAME_TITLE_ID_LIST } from '../src/constants/cosmetics.js';
import { LINE_4, validSubwayAnswers } from '../src/utils/subway.js';

const config = { ...DEFAULT_ELEMENT_CONFIG, subject: 'elements' };
const room = { mode: 'subway', subway: config, startedAt: 10000, duration: 120, expiresAt: 145000 };
const record = (studentId, count, extra = {}) => ({ studentId, classId: 'c', nickname: studentId, entryType: 'class', gameType: 'subway', memorySubject: 'elements', subwayPractice: 'recall', elementFromNumber: 1, elementToNumber: 20, subwayStatus: count === 20 ? 'completed' : 'timeout', subwayAnswers: ELEMENTS.slice(0, count).map(item => item.name), subwayElapsedMs: 60000, ...extra });
test('all 118 numbers and symbols are contiguous and unique, with school names preserved', () => {
  assert.deepEqual(ELEMENTS.map(e => e.number), Array.from({ length: 118 }, (_, i) => i + 1));
  assert.equal(new Set(ELEMENTS.map(e => e.name)).size, 118);
  const symbols = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
  assert.deepEqual(ELEMENTS.map(e => e.symbol), symbols);
  assert.deepEqual(ELEMENTS.slice(8, 14).map(e => [e.symbol, e.name]), [['F', '플루오린'], ['Ne', '네온'], ['Na', '나트륨'], ['Mg', '마그네슘'], ['Al', '알루미늄'], ['Si', '규소']]);
  assert.equal(ELEMENTS[19].name, '칼슘');
  assert.deepEqual(ELEMENTS.slice(104).map(e => e.name), ['두브늄', '시보귬', '보륨', '하슘', '마이트너륨', '다름슈타튬', '뢴트게늄', '코페르니슘', '니호늄', '플레로븀', '모스코븀', '리버모륨', '테네신', '오가네손']);
});
test('range and preview validation preserve subway timing and support both element modes', () => {
  assert.equal(isValidElementConfig(config), true);
  assert.equal(memoryPreviewMs(room), 15000);
  assert.equal(memoryStart(room), 25000);
  assert.equal(memoryStart({ ...room, startedAt: 0 }), 25000);
  assert.equal(memoryPreviewMs({ ...room, subway: { ...config, practice: 'recall', previewSeconds: 45 } }), 45000);
  for (const patch of [{ fromNumber: 0 }, { toNumber: 119 }, { fromNumber: 10, toNumber: 1 }, { fromNumber: 1.5 }, { practice: 'copy' }, { previewSeconds: '' }, { previewSeconds: 301 }]) assert.equal(isValidElementConfig({ ...config, ...patch }), false);
  assert.deepEqual(elementRange({ fromNumber: 3, toNumber: 4 }).map(e => e.name), ['리튬', '베릴륨']);
  const subway = { mode: 'subway', subway: { line: '4', from: '진접', to: '노원', practice: 'memory' }, startedAt: 10000 };
  assert.equal(memoryStart(subway), 25000);
  assert.equal(memoryAnswers(subway).length, 6);
});
test('teacher-selected ranges beyond twenty apply to gameplay and monthly rankings', () => {
  assert.equal(isValidElementConfig({ ...config, fromNumber: 21, toNumber: 40 }), true);
  assert.equal(elementRange({ fromNumber: 21, toNumber: 40 }).length, 20);
  assert.equal(elementRange({ fromNumber: 118, toNumber: 118 })[0].name, '오가네손');
  const all = { ...room, subway: { ...config, toNumber: 118 } };
  const names = memoryAnswers(all);
  assert.equal(names.length, 118);
  assert.equal(validSubwayAnswers(names, names, 'memory'), true);
  assert.equal(validSubwayAnswers(names, [...names].reverse(), 'recall'), true);
  const rows = [{ ...record('전체암기', 20), elementToNumber: 118, subwayAnswers: names }];
  const ranking = calculateElementMemoryKing(rows);
  assert.equal(ranking[0].value, 118);
  assert.equal(ranking[0].memoryCompleted, true);
  assert.equal(ranking[0].memoryTotal, 118);
});
test('only Korean names in range pass, ordered and free recall use the same validated answer pool', () => {
  const names = memoryAnswers(room);
  assert.equal(validSubwayAnswers(names, ['수소', '헬륨'], 'memory'), true);
  assert.equal(validSubwayAnswers(names, ['헬륨', '수소'], 'memory'), false);
  assert.equal(validSubwayAnswers(names, ['칼슘', '수소'], 'recall'), true);
  for (const answers of [['H'], ['1 수소'], ['수소', '수소'], ['철']]) assert.equal(validSubwayAnswers(names, answers, 'recall'), false);
});
test('monthly element ranking is isolated, best game wins, complete ties use time and partial ties use names', () => {
  const scores = [record('가', 15, { subwayElapsedMs: 999999 }), record('나', 15, { subwayElapsedMs: 1 }), record('늦음', 20, { subwayElapsedMs: 80000 }), record('빠름', 20), record('빠름', 2), record('무효', 20, { screenExitDetected: true }), record('순서', 20, { subwayPractice: 'memory' }), record('삭제', 20, { roomDeleted: true }), record('게스트', 20, { entryType: 'guest' })];
  assert.deepEqual(calculateElementMemoryKing(scores).map(e => e.studentId), ['빠름', '늦음', '가', '나']);
  const hall = calculateHallOfFame(scores);
  assert.deepEqual(hall.memoryKing, []);
  assert.deepEqual(hall.classMvp, []);
  assert.deepEqual(calculateRankRewards(scores), []);
  assert.equal(getHallOfFameTitleWinners(hall).find(e => e.category === 'elementMemoryKing').winner.studentId, '빠름');
  assert.equal(HALL_OF_FAME_TITLE_IDS.memoryKing, HALL_OF_FAME_TITLE_IDS.elementMemoryKing);
  assert.equal(new Set(HALL_OF_FAME_TITLE_ID_LIST).size, HALL_OF_FAME_TITLE_ID_LIST.length);
  assert.deepEqual(calculateElementMemoryKing([record('subway', 20, { memorySubject: 'subway', subwayAnswers: LINE_4.slice(0, 20) })]), []);
});
test('teacher game ranking uses progress/time and appends disqualified students', () => {
  const rows = [record('나', 10, { subwayProgress: 10 }), record('가', 10, { subwayProgress: 10 }), record('끝', 20, { subwayProgress: 20 }), record('중단', 20, { subwayProgress: 20, screenExitDetected: true })];
  assert.deepEqual(rankElementResults(rows, true).map(e => e.studentId), ['끝', '가', '나', '중단']);
  assert.equal(rankElementResults(rows, true).at(-1).subwayRank, null);
});

test('saved monthly summary keeps independent element ranking and selected range for read-only display', () => {
  const source = readFileSync(new URL('../src/hooks/useMonthlyScores.js', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('function compactRankingItem'), source.indexOf('function sanitizeSavedHallOfFame'));
  const compact = new Function(`${block}; return compactHallOfFame;`)();
  const saved = compact(calculateHallOfFame([record('원소왕', 20)]));
  assert.equal(saved.elementMemoryKing[0].memoryTotal, 20);
  assert.equal(saved.elementMemoryKing[0].elementFromNumber, 1);
  assert.equal(saved.elementMemoryKing[0].elementToNumber, 20);
  assert.deepEqual(saved.memoryKing, []);
  assert.deepEqual(compact({}).elementMemoryKing, []);
});

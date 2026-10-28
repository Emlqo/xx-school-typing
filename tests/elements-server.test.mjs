import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { memoryAnswers, memoryStart, isElementRoom, isValidElementConfig } from '../src/utils/memoryGame.js';
import { subwayMillis, subwayHintPenalty, validSubwayAnswers } from '../src/utils/subway.js';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
const implementation = source.slice(source.indexOf('async function submitSubwayRun('), source.indexOf('\nconst actions =', source.indexOf('async function submitSubwayRun(')));
function fixture({ practice = 'memory', patch = {}, roomPatch = {} } = {}) {
  const now = Date.now();
  const room = { mode: 'subway', status: 'playing', duration: 120, startedAt: now - 20000, expiresAt: now + 115000, subway: { subject: 'elements', fromNumber: 1, toNumber: 3, practice, previewSeconds: 15 }, ...roomPatch };
  const score = { roomId: 'r', userId: 'u', subwayProgress: 0, ...patch };
  const writes = [], reads = [];
  const tx = { get: async ref => { reads.push(ref); return { exists: true, id: ref.split('/').at(-1), data: () => ref === 'scores/s' ? score : room }; }, update: (ref, data) => writes.push({ ref, data }) };
  class ApiError extends Error { constructor(status, code, message) { super(message); this.code = code; this.status = status; } }
  const context = { requireString: v => v, publicCollection: p => ({ doc: id => `${p}/${id}` }), PATHS: { scores: 'scores', rooms: 'rooms' }, database: () => ({ runTransaction: fn => fn(tx) }), ApiError,
    memoryAnswers, memoryStart, isElementRoom, isValidElementConfig, validSubwayAnswers, subwayMillis, subwayHintPenalty,
    safeScore: (id, data) => ({ id, ...data }), FieldValue: { serverTimestamp: () => 'server' }, Timestamp: { now: () => Date.now() } };
  return { run: new Function(...Object.keys(context), `${implementation}; return submitSubwayRun;`)(...Object.values(context)), room, writes, reads };
}
test('element result is validated on server and records range, subject and server-timed hint penalty with two reads', async () => {
  const f = fixture();
  const result = await f.run('u', { scoreId: 's', answers: ['수소', '헬륨', '리튬'], hints: { 0: 2 } });
  assert.equal(result.score.subwayStatus, 'completed');
  assert.equal(result.score.memorySubject, 'elements');
  assert.equal(result.score.elementToNumber, 3);
  assert.equal(result.score.subwayPenaltyMs, 8000);
  assert.ok(result.score.subwayElapsedMs >= 13000);
  assert.equal(f.reads.length, 2);
  assert.equal(f.writes.length, 1);
});
test('English, duplicate, wrong order, other student, disqualification and early start are rejected', async () => {
  for (const answers of [['H'], ['수소', '수소'], ['헬륨', '수소'], ['수소', '철']]) {
    const f = fixture(); await assert.rejects(f.run('u', { scoreId: 's', answers })); assert.equal(f.writes.length, 0);
  }
  for (const options of [{ patch: { userId: 'other' } }, { patch: { screenExitDetected: true } }, { roomPatch: { startedAt: Date.now() } }]) {
    const f = fixture(options); await assert.rejects(f.run('u', { scoreId: 's', answers: ['수소'] })); assert.equal(f.writes.length, 0);
  }
});
test('recall merges saved answers on reentry; final results are idempotent; timeout retains partial answers', async () => {
  const f = fixture({ practice: 'recall', patch: { subwayAnswers: ['수소'], subwayProgress: 1 } });
  const result = await f.run('u', { scoreId: 's', answers: ['리튬', '헬륨'] });
  assert.deepEqual(result.score.subwayAnswers, ['수소', '리튬', '헬륨']);
  assert.equal(result.score.subwayStatus, 'completed');
  const done = fixture({ patch: { subwayStatus: 'completed' } });
  await done.run('u', { scoreId: 's', answers: [] }); assert.equal(done.writes.length, 0);
  const expired = fixture({ practice: 'recall', roomPatch: { expiresAt: Date.now() - 1 } });
  assert.equal((await expired.run('u', { scoreId: 's', answers: ['수소'] })).score.subwayStatus, 'timeout');
});

test('existing subway submissions keep their answer pool, timing and subject', async () => {
  const f = fixture({ roomPatch: { subway: { line: '4', from: '진접', to: '별내별가람', practice: 'memory', previewSeconds: 15 } } });
  const result = await f.run('u', { scoreId: 's', answers: ['진접', '오남', '별내별가람'], hints: { 0: 1 } });
  assert.equal(result.score.memorySubject, 'subway');
  assert.equal(result.score.subwayStatus, 'completed');
  assert.equal(result.score.subwayPenaltyMs, 3000);
  assert.equal('elementFromNumber' in result.score, false);
});

test('server validates and stores full 118-element and later partial ranges without extra reads', async () => {
  for (const [from, to] of [[1, 118], [21, 40], [118, 118]]) {
    const f = fixture({ practice: 'recall', roomPatch: { subway: { subject: 'elements', fromNumber: from, toNumber: to, practice: 'recall', previewSeconds: 15 } } });
    const names = memoryAnswers(f.room).reverse();
    const result = await f.run('u', { scoreId: 's', answers: names });
    assert.equal(result.score.subwayStatus, 'completed');
    assert.equal(result.score.subwayProgress, to - from + 1);
    assert.equal(result.score.elementFromNumber, from);
    assert.equal(result.score.elementToNumber, to);
    assert.equal(f.reads.length, 2);
    assert.equal(f.writes.length, 1);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/typingGrowth.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replaceAll('export async function ', 'async function ');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function harness({ records = [], failRoom = false } = {}) {
  const auth = { currentUser: { uid: 'teacher' } };
  const metrics = { scoreReads: 0, roomReads: 0, writes: [] };
  const refs = (db, app, collection, id) => ({ collection, id });
  const api = await new AsyncFunction('arrayRemove', 'arrayUnion', 'getDocFromServer', 'getDocsFromServer', 'limit', 'query', 'serverTimestamp', 'updateDoc', 'where', 'APP_ID', 'FIRESTORE_PATHS', 'isTeacherUser', 'auth', 'db', 'getPublicCollection', 'getPublicDoc',
    `${source}; return { loadClassTypingGrowth, saveTypingGrowthExclusion };`)(
    id => ({ remove: id }), id => ({ union: id }),
    async ref => { metrics.roomReads++; if (failRoom) throw new Error('room failure'); return { id: ref.id, exists: () => true, data: () => ({ mode: 'mixed' }) }; },
    async ref => { metrics.scoreReads++; assert.equal(ref.constraints[0].field, 'classId'); assert.equal(ref.constraints[0].op, '=='); return { size: records.length, docs: records.map((data, index) => ({ id: String(index), data: () => data })) }; },
    count => ({ limit: count }), (ref, ...constraints) => ({ ref, constraints }), () => 'timestamp',
    async (ref, data) => { metrics.writes.push({ ref, data }); }, (field, op, value) => ({ field, op, value }),
    'app', { scores: 'scores', rooms: 'rooms', classes: 'classes' }, user => user?.uid === 'teacher', auth, {}, refs, refs);
  return { ...api, metrics, auth };
}

test('manual class-scoped loads cache results and coalesce concurrent clicks; refresh is explicit', async () => {
  const api = await harness({ records: [{ entryType: 'class', roomId: 'r1', cpm: 30, correctChars: 100 }] });
  const [a, b] = await Promise.all([api.loadClassTypingGrowth('c1'), api.loadClassTypingGrowth('c1')]);
  assert.equal(a, b);
  await api.loadClassTypingGrowth('c1');
  assert.equal(api.metrics.scoreReads, 1);
  assert.equal(api.metrics.roomReads, 1);
  await api.loadClassTypingGrowth('c1', { force: true });
  assert.equal(api.metrics.scoreReads, 2);
  assert.equal(api.metrics.writes.length, 0);
});

test('exceptions write only the class document once; restore never changes score data or reads records', async () => {
  const api = await harness();
  await api.saveTypingGrowthExclusion('c1', 's1', true);
  await api.saveTypingGrowthExclusion('c1', 's1', false);
  assert.equal(api.metrics.writes.length, 2);
  assert.deepEqual(api.metrics.writes.map(item => item.ref), [{ collection: 'classes', id: 'c1' }, { collection: 'classes', id: 'c1' }]);
  assert.deepEqual(api.metrics.writes[0].data.typingGrowthExcludedStudentIds, { union: 's1' });
  assert.deepEqual(api.metrics.writes[1].data.typingGrowthExcludedStudentIds, { remove: 's1' });
  assert.equal(api.metrics.scoreReads + api.metrics.roomReads, 0);
});

test('unauthorized/student sessions cannot query or write, including when cached data exists', async () => {
  const api = await harness();
  await api.loadClassTypingGrowth('c1');
  api.auth.currentUser = { uid: 'student' };
  await assert.rejects(api.loadClassTypingGrowth('c1'), /관리자/);
  await assert.rejects(api.saveTypingGrowthExclusion('c1', 's1', true), /관리자/);
  assert.equal(api.metrics.scoreReads, 1);
  assert.equal(api.metrics.writes.length, 0);
});

test('failed queries are not cached, and record limit stops analysis before room reads', async () => {
  const api = await harness({ records: [{ entryType: 'class', roomId: 'r1', cpm: 30, correctChars: 100 }], failRoom: true });
  await assert.rejects(api.loadClassTypingGrowth('c1'), /room failure/);
  await assert.rejects(api.loadClassTypingGrowth('c1'), /room failure/);
  assert.equal(api.metrics.scoreReads, 2);
  const capped = await harness({ records: Array.from({ length: 5001 }, () => ({})) });
  await assert.rejects(capped.loadClassTypingGrowth('c1'), /5,000/);
  assert.equal(capped.metrics.roomReads, 0);
});

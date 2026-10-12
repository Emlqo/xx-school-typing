import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const handler = source.split('const handleGrantClassPoints = ')[1].split('\n  const handleSetStudentPoints')[0].trim().replace(/;$/, '');
function setup(overrides = {}) {
  const writes = [], alerts = [], busy = [];
  let commits = 0;
  const context = {
    requireTeacherAccess: () => true,
    classPointsGrantLock: { current: false },
    classes: [{ id: 'a', name: '1학년 1반' }], selectedClassId: 'a',
    classStudents: [
      { id: 's1', classId: 'a', active: true },
      { id: 's2', classId: 'a', active: true },
      { id: 'other', classId: 'b', active: true },
      { id: 'inactive', classId: 'a', active: false },
    ],
    alert: message => alerts.push(message), window: { confirm: () => true },
    setIsClassPointsGranting: value => busy.push(value),
    db: {}, APP_ID: 'test', FIRESTORE_PATHS: { classStudents: 'typing_class_students' },
    getPublicDoc: (_, app, collection, id) => `${app}/${collection}/${id}`,
    increment: amount => ({ increment: amount }), serverTimestamp: () => 'timestamp',
    writeBatch: () => ({ update: (...args) => writes.push(args), commit: async () => { commits++; } }),
    console: { error() {} }, ...overrides,
  };
  const run = new Function(...Object.keys(context), `return (${handler});`)(...Object.values(context));
  return { run, writes, alerts, busy, context, get commits() { return commits; } };
}
test('one atomic batch increments only selected active students without balance reads', async () => {
  const s = setup();
  assert.equal(await s.run('25'), true);
  assert.equal(s.commits, 1);
  assert.deepEqual(s.writes.map(([path, data]) => [path, data.totalPoints]), [
    ['test/typing_class_students/s1', { increment: 25 }],
    ['test/typing_class_students/s2', { increment: 25 }],
  ]);
  assert.deepEqual(s.busy, [true, false]);
});
test('invalid amounts, cancelled confirmation, unauthorized and stale-class rosters cannot write', async () => {
  for (const amount of ['', 0, -1, 1.5, 'abc', Infinity, 1000001]) {
    const s = setup(); assert.equal(await s.run(amount), false); assert.equal(s.writes.length, 0);
  }
  for (const overrides of [
    { requireTeacherAccess: () => false }, { window: { confirm: () => false } },
    { classStudents: [{ id: 'other', classId: 'b' }] },
  ]) {
    const s = setup(overrides); assert.equal(await s.run(10), false); assert.equal(s.writes.length, 0);
  }
});
test('in-flight duplicate is blocked and errors release the lock', async () => {
  let finish;
  const s = setup({ writeBatch: () => ({ update() {}, commit: () => new Promise(resolve => { finish = resolve; }) }) });
  const first = s.run(10);
  assert.equal(await s.run(10), false);
  finish(); assert.equal(await first, true);
  const failed = setup({ writeBatch: () => ({ update() {}, commit: async () => { throw Error('denied'); } }) });
  assert.equal(await failed.run(10), false);
  assert.equal(failed.context.classPointsGrantLock.current, false);
  assert.deepEqual(failed.busy, [true, false]);
});

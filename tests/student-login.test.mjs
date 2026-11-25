import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
const loginHandlers = source.slice(
  source.indexOf('async function findStudentForLogin('),
  source.indexOf('async function requireSession('),
);

function fixture(entries) {
  const students = new Map(Object.entries(entries));
  const queries = [];
  const sessions = [];
  const roster = new Map();
  const snapshot = id => ({
    id,
    ref: id,
    exists: students.has(id),
    data: () => structuredClone(students.get(id)),
  });
  const context = {
    ApiError: class extends Error {
      constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
    requireString: value => value.trim(),
    requirePin: value => value,
    FieldValue: { serverTimestamp: () => 100 },
    PATHS: { classStudents: 'students', classRoster: 'roster' },
    publicCollection(path) {
      if (path === 'roster') return { doc: id => id };
      assert.equal(path, 'students');
      const filters = [];
      const query = {
        where(field, operator, value) {
          assert.equal(operator, '==');
          filters.push([field, value]);
          return query;
        },
        limit(count) {
          assert.equal(count, 2);
          return query;
        },
        async get() {
          queries.push(filters);
          const docs = [...students].filter(([, data]) =>
            filters.every(([field, value]) => data[field] === value)).slice(0, 2).map(([id]) => snapshot(id));
          return { docs, size: docs.length };
        },
      };
      return query;
    },
    async getActiveStudent(id) {
      const existing = snapshot(id);
      return { snapshot: existing, data: existing.data() };
    },
    async createSession(uid, studentId) {
      sessions.push([uid, studentId]);
      return 1000;
    },
    buildStudentHome: async (_uid, { studentId, sessionExpiresAt }) => ({ profile: { id: studentId }, sessionExpiresAt }),
    database: () => ({
      runTransaction: operation => operation({
        get: async id => snapshot(id),
        update: (id, data) => Object.assign(students.get(id), data),
        set: (id, data) => roster.set(id, data),
      }),
    }),
  };
  runInNewContext(loginHandlers, context);
  return {
    verify: (body, uid = 'browser') => context.verifyStudentLoginPin(uid, body),
    initialize: body => context.setInitialStudentLoginPin('browser', body),
    queries, sessions, students, roster,
  };
}

test('existing PIN sign-in looks up one name within the selected class and retains the student ID', async () => {
  const f = fixture({
    enrolled: { classId: 'room-a', name: '테스트', active: true, studentPin: '0123' },
    differentClass: { classId: 'room-b', name: '테스트', active: true, studentPin: '4567' },
    inactive: { classId: 'room-a', name: '테스트', active: false, studentPin: '4567' },
  });
  const credentials = { classId: 'room-a', name: ' 테스트 ', pin: '0123' };
  const result = await f.verify(credentials);
  assert.equal(result.profile.id, 'enrolled');
  assert.deepEqual(f.queries, [[['classId', 'room-a'], ['active', true], ['name', '테스트']]]);
  assert.deepEqual(f.sessions, [['browser', 'enrolled']]);
  await assert.rejects(() => f.verify({ ...credentials, classId: 'room-b' }), { code: 'api/permission-denied' });
  await assert.rejects(() => f.verify({ ...credentials, name: '없는 이름' }), { code: 'api/permission-denied' });
  assert.equal(f.sessions.length, 1);
  assert.equal((await f.verify({ studentId: 'enrolled', pin: '0123' })).profile.id, 'enrolled');
});

test('an unset PIN can be initialized once for a uniquely matched student', async () => {
  const student = { classId: 'room', name: '새 학생', active: true };
  const credentials = { classId: 'room', name: student.name, pin: '0420' };
  const f = fixture({ newStudent: student });
  await assert.rejects(() => f.verify(credentials), { code: 'api/pin-not-set' });
  assert.equal((await f.initialize(credentials)).profile.id, 'newStudent');
  assert.equal(f.students.get('newStudent').studentPin, '0420');
  assert.equal(f.roster.get('newStudent').hasPin, true);
  assert.equal(f.roster.get('newStudent').studentPin, undefined);
  await assert.rejects(() => f.initialize({ ...credentials, pin: '1234' }), { code: 'api/already-exists' });
  assert.equal(f.students.get('newStudent').studentPin, '0420');
  assert.equal(f.sessions.length, 1);

  const duplicates = fixture({ first: { ...student }, second: { ...student } });
  await assert.rejects(() => duplicates.verify(credentials), { code: 'api/permission-denied' });
  await assert.rejects(() => duplicates.initialize(credentials), { code: 'api/permission-denied' });
  assert.equal(duplicates.sessions.length, 0);
});

test('30 simultaneous sign-ins each query one name and create independent sessions', async () => {
  const entries = Object.fromEntries(Array.from({ length: 30 }, (_, index) => [
    `student-${index}`, { classId: 'room', name: `테스트 ${index}`, active: true, studentPin: '0420' },
  ]));
  const f = fixture(entries);
  const results = await Promise.all(Object.entries(entries).map(([id, { classId, name }]) =>
    f.verify({ classId, name, pin: '0420' }, `browser-${id}`)));
  assert.deepEqual(results.map(result => result.profile.id), Object.keys(entries));
  assert.equal(f.queries.length, 30);
  assert.ok(f.queries.every(filters => filters.length === 3 && filters.some(([field]) => field === 'name')));
  assert.equal(new Set(f.sessions.map(([uid]) => uid)).size, 30);
  assert.equal(f.roster.size, 0);
});

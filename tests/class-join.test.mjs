import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { CLASS_SCORE_ID_VERSION } from '../src/constants/gameRules.js';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const handlers = [
  between('async function getActiveStudent(', 'async function getVerifiedStudentSession('),
  between('async function findStudentForLogin(', 'async function setInitialStudentLoginPin('),
  between('async function requireSession(', 'async function verifyStudentPin('),
  between('async function findLegacyClassScore(', 'async function useTypeforgeRoomBenefit('),
].join('\n');
const now = 1000000;
const roomId = 'room';

function fixture(size = 1, roomFields = { scoreIdVersion: CLASS_SCORE_ID_VERSION }) {
  const room = { classId: 'a', className: '1학년 1반', status: 'waiting', mode: 'ko', entryType: 'class', ...roomFields };
  const docs = new Map([['rooms/room', room]]);
  for (let i = 0; i < size; i += 1) {
    docs.set(`sessions/user-${i}`, { studentId: `student-${i}`, classId: 'a', expiresAt: now + 1000 });
    docs.set(`students/student-${i}`, { name: `학생 ${i}`, classId: 'a', active: true });
  }
  const reads = [];
  const writes = [];
  const queries = [];
  const gearRequests = [];
  const versions = new Map();
  const write = (method, path, data) => {
    writes.push({ method, path });
    versions.set(path, (versions.get(path) || 0) + 1);
    if (method === 'delete') docs.delete(path);
    else if (method === 'update') docs.set(path, { ...docs.get(path), ...data });
    else docs.set(path, { ...data });
  };
  function reference(path) {
    return {
      path, id: path.split('/').at(-1),
      get: async () => getSnapshot(reference(path)),
      set: async (value) => write('set', path, value),
    };
  }
  function getSnapshot(ref) {
    reads.push(ref.path);
    const data = docs.get(ref.path);
    return { id: ref.id, ref, exists: Boolean(data), data: () => data && { ...data } };
  }
  function collection(path, filters = [], max = Infinity) {
    return {
      doc: (id) => reference(`${path}/${id}`),
      where: (field, op, value) => collection(path, [...filters, { field, op, value }], max),
      orderBy: () => collection(path, filters, max),
      limit: (count) => collection(path, filters, count),
      get: async () => {
        queries.push(path);
        const found = [...docs].filter(([key, data]) => key.startsWith(`${path}/`)
          && filters.every(({ field, op, value }) => op === '==' ? data[field] === value : data[field] <= value))
          .slice(0, max)
          .map(([key]) => getSnapshot(reference(key)));
        if (found.length === 0) reads.push(`${path} (empty query)`);
        return { docs: found, size: found.length, empty: found.length === 0 };
      },
    };
  }
  const context = {
    CLASS_SCORE_ID_VERSION,
    SESSION_MINUTES: 60,
    Date: { now: () => now },
    Timestamp: { now: () => now, fromMillis: (value) => ({ toMillis: () => value }) },
    FieldValue: { serverTimestamp: () => now },
    toMillis: (value) => Number(value?.toMillis?.() ?? value ?? 0),
    getEquippedBoosterBonus: () => 0,
    requireString: (value) => value,
    requirePin: (value) => value,
    safeScore: (id, data) => ({ id, ...data }),
    safeProfile: (id, data) => ({ id, name: data.name }),
    safeLoginProfile: async (id, data) => ({ id, name: data.name }),
    readTypeforgeGear: async ({ studentId }) => {
      gearRequests.push(studentId);
      return { type: 'gpu', level: 8 };
    },
    ApiError: class extends Error {
      constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
    PATHS: { rooms: 'rooms', classStudents: 'students', studentSessions: 'sessions', scores: 'scores', roomPresence: 'presence' },
    publicCollection: collection,
    database: () => ({
      batch: () => ({
        delete(ref) { write('delete', ref.path); },
        async commit() {},
      }),
      async runTransaction(callback) {
        for (let i = 0; i < 5; i += 1) {
          const readVersions = new Map();
          const effects = [];
          const result = await callback({
            async get(target) {
              assert.equal(effects.length, 0);
              if (!target.path) {
                const queryResult = await target.get();
                for (const entry of queryResult.docs) readVersions.set(entry.ref.path, versions.get(entry.ref.path));
                return queryResult;
              }
              readVersions.set(target.path, versions.get(target.path));
              return getSnapshot(target);
            },
            set(ref, value) { effects.push(['set', ref.path, value]); },
            update(ref, value) { effects.push(['update', ref.path, value]); },
          });
          if ([...readVersions].some(([path, version]) => versions.get(path) !== version)) continue;
          for (const effect of effects) write(...effect);
          return result;
        }
        throw new Error('transaction retry limit');
      },
    }),
  };
  runInNewContext(handlers, context);
  return {
    docs, reads, writes, queries, gearRequests,
    join: (i, uid = `user-${i}`) => context.joinClassGame(uid, { roomId, studentId: `student-${i}` }),
    login: (pin) => context.verifyStudentLoginPin('user-0', { classId: 'a', name: '학생 0', pin }),
  };
}

test('30 simultaneous entrants use 120 reads and 90 writes, with zero score or session collection queries', async () => {
  const size = 30;
  const f = fixture(size);
  const entrants = await Promise.all(Array.from({ length: size }, (_, i) => f.join(i)));
  assert.equal(f.reads.length, 4 * size);
  assert.equal(f.writes.length, 3 * size);
  assert.deepEqual(f.queries, []);
  assert.equal(f.gearRequests.length, size);
  assert.equal(new Set(entrants.map(({ score }) => score.id)).size, size);
  entrants.forEach(({ score, sessionExpiresAt }, i) => {
    assert.equal(score.id, `class_room_student-${i}`);
    assert.equal(score.typeforgeGear.level, 8);
    assert.equal(sessionExpiresAt, now + 60 * 60 * 1000);
  });
});

test('reentry uses the same score and preserves progress, screen-exit state, and the saved gear', async () => {
  const f = fixture();
  const first = await f.join(0);
  const original = f.docs.get(`scores/${first.score.id}`);
  Object.assign(original, {
    score: 250, correctChars: 18, quizCorrectCount: 2, screenExitDetected: true, screenExitRevision: 3,
    rewardGranted: true, typeforgeGear: null,
  });
  f.docs.set('sessions/new-user', { studentId: 'student-0', classId: 'a', expiresAt: now + 5000 });
  f.reads.length = 0;
  const { score } = await f.join(0, 'new-user');
  assert.equal(score.id, first.score.id);
  assert.equal(score.userId, 'new-user');
  assert.equal(score.score, 250);
  assert.equal(score.quizCorrectCount, 2);
  assert.equal(score.screenExitDetected, true);
  assert.equal(score.screenExitRevision, 3);
  assert.equal(score.rewardGranted, true);
  assert.equal(score.typeforgeGear, null);
  assert.equal(f.gearRequests.length, 1);
  assert.equal(f.reads.length, 4);
});

test('an older room reuses its progressed legacy record even if a newer empty canonical record exists', async () => {
  const f = fixture(1, {});
  const identity = { entryType: 'class', roomId, studentId: 'student-0', classId: 'a', typeforgeGear: null };
  f.docs.set('scores/class_room_student-0', { ...identity, score: 0, updatedAt: now });
  f.docs.set('scores/legacy', { ...identity, score: 700, updatedAt: now - 5000, screenExitRevision: 2 });
  const { score } = await f.join(0);
  assert.equal(score.id, 'legacy');
  assert.equal(score.score, 700);
  assert.equal(score.screenExitRevision, 2);
  assert.deepEqual(f.queries, ['scores']);
  assert.equal(f.reads.length, 5);
  assert.equal(f.gearRequests.length, 0);
  assert.equal(f.writes.filter(({ path }) => path.startsWith('scores/')).length, 1);
  assert.equal(f.docs.get('scores/class_room_student-0').score, 0);
});

test('expired or mismatched sessions, inactive students, and closed rooms cannot save scores', async () => {
  const cases = [
    ['sessions/user-0', { expiresAt: now }, 403],
    ['sessions/user-0', { studentId: 'other' }, 403],
    ['sessions/user-0', { classId: 'b' }, 403],
    ['students/student-0', { active: false }, 404],
    ['rooms/room', { classId: 'b' }, 403],
    ['rooms/room', { status: 'playing', expiresAt: now }, 403],
  ];
  for (const [doc, changes, status] of cases) {
    const f = fixture();
    Object.assign(f.docs.get(doc), changes);
    await assert.rejects(f.join(0), { status });
    assert.deepEqual(f.writes, []);
    assert.deepEqual(f.gearRequests, []);
  }
});

test('PIN login still checks the PIN and cleans obsolete sessions, unlike a verified room entry', async () => {
  const f = fixture();
  f.docs.get('students/student-0').studentPin = '1234';
  await assert.rejects(f.login('4321'), { status: 403 });
  assert.deepEqual(f.writes, []);
  f.queries.length = 0;
  f.docs.set('sessions/old-user', { studentId: 'student-0', classId: 'a', expiresAt: now - 1 });
  await f.join(0);
  assert.equal(f.docs.has('sessions/old-user'), true);
  assert.deepEqual(f.queries, []);
  await f.login('1234');
  assert.deepEqual(f.queries, ['students', 'sessions']);
  assert.equal(f.docs.has('sessions/old-user'), false);
  assert.equal(f.docs.get('sessions/user-0').expiresAt.toMillis(), now + 60 * 60 * 1000);
});

test('concurrent reentry creates only one score and preserves the gear through a retry', async () => {
  const f = fixture();
  f.docs.set('sessions/another-user', { studentId: 'student-0', classId: 'a', expiresAt: now + 5000 });
  const [first, second] = await Promise.all([f.join(0), f.join(0, 'another-user')]);
  assert.equal(first.score.id, second.score.id);
  assert.equal(f.writes.filter(({ method, path }) => method === 'set' && path.startsWith('scores/')).length, 1);
  assert.equal(f.writes.filter(({ method, path }) => method === 'update' && path.startsWith('scores/')).length, 1);
  assert.equal(f.gearRequests.length, 2);
});

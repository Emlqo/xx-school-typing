import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const handlers = [
  between('async function getActiveStudent(', 'async function requireOpenClassRoom('),
  between('async function getVerifiedStudentSession(', 'async function getStudentSession('),
  between('async function buildStudentHome(', 'async function getTypeforgeProfileGear('),
  between('async function readStudentDuelRecovery(', 'async function getDuelHistory('),
].join('\n');

function fixture(count = 1) {
  const docs = new Map([['settings/duel', { enabled: false }]]);
  const reads = [];
  const writes = [];
  const now = 1000000;
  for (let index = 0; index < count; index += 1) {
    docs.set(`sessions/user-${index}`, { studentId: `student-${index}`, classId: 'class', expiresAt: now + 1000 });
    docs.set(`students/student-${index}`, { name: `학생 ${index}`, classId: 'class', active: true, studentPin: '1234' });
  }
  const snapshot = (ref) => {
    reads.push(ref.path);
    return { id: ref.id, exists: docs.has(ref.path), data: () => docs.get(ref.path) };
  };
  function collection(path) {
    return {
      doc(id = 'new') {
        const ref = { id, path: `${path}/${id}` };
        return {
          ...ref, get: async () => snapshot(ref),
          delete: async () => docs.delete(ref.path),
          update: async (fields) => docs.set(ref.path, { ...docs.get(ref.path), ...fields }),
        };
      },
      where(field, operator, value) {
        assert.equal(operator, '==');
        return { query: true, path, field, value };
      },
    };
  }
  const context = {
    Date: { now: () => now },
    console: { error() {} },
    requireTeacher(uid) { if (uid !== 'teacher') throw new Error('teacher only'); },
    requireString: (value) => value,
    toMillis: (value) => Number(value || 0),
    safeLoginProfile: async (id, student) => ({ id, name: student.name }),
    safeDuel: (id, data) => ({ id, ...data }),
    ApiError: class extends Error {
      constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
    PATHS: { classStudents: 'students', studentSessions: 'sessions', settings: 'settings', announcements: 'announcements', duels: 'duels' },
    publicCollection: collection,
    FieldValue: { serverTimestamp: () => now, delete: () => undefined },
    database: () => ({
      runTransaction: async (operation) => {
        const effects = [];
        const result = await operation({
          async get(ref) {
            assert.equal(effects.length, 0, 'reads precede writes');
            if (!ref.query) return snapshot(ref);
            const found = [...docs].filter(([key, data]) => key.startsWith(`${ref.path}/`) && data[ref.field] === ref.value);
            if (!found.length) reads.push(`${ref.path} (empty query)`);
            return { docs: found.map(([path]) => snapshot({ path, id: path.split('/').at(-1) })) };
          },
          create(ref, fields) { this.set(ref, fields); },
          update(ref, fields) { this.set(ref, fields, { merge: true }); },
          set(ref, fields, options) {
            effects.push(() => {
              writes.push(ref.path);
              docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...fields } : fields);
            });
          },
          delete(ref) { effects.push(() => docs.delete(ref.path)); },
        });
        effects.forEach((effect) => effect());
        return result;
      },
    }),
  };
  runInNewContext(handlers, context);
  return { docs, reads, writes, home: context.getStudentHome, initialize: context.initializeHomeAnnouncements, update: context.updateSchoolAnnouncement };
}

test('30 home restorations use only 60 authentication reads and never fetch inactive duels', async () => {
  const f = fixture(30);
  const homes = await Promise.all(Array.from({ length: 30 }, (_, index) => f.home(`user-${index}`)));
  assert.equal(f.reads.length, 60);
  assert.equal(f.writes.length, 0);
  assert.ok(f.reads.every((path) => /^(sessions|students)\//.test(path)));
  for (const [index, home] of homes.entries()) {
    assert.equal(home.profile.id, `student-${index}`);
    assert.equal(home.profile.studentPin, undefined);
    assert.equal(home.duelRecovery.duel, null);
  }
});

test('duel recovery uses the verified student once and preserves session/participant checks', async () => {
  const f = fixture();
  const student = f.docs.get('students/student-0');
  student.activeDuelId = 'match';
  f.docs.set('duels/match', { participantUids: ['user-0', 'other'], status: 'playing' });
  assert.equal((await f.home('user-0')).duelRecovery.duel.id, 'match');
  assert.deepEqual(f.reads, ['sessions/user-0', 'students/student-0', 'duels/match']);
  f.docs.get('duels/match').participantUids = ['other'];
  const restored = await f.home('user-0');
  assert.equal(restored.duelRecovery, null);
  assert.equal(restored.profile.id, 'student-0');
  f.docs.get('sessions/user-0').expiresAt = 0;
  assert.equal((await f.home('user-0')).profile, null);
});

test('existing urgent announcements are initialized once and teacher changes preserve the duel switch', async () => {
  const f = fixture();
  f.docs.set('announcements/archive', { title: '일반 공지', isAlert: false });
  f.docs.set('announcements/urgent', { title: '기존 긴급', content: '오늘 일정', isAlert: true, createdAt: 50 });
  const initial = await Promise.all(Array.from({ length: 30 }, () => f.initialize()));
  assert.ok(initial.every((result) => result.urgentAnnouncements[0]?.id === 'urgent'));
  assert.equal(f.reads.length, 2);
  assert.deepEqual(f.writes, ['settings/duel']);
  f.reads.length = 0;
  assert.equal((await f.initialize()).urgentAnnouncements.length, 1);
  assert.deepEqual(f.reads, ['settings/duel']);
  await assert.rejects(f.update('user-0', { title: '긴급', content: '권한 없음', isAlert: true }), /teacher only/);
  await f.update('teacher', { title: '새 긴급', content: '본문', isAlert: true });
  assert.equal(f.docs.get('settings/duel').urgentAnnouncements[0].id, 'new');
  assert.equal(f.docs.get('settings/duel').enabled, false);
  await f.update('teacher', { announcementId: 'new', title: '일반으로 수정', content: '본문', isAlert: false });
  assert.equal(f.docs.get('settings/duel').urgentAnnouncements.length, 1);
  await f.update('teacher', { announcementId: 'urgent', remove: true });
  assert.equal(f.docs.get('settings/duel').urgentAnnouncements.length, 0);
  assert.equal(f.docs.get('settings/duel').enabled, false);
});

test('optional content uses tab storage across reloads and is erased when its student signs out', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      get length() { return values.size; },
      key: (index) => [...values.keys()][index] ?? null,
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const cache = new URL('../src/services/studentDirectoryCache.js', import.meta.url);
    const original = await import(cache.href + '?before-reload');
    const options = { maxAge: 60000, persist: true };
    const key = 'uid:home:student:shop';
    let calls = 0;
    const load = async () => [{ stock: ++calls }];
    await original.getCachedStudentDirectory(key, load, options);
    original.updateCachedStudentDirectory(key, () => [{ stock: 9 }]);
    const reloaded = await import(cache.href + '?after-reload');
    assert.deepEqual(await reloaded.getCachedStudentDirectory(key, load, options), [{ stock: 9 }]);
    assert.equal(calls, 1);
    assert.deepEqual(await reloaded.getCachedStudentDirectory(key, load, { ...options, refresh: true }), [{ stock: 2 }]);
    reloaded.clearStudentDirectoryCache('uid');
    const signedOut = await import(cache.href + '?signed-out');
    assert.deepEqual(await signedOut.getCachedStudentDirectory(key, load, options), [{ stock: 3 }]);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else delete globalThis.sessionStorage;
  }
});

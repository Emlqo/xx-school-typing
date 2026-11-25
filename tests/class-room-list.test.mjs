import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const hook = readFileSync(new URL('../src/hooks/useOpenClassRooms.js', import.meta.url), 'utf8');
const code = hook.slice(hook.indexOf('function toMillis(')).replace('export default function', 'function');
const now = 10000;

function fixture(rooms) {
  const queries = [];
  let reads = 0;
  const context = {
    Date: { now: () => now },
    db: {}, APP_ID: 'app', FIRESTORE_PATHS: { rooms: 'rooms' },
    getPublicCollection: (_db, _app, name) => name,
    where: (field, op, value) => ({ field, op, value }),
    limit: (max) => ({ max }),
    query: (name, ...clauses) => ({ name, clauses }),
    async getDocs({ name, clauses }) {
      assert.equal(name, 'rooms');
      const filters = clauses.filter((clause) => clause.field);
      queries.push(filters);
      const found = rooms.filter((room) => filters.every(({ field, op, value }) => {
        if (op === '==') return room[field] === value;
        assert.equal(op, '>');
        return room[field] > value;
      })).slice(0, clauses.find((clause) => clause.max).max);
      reads += Math.max(1, found.length);
      return { docs: found.map(({ id, ...data }) => ({ id, data: () => data })) };
    },
    useCallback: (fn) => fn,
    useEffect: () => {},
    useRef: (current) => ({ current }),
    useState: (initial) => [initial, () => {}],
  };
  runInNewContext(code, context);
  const load = (classId, index = 0) => context.useOpenClassRooms({
    user: { uid: `user-${index}` }, view: 'studentRoomEntry', classId,
  }).refreshOpenClassRooms();
  return { load, queries, reads: () => reads };
}

test('room lookup only requests the signed-in class and returns eligible waiting and playing rooms', async () => {
  const own = { classId: '7', entryType: 'class' };
  const f = fixture([
    { id: 'waiting', ...own, status: 'waiting', createdAt: 1000 },
    { id: 'in-play', ...own, status: 'playing', expiresAt: now + 1, createdAt: 2000 },
    { id: 'expired', ...own, status: 'playing', expiresAt: now },
    { id: 'closed', ...own, status: 'closed', expiresAt: now + 1000 },
    { id: 'guest', ...own, entryType: 'guest', status: 'playing', expiresAt: now + 1000 },
    { id: 'different-class', ...own, classId: '8', status: 'waiting' },
  ]);
  assert.deepEqual(Array.from(await f.load(''), (room) => room.id), []);
  assert.equal(f.queries.length, 0);
  assert.deepEqual(Array.from(await f.load('7'), (room) => room.id), ['in-play', 'waiting']);
  assert.equal(f.reads(), 2);
  assert.ok(f.queries.every((filters) => filters.some(({ field, value }) => field === 'classId' && value === '7')));
  assert.ok(f.queries[1].some(({ field, op, value }) => field === 'expiresAt' && op === '>' && value === now));
});

test('30 room list loads count only the one relevant open room when five classrooms are waiting', async () => {
  const rooms = Array.from({ length: 5 }, (_, index) => ({
    id: `room-${index}`, classId: `class-${index}`, entryType: 'class', status: 'waiting',
  }));
  const f = fixture(rooms);
  const lists = await Promise.all(Array.from({ length: 30 }, (_, index) => f.load('class-0', index)));
  assert.ok(lists.every((matches) => matches.length === 1 && matches[0].id === 'room-0'));
  assert.equal(f.reads(), 60);
});

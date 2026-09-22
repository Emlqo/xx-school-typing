import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
function fixture() {
  const score = { userId: 'student', roomId: 'room', screenExitDetected: true, score: 400, subwayProgress: 5 };
  const room = { status: 'playing', expiresAt: Date.now() + 60000 };
  let writes = 0;
  const context = {
    requireTeacher: uid => { if (uid !== 'teacher') throw new Error('forbidden'); },
    requireString: value => value,
    ApiError: class extends Error { constructor(status, code, message) { super(message); this.code = code; } },
    PATHS: { scores: 'scores', rooms: 'rooms' },
    publicCollection: path => ({ doc: id => ({ path, id }) }),
    toMillis: value => value,
    FieldValue: { serverTimestamp: () => 'server-time' },
    database: () => ({ runTransaction: async callback => callback({
      get: async ref => ({ exists: true, data: () => ref.path === 'scores' ? score : room }),
      update: (ref, values) => { writes++; Object.assign(score, values); },
    }) }),
  };
  runInNewContext(source.slice(source.indexOf('async function allowGameReentry('), source.indexOf('async function submitSubwayRun(')), context);
  return { score, room, context, writes: () => writes };
}

test('only teacher can unlock, preserving score and progress; repeated unlock is harmless', async () => {
  const f = fixture();
  await assert.rejects(f.context.allowGameReentry('student', { scoreId: 's' }), /forbidden/);
  assert.equal(f.writes(), 0);
  await f.context.allowGameReentry('teacher', { scoreId: 's' });
  assert.equal(f.score.screenExitDetected, false);
  assert.equal(f.score.screenExitRevision, 1);
  assert.equal(f.score.score, 400);
  assert.equal(f.score.subwayProgress, 5);
  await f.context.allowGameReentry('teacher', { scoreId: 's' });
  assert.equal(f.writes(), 1);
  await f.context.reportGameScreenExit('student', { scoreId: 's', reason: 'focus', revision: 0 });
  assert.equal(f.writes(), 1);
  await f.context.reportGameScreenExit('student', { scoreId: 's', reason: 'focus', revision: 1 });
  assert.equal(f.score.screenExitDetected, true);
  assert.equal(f.writes(), 2);
});

test('expired rooms cannot be unlocked and other students cannot report', async () => {
  const f = fixture();
  f.room.expiresAt = Date.now() - 1000;
  await assert.rejects(f.context.allowGameReentry('teacher', { scoreId: 's' }), /진행 중/);
  await assert.rejects(f.context.reportGameScreenExit('other', { scoreId: 's', revision: 0 }), /본인의/);
  assert.equal(f.writes(), 0);
});

test('disabled room ignores screen-exit reports without writing', async () => {
  const f = fixture();
  f.room.focusGuardEnabled = false;
  f.score.screenExitDetected = false;
  await f.context.reportGameScreenExit('student', { scoreId: 's', reason: 'focus', revision: 0 });
  assert.equal(f.writes(), 0);
  assert.equal(f.score.screenExitDetected, false);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { GAME_RULES } from '../src/constants/gameRules.js';
import { getScoreBoosterBonus } from '../src/constants/cosmetics.js';
import { getTypeforgePracticeEffects } from '../src/utils/typeforgePractice.js';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
const benefitHandler = source.slice(source.indexOf('async function useTypeforgeRoomBenefit('), source.indexOf('async function joinGuestGame('));

function fixture(level = 20, boosterBonusSeconds = 0) {
  let now = 100000;
  const score = { entryType: 'class', gameType: 'typing', userId: 'owner', studentId: 'student', classId: 'class', roomId: 'room',
    typeforgeGear: { type: 'gpu', level }, score: 500, boosterBonusSeconds };
  const session = { studentId: score.studentId, classId: score.classId, expiresAt: now + 600000 };
  const room = { mode: 'ko', status: 'playing', entryType: 'class', classId: score.classId, expiresAt: now + 120000 };
  const docs = { scores: score, studentSessions: session, rooms: room };
  const writes = [];
  const context = {
    GAME_RULES, getScoreBoosterBonus, getTypeforgePracticeEffects,
    Date: { now: () => now },
    ApiError: class extends Error { constructor(status, code, message) { super(message); this.status = status; } },
    requireString: value => value,
    toMillis: value => value || 0,
    PATHS: { scores: 'scores', studentSessions: 'studentSessions', rooms: 'rooms' },
    publicCollection: path => ({ doc: () => path }),
    database: () => ({ runTransaction: async callback => callback({
      get: async path => ({ data: () => docs[path] }),
      update: (path, values) => {
        writes.push(path);
        Object.assign(docs[path], values);
      },
    }) }),
  };
  runInNewContext(benefitHandler, context);
  const use = (benefit, attemptId, owner = 'owner') => context.useTypeforgeRoomBenefit(owner, { scoreId: 'score', benefit, attemptId });
  return { score, session, room, writes, use, now: () => now, advance: elapsed => { now += elapsed; } };
}

test('equipment protection is consumed once and the same request can be safely retried', async () => {
  const f = fixture(12);
  const attempt = randomUUID();
  assert.equal((await f.use('shield', attempt)).protected, true);
  assert.equal((await f.use('shield', attempt)).protected, true);
  assert.equal((await f.use('shield', randomUUID())).protected, false);
  assert.equal(f.score.typeforgeShieldAttemptId, attempt);
  assert.equal(f.score.score, 500);
  assert.equal(f.writes.length, 1);
});

test('equipment booster lasts 30 seconds or 35 with a title and preserves room limits on retry', async () => {
  const f = fixture(8);
  const started = await f.use('booster');
  assert.equal(started.boosterUntil, f.now() + 30000);
  f.advance(5000);
  assert.equal((await f.use('booster')).boosterUntil, started.boosterUntil);
  assert.equal(f.writes.length, 1);
  assert.equal((await f.use('shield', randomUUID())).protected, false);
  const stacked = fixture(8, 5);
  assert.equal((await stacked.use('booster')).boosterUntil, stacked.now() + 35000);
  const invalidBonus = fixture(8, 50);
  assert.equal((await invalidBonus.use('booster')).boosterUntil, invalidBonus.now() + 30000);
  const ending = fixture();
  ending.room.expiresAt = ending.now() + 7000;
  assert.equal((await ending.use('booster')).boosterUntil, ending.room.expiresAt);
  const disabled = fixture();
  disabled.score.boosterEnabled = false;
  await assert.rejects(disabled.use('booster'), { status: 409 });
  assert.equal(disabled.writes.length, 0);
});

test('a mismatched session, low level, or inactive room cannot consume an effect', async () => {
  const f = fixture(7);
  await assert.rejects(f.use('booster'), { status: 409 });
  assert.equal((await f.use('shield', randomUUID())).protected, false);
  const high = fixture();
  await assert.rejects(high.use('shield', randomUUID(), 'other'), { status: 403 });
  high.session.classId = 'different-class';
  await assert.rejects(high.use('booster'), { status: 403 });
  high.session.classId = high.score.classId;
  high.room.status = 'waiting';
  await assert.rejects(high.use('shield', randomUUID()), { status: 409 });
  assert.equal(high.writes.length, 0);
});

import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import { readTypeforgePracticeGear } from '../server/typeforgeEntry.js';
import { getTypeforgePracticeEffects } from '../src/utils/typeforgePractice.js';

test('practice gear tickets must be current, signed, practice-scoped and tied to the same student', () => {
  const secret = 'temporary-signing-key-used-only-in-this-test';
  const studentId = 'test-student';
  const now = Date.now();
  const sub = 'pw-' + createHash('sha256').update(studentId).digest('hex').slice(0, 40);
  const ticket = overrides => {
    const encoded = Buffer.from(JSON.stringify({ iss: 'typeforge', aud: 'pw_typing:free-practice', sub,
      type: 'monitor', level: 12, iat: now, exp: now + 10000, ...overrides })).toString('base64url');
    return encoded + '.' + createHmac('sha256', secret).update(encoded).digest('base64url');
  };
  const request = { secret, studentId, now, ticket: ticket() };
  assert.deepEqual(readTypeforgePracticeGear(request), { type: 'monitor', level: 12 });
  assert.deepEqual(readTypeforgePracticeGear({ ...request, ticket: ticket({ type: 'printer' }) }), { type: 'printer', level: 12 });
  assert.deepEqual(readTypeforgePracticeGear({ ...request, ticket: ticket({ type: 'speaker' }) }), { type: 'speaker', level: 12 });
  assert.deepEqual(readTypeforgePracticeGear({ ...request, ticket: ticket({ type: 'gpu' }) }), { type: 'gpu', level: 12 });
  assert.equal(readTypeforgePracticeGear({ ...request, ticket: ticket({ type: 'toString' }) }), null);
  assert.equal(readTypeforgePracticeGear({ ...request, studentId: 'another-student' }), null);
  assert.equal(readTypeforgePracticeGear({ ...request, now: now + 10000 }), null);
  assert.equal(readTypeforgePracticeGear({ ...request, ticket: ticket({ aud: 'other-action' }) }), null);
  assert.equal(readTypeforgePracticeGear({ ...request, ticket: ticket({ level: 21 }) }), null);
  assert.equal(readTypeforgePracticeGear({ ...request, ticket: request.ticket.slice(0, -43) + 'a'.repeat(43) }), null);
});

test('all gear shares the +8 booster and +12 quiz protection thresholds', () => {
  for (const type of ['keyboard', 'mouse', 'monitor', 'printer', 'speaker', 'gpu']) {
    for (const [level, seconds, shield] of [[7, 0, false], [8, 5, false], [11, 5, false], [12, 5, true], [20, 5, true]]) {
      const effects = getTypeforgePracticeEffects({ type, level });
      assert.deepEqual([effects.extraBoosterSeconds, effects.quizShield], [seconds, shield]);
    }
  }
  assert.equal(getTypeforgePracticeEffects(null), null);
  assert.equal(getTypeforgePracticeEffects({ type: 'invalid', level: 12 }), null);
});

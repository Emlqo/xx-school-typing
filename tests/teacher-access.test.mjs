import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ADDITIONAL_TEACHER_UIDS, isAllowedTeacherUid } from '../src/constants/teacherAccess.js';

const primary = 'hnjJNGDuydcd4SfQ2Xq5cE6IujD3';
test('only the primary and explicitly added Firebase UIDs are authorized', () => {
  assert.equal(isAllowedTeacherUid(primary, primary), true);
  for (const uid of ADDITIONAL_TEACHER_UIDS) assert.equal(isAllowedTeacherUid(uid, primary), true);
  for (const uid of ['', null, undefined, {}, 'student-uid', 'eyyang7@goedu.kr']) {
    assert.equal(isAllowedTeacherUid(uid, primary), false);
  }
});

test('rules allow exactly the same two administrators and retain authentication guard', () => {
  const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
  const clause = rules.match(/function isTeacher\(\) \{([^}]+)\}/)[1];
  assert.match(clause, /isSignedIn\(\)/);
  assert.match(clause, /request.auth.uid in/);
  assert.deepEqual([...clause.matchAll(/'([^']+)'/g)].map(match => match[1]), [primary, ...ADDITIONAL_TEACHER_UIDS]);
});

test('frontend retains anonymous guard and all API checks use shared UID policy', () => {
  const front = readFileSync(new URL('../src/constants/admin.js', import.meta.url), 'utf8');
  assert.match(front, /!user.isAnonymous/);
  assert.match(front, /isAllowedTeacherUid\(user.uid, TEACHER_UID\)/);
  const api = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
  assert.doesNotMatch(api, /uid\s*[!=]==?\s*TEACHER_UID/);
  assert.equal([...api.matchAll(/isAllowedTeacherUid\(uid, TEACHER_UID\)/g)].length, 5);
});

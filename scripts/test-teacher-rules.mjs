import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { cert } from 'firebase-admin/app';
import { ADDITIONAL_TEACHER_UIDS } from '../src/constants/teacherAccess.js';

const key = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
const { access_token } = await cert(key).getAccessToken();
const cases = [];
const identities = ['hnjJNGDuydcd4SfQ2Xq5cE6IujD3', ...ADDITIONAL_TEACHER_UIDS, 'unapproved-google-user', null];
for (const [index, uid] of identities.entries()) {
  const operations = ['typing_classes', 'typing_class_students', 'typing_shop_items', 'typing_rooms', 'typing_quizzes', 'typing_announcements'].map(name => [name, 'update']);
  operations.push(['typing_class_students', 'get'], ['typing_classes', 'delete']);
  for (const [collection, method] of operations) {
    const path = `/databases/(default)/documents/artifacts/xx-school-typing-app/public/data/${collection}/permission-test`;
    const resource = { __name__: path, data: { name: 'Simulated document' } };
    cases.push({
      expectation: index < identities.length - 2 ? 'ALLOW' : 'DENY',
      request: { path, method, auth: uid ? { uid, token: {} } : null, resource },
      resource,
    });
  }
}
// Supplied mock resources; no student records or production writes are used.
const response = await fetch(`https://firebaserules.googleapis.com/v1/projects/${key.project_id}:test`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] }, testSuite: { testCases: cases } }),
});
const result = await response.json();
assert.equal(response.ok, true, JSON.stringify(result.error));
assert.equal((result.issues || []).some(issue => issue.severity === 'ERROR'), false, JSON.stringify(result.issues));
assert.equal(result.testResults?.length, cases.length);
const failures = result.testResults.map((test, index) => ({ index, state: test.state, errors: test.errors })).filter(test => test.state !== 'SUCCESS');
assert.deepEqual(failures, []);
console.log(`PASS: ${cases.length} simulated Rules checks; both teachers allowed, unapproved and unauthenticated users denied.`);

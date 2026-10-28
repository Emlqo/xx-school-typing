import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_ELEMENT_CONFIG } from '../src/constants/elements.js';
import { isValidElementConfig, memoryPreviewMs } from '../src/utils/memoryGame.js';
import { subwayRoute } from '../src/utils/subway.js';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
function roomActions(overrides = {}) {
  const created = [], updates = [], alerts = [];
  const config = { ...DEFAULT_ELEMENT_CONFIG, fromNumber: 21, toNumber: 40, practice: 'recall', previewSeconds: 45 };
  const context = {
    requireTeacherAccess: () => true, newRoomName: '원소 테스트', roomMode: 'elements', classRoomMode: 'elements', roomDuration: '120', classRoomDuration: '180',
    elementConfig: config, classElementConfig: config, roomFocusGuard: false, classFocusGuard: true, user: { uid: 'teacher' },
    getPublicCollection: (_, appId, name) => `${appId}/${name}`, getPublicDoc: (_, appId, name, id) => `${appId}/${name}/${id}`,
    db: {}, APP_ID: 'test', FIRESTORE_PATHS: { rooms: 'typing_rooms' },
    addDoc: async (ref, data) => { created.push({ ref, data }); return { id: 'room1' }; },
    updateDoc: async (ref, data) => updates.push({ ref, data }),
    serverTimestamp: () => 'server', createRoomCode: () => '1234', setViewingRoomId() {}, setNewRoomName() {}, alert: message => alerts.push(message), console,
    rooms: [{ id: 'room1', mode: 'subway', duration: 120, subway: { ...config, subject: 'elements' } }],
    isValidElementConfig, memoryPreviewMs, subwayRoute, ...overrides,
  };
  function get(name, nextName) {
    const start = app.indexOf(`const ${name} = `) + `const ${name} = `.length;
    const code = app.slice(start, app.indexOf(`\n  const ${nextName}`, start)).trim().replace(/;$/, '');
    return new Function(...Object.keys(context), `return (${code});`)(...Object.values(context));
  }
  return { created, updates, alerts, create: get('handleCreateRoom', 'startRoomGame'), open: get('openClassRoom', 'deleteClassRoomSession'), start: get('startRoomGame', 'handleAllowReentry') };
}
test('guest and class rooms retain routes/auth compatibility and selected element settings', async () => {
  const actions = roomActions();
  await actions.create({ preventDefault() {} });
  await actions.open({ id: 'c1', name: '1학년 1반' });
  assert.equal(actions.created.length, 2);
  for (const { ref, data } of actions.created) {
    assert.equal(ref, 'test/typing_rooms');
    assert.equal(data.mode, 'subway');
    assert.equal(data.subway.subject, 'elements');
    assert.equal(data.subway.fromNumber, 21);
    assert.equal(data.subway.toNumber, 40);
    assert.equal(data.subway.previewSeconds, 45);
    assert.equal(data.createdBy, 'teacher');
  }
  assert.equal(actions.created[1].data.classId, 'c1');
  assert.equal(actions.created[1].data.entryType, 'class');
  await actions.start('room1');
  assert.ok(Math.abs(actions.updates[0].data.expiresAt - Date.now() - 165000) < 1000);
});
test('invalid element range and unauthorized teacher cannot create rooms', async () => {
  for (const overrides of [{ requireTeacherAccess: () => false }, { elementConfig: { ...DEFAULT_ELEMENT_CONFIG, toNumber: 119 }, classElementConfig: { ...DEFAULT_ELEMENT_CONFIG, fromNumber: 40, toNumber: 20 } }]) {
    const actions = roomActions(overrides);
    await actions.create({ preventDefault() {} });
    await actions.open({ id: 'c1' });
    assert.equal(actions.created.length, 0);
  }
});

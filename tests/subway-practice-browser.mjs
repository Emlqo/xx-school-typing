import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { LINE_4, createSubwayPracticeRoom, subwayStart, subwayRoute } from '../src/utils/subway.js';
const room = createSubwayPracticeRoom(100000);
assert.equal(room.expiresAt - subwayStart(room), 120000);
assert.deepEqual(subwayRoute(room.subway), LINE_4);
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: ['C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto('http://127.0.0.1:5180/tests/subway-preview.html?practice=1');
  await page.getByRole('heading', { name: '일반 타자연습' }).waitFor();
  await page.screenshot({ path: 'tests/subway-practice-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'tests/subway-practice-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /지하철 외우기/ }).click();
  await page.getByRole('dialog').waitFor();
  await page.clock.fastForward(16000);
  const input = page.getByRole('textbox', { name: '정거장 이름 입력' });
  assert.equal(await input.isEnabled(), true);
  assert.deepEqual(await input.evaluate(el => ['paste', 'drop'].map(type => !el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })))), [true, true]);
  for (const station of LINE_4) { await input.fill(station); await input.press('Enter'); }
  await page.getByText('자유연습 기록은 저장되지 않습니다.', { exact: true }).waitFor();
  await page.getByRole('button', { name: '다시 연습하기' }).click();
  await page.getByRole('dialog').waitFor();
  await page.clock.fastForward(136000);
  await page.getByText('자유연습 기록은 저장되지 않습니다.', { exact: true }).waitFor();
  assert.equal(await input.count(), 0);
  await page.getByRole('button', { name: '학생 홈으로', exact: true }).click();
  await page.getByRole('heading', { name: '일반 타자연습' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Practice selection, completion, timeout, restart, paste/drop and responsive checks passed.');
} finally { await browser.close(); }

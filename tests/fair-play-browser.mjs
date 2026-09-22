import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: ['C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const scenario of ['blur', 'fullscreen', 'hidden', 'subway', 'finish', 'waiting']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5180/tests/fair-play-preview.html');
    await page.getByText('선수 입장', { exact: true }).click();
    await page.getByText('화면 이탈 주의', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
    if (scenario === 'waiting') {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.equal(await page.evaluate(() => window.testReports || 0), 0);
    } else {
      await page.getByText(scenario === 'subway' ? '지하철 시작' : '일반 게임 시작', { exact: true }).click();
      if (scenario === 'finish') {
        await page.getByText('정상 종료', { exact: true }).click();
        await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        assert.equal(await page.evaluate(() => window.testReports || 0), 0);
      } else {
        if (scenario === 'fullscreen') await page.evaluate(() => document.exitFullscreen());
        else if (scenario === 'hidden') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
        else await page.evaluate(() => window.dispatchEvent(new Event('blur')));
        await page.getByText('화면 이탈 · 진행 중단', { exact: true }).waitFor();
        await page.evaluate(() => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('fullscreenchange')); });
        assert.equal(await page.evaluate(() => window.testReports), 1);
        await page.reload();
        await page.getByText('화면 이탈 · 진행 중단', { exact: true }).waitFor();
      }
    }
    assert.deepEqual(errors, []);
    await page.close();
  }
  for (const name of ['일반 게임 시작', '지하철 시작']) {
    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:5180/tests/fair-play-preview.html?off=1');
    await page.getByText('선수 입장', { exact: true }).click();
    await page.getByText('화면 이탈 방지 OFF · 전체 화면 자유').waitFor();
    assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
    await page.getByText(name, { exact: true }).click();
    await page.evaluate(() => { window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('fullscreenchange')); Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.evaluate(() => window.testReports || 0), 0);
    assert.equal(await page.getByText('화면 이탈 · 진행 중단', { exact: true }).count(), 0);
    await page.close();
  }
  console.log('ON: fullscreen and lock checks passed. OFF: normal/subway ignore blur/hidden/fullscreen and enter without fullscreen.');
} finally { await browser.close(); }

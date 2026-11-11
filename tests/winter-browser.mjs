import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Existing isolated entry/home fixture makes no production database calls.
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const home of [false, true]) {
      await page.goto(`http://127.0.0.1:5180/tests/autumn-preview.html${home ? '?home=1' : ''}`);
      await page.locator('h1').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.petal').count(), 72);
      assert.equal(await page.locator('.petal:visible').count(), width <= 640 ? 44 : 72);
      assert.match(await page.locator('.spring-bg').evaluate(e => getComputedStyle(e).backgroundImage), /winter-forest.webp/);
      assert.equal(await page.evaluate(async () => {
        const img = new Image(); img.src = '/images/winter-forest.webp';
        await img.decode(); return img.naturalWidth >= 1920;
      }), true);
      const before = await page.locator('.petal').first().evaluate(e => getComputedStyle(e).transform);
      await page.waitForTimeout(150);
      assert.notEqual(await page.locator('.petal').first().evaluate(e => getComputedStyle(e).transform), before);
      if (!home) await page.getByRole('button', { name: '학생 로그인', exact: true }).click();
      assert.equal(await page.getByText('단풍 물든 가을', { exact: false }).count(), 0);
      await page.screenshot({ path: join(tmpdir(), `winter-${width}-${home ? 'home' : 'entry'}.png`), fullPage: true });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.petal:visible').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: winter entry/home desktop/mobile, image, snowfall, click-through, reduced motion; no runtime errors.');
} finally { await browser.close(); }

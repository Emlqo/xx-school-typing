import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const screen of ['', '?home=1']) {
      await page.goto(`http://127.0.0.1:5180/tests/autumn-preview.html${screen}`);
      await page.locator('h1').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.petal').count(), 18);
      assert.match(await page.locator('.spring-bg').evaluate(e => getComputedStyle(e).backgroundImage), /autumn-forest.webp/);
      assert.equal(await page.evaluate(async () => { const img = new Image(); img.src = '/images/autumn-forest.webp'; await img.decode(); return img.naturalWidth > 1000; }), true);
      await page.screenshot({ path: `tests/autumn-${width}-${screen ? 'home' : 'entry'}.png`, fullPage: true });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.petal').first().evaluate(e => getComputedStyle(e).display), 'none');
  assert.deepEqual(errors, []);
  console.log('Autumn entry/home desktop/mobile, background asset and reduced motion passed.');
} finally { await browser.close(); }

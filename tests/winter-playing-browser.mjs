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
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.dismiss());
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const state of ['', 'combo', 'booster', 'error', 'duel', 'quiz']) {
      await page.goto(`http://127.0.0.1:5180/tests/winter-playing-preview.html?${state}=1`);
      await page.locator('.typing-playfield').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.petal:visible').count(), width < 640 ? 32 : 52);
      if (state === 'quiz') {
        await page.getByText('Preview quiz').waitFor();
        continue;
      }
      assert.equal(await page.locator('.typing-word-board').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(21, 60, 62)');
      assert.equal(await page.locator('.typing-word-board span').first().evaluate(e => getComputedStyle(e).color), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('.typing-input-surface').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('.select-none').evaluate(e => getComputedStyle(e).userSelect), 'none');
      const input = page.locator('input');
      await input.fill('Small');
      assert.equal(await input.inputValue(), 'Small');
      for (const type of ['paste', 'drop']) {
        assert.equal(await input.evaluate((el, eventType) => {
          const event = new Event(eventType, { bubbles: true, cancelable: true });
          el.dispatchEvent(event); return event.defaultPrevented;
        }, type), true);
      }
      const wordBox = await page.locator('.typing-word-board').boundingBox();
      const inputBox = await input.boundingBox();
      const boosterBox = await page.getByRole('button').last().boundingBox();
      assert.ok(wordBox.y + wordBox.height <= inputBox.y);
      assert.ok(inputBox.y + inputBox.height < boosterBox.y);
      if (!state) await page.screenshot({ path: join(tmpdir(), `winter-playing-${width}.png`), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS: desktop/mobile normal, combo, booster, error, duel, quiz; opaque input, high contrast words, no overlap, paste/drop/select protections.');
} finally { await browser.close(); }

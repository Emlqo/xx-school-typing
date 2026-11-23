import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const previewOrigin = process.env.PW_TYPING_PREVIEW_ORIGIN || 'http://127.0.0.1:5180';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', dialog => dialog.dismiss());
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const state of ['', 'combo', 'booster', 'error', 'duel', 'quiz']) {
      await page.goto(`${previewOrigin}/tests/winter-playing-preview.html?${state}=1`);
      await page.locator('.typing-playfield').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.petal:visible').count(), width < 640 ? 32 : 52);
      if (state === 'quiz') {
        await page.getByText('Preview quiz').waitFor();
        continue;
      }
      assert.equal(await page.locator('.typing-word-board').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(21, 60, 62)');
      const prompt = page.locator('.typing-prompt-text');
      assert.equal(await prompt.locator('span').first().evaluate(e => getComputedStyle(e).color), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('.typing-input-surface').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
      assert.equal(await page.locator('.select-none').evaluate(e => getComputedStyle(e).userSelect), 'none');
      const input = page.locator('input');
      const firstSpace = prompt.locator('.typing-space').first();
      assert.equal(await prompt.textContent(), 'Small steps make a big difference.');
      assert.equal(await firstSpace.getAttribute('data-space-state'), 'pending');
      assert.notEqual(await firstSpace.evaluate(e => getComputedStyle(e, '::after').borderBottomWidth), '0px');
      await input.fill('Small');
      assert.equal(await input.inputValue(), 'Small');
      await input.press('Space');
      assert.equal(await input.inputValue(), 'Small ');
      assert.equal(await firstSpace.getAttribute('data-space-state'), 'correct');
      await input.fill('Smallx');
      assert.equal(await firstSpace.getAttribute('data-space-state'), 'wrong');
      await input.fill('');
      assert.ok(await prompt.evaluate(e => parseFloat(getComputedStyle(e).fontSize)) <= 34);
      assert.ok(await input.evaluate(e => parseFloat(getComputedStyle(e).fontSize)) <= 26);
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
  await page.goto(`${previewOrigin}/tests/winter-playing-preview.html?ko=1`);
  const koreanInput = page.locator('.typing-input-surface input');
  await koreanInput.fill('오늘은');
  await koreanInput.press('Space');
  assert.equal(await koreanInput.inputValue(), '오늘은 ');
  const koreanSpaces = page.locator('.typing-space');
  assert.equal(await koreanSpaces.count(), 2);
  assert.equal(await koreanSpaces.first().getAttribute('data-space-state'), 'correct');
  assert.equal(await koreanSpaces.last().getAttribute('data-space-state'), 'pending');
  assert.deepEqual(errors, []);
  console.log('PASS: compact desktop/mobile layout, Korean and English space markers, quiz, booster, and input protections.');
} finally { await browser.close(); }

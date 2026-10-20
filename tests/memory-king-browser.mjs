import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: ['C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/tests/memory-preview.html', route => route.fulfill({ contentType: 'text/html', body: `<html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    </script>
    <script type="module">
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import Hall from '/src/components/teacher/HallOfFamePanel.jsx';
      import Shop from '/src/components/common/StudentHomeShopPanel.jsx';
      import '/src/styles/global.css';
      const hallOfFame = { memoryKing: [
        { studentId:'s1',nickname:'암기왕 학생',className:'1학년 1반',value:51,memoryCompleted:true,memoryElapsedMs:65000 },
        { studentId:'s2',nickname:'김학생',className:'1학년 2반',value:30,memoryCompleted:false,memoryElapsedMs:0 }
      ] };
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement('main',{style:{maxWidth:'1100px',margin:'auto',padding:'16px'}},
        React.createElement(Shop,{student:{id:'demo',name:'암기왕 학생',totalPoints:100,ownedCosmetics:['title_memory_king'],equippedCosmetic:'title_memory_king'}}),
        React.createElement(Hall,{hallOfFame,monthKey:'2026-10',readOnly:true})));
    </script></html>` }));
  await page.goto('http://127.0.0.1:5180/tests/memory-preview.html');
  await page.getByRole('heading', { name: '암기왕 TOP 10' }).waitFor();
  await page.getByText('미완주', { exact: true }).waitFor();
  assert.equal(await page.locator('.cosmetic-effect-title-memory').count(), 1);
  const train = page.locator('.memory-master-train');
  const initialLeft = await train.evaluate(el => getComputedStyle(el).left);
  await page.waitForTimeout(250);
  assert.notEqual(await train.evaluate(el => getComputedStyle(el).left), initialLeft);
  assert.equal(await page.locator('.memory-master-station').count(), 7);
  assert.equal(await page.locator('.student-shop-profile .cosmetic-badge-title-memory').evaluate(el => getComputedStyle(el).color), 'rgb(66, 32, 6)');
  assert.equal(await page.getByRole('button', { name: '1위 칭호 한 번에 지급' }).count(), 0);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `tests/subway-memory-king-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await train.evaluate(el => getComputedStyle(el).animationName), 'none');
  console.log('Memory ranking, equipped title, read-only view and responsive layouts passed.');
} finally { await browser.close(); }

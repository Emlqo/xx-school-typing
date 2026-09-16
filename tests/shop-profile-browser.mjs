import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES || 'C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => { errors.push(error.message); console.error(error.message); });
  page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()); });
  await page.route('**/tests/shop-profile-preview.html', (route) => route.fulfill({ contentType: 'text/html', body: `<html><meta charset="utf-8"><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
    window.__vite_plugin_react_preamble_installed__ = true;
  </script><script type="module">
    import React from '/node_modules/.vite/deps/react.js';
    import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
    import Panel from '/src/components/common/StudentHomeShopPanel.jsx';
    import { COSMETIC_ITEMS } from '/src/constants/cosmetics.js';
    import '/src/styles/global.css';
    function Preview() {
      const [student, setStudent] = React.useState({ id: 'test', name: '테스트 학생', totalPoints: 150, bestScore: 2000, ownedCosmetics: COSMETIC_ITEMS.map(x => x.id), equippedCosmetic: '' });
      window.setEquipped = (id) => setStudent(s => ({ ...s, equippedCosmetic: id }));
      return React.createElement(Panel, { student, onEquipCosmetic: (_, id) => window.setEquipped(id) });
    }
    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Preview));
  </script></html>` }));
  await page.goto('http://127.0.0.1:5180/tests/shop-profile-preview.html');
  const profile = page.locator('.student-shop-profile');
  await profile.getByText('기본 프로필').waitFor();
  await page.locator('article').filter({ hasText: '파도 반짝임' }).getByRole('button', { name: '장착하기' }).click();
  await profile.getByText('파도 반짝임', { exact: true }).waitFor();
  assert.equal(await profile.locator('.cosmetic-effect-wave').count(), 1);
  for (const id of ['glow_teal', 'border_forest', 'badge_summer', 'title_mvp', 'title_quiz_king', 'title_practice_king', 'title_speed_king']) {
    await page.evaluate(id => window.setEquipped(id), id);
    await profile.locator('.cosmetic-badge').waitFor();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await profile.screenshot({ path: 'tests/subway-shop-profile-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await profile.screenshot({ path: 'tests/subway-shop-profile-desktop.png' });
  await page.evaluate(() => window.setEquipped('unknown'));
  await profile.getByText('기본 프로필').waitFor();
  assert.deepEqual(errors, []);
  console.log('Profile fallback, equip update, cosmetic effects and mobile width passed.');
} finally { await browser.close(); }

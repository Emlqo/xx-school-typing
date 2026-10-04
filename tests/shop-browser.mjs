import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: ['C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const mock = `
const config={enabled:true,price:100,revision:1,stockRevision:0,defaultPrizeId:'blank',prizes:[{id:'milk',name:'초코우유',stock:5,weight:3000,noReward:false},{id:'snack',name:'바삭바삭 초콜릿 과자',stock:0,weight:2000,noReward:false},{id:'blank',name:'다음 기회에!',stock:100,weight:0,noReward:true}]};
window.apiCounts={load:0,draw:0,history:0,save:0,fulfill:0};
const receipt={id:'r1',studentName:'미리보기 학생',itemId:'milk',itemName:'초코우유',outcome:'won',pointsSpent:100,deliveryStatus:'pending',createdAt:Date.now()};
export async function getGachaShop(){window.apiCounts.load++;return {config:structuredClone(config)}}
export async function drawGacha(body){window.apiCounts.draw++;window.lastRequest=body;await new Promise(r=>setTimeout(r,100));if(window.failDraw){throw new Error('네트워크 연결 끊김')}return {purchase:receipt,profile:{id:'demo-student',name:'미리보기 학생',totalPoints:900,ownedCosmetics:[]},remainingStock:4}}
export async function listShopHistory(){window.apiCounts.history++;return {items:[receipt],cursor:null}}
export async function fulfillShopPurchase(){window.apiCounts.fulfill++;return {delivered:true}}
export async function saveGachaShop({config}){window.apiCounts.save++;return {config:{...config,revision:2}}}
`;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/src/services/studentSecurityApi.js*', route => route.fulfill({ contentType: 'text/javascript', body: mock }));
  await page.goto('http://127.0.0.1:5180/tests/shop-preview.html');
  await page.getByRole('button', { name: '가챠샵 들어가기' }).click();
  await page.getByRole('button', { name: '100P로 뽑기' }).waitFor();
  assert.equal(await page.locator('.gacha-prize').count(), 3);
  assert.match(await page.locator('.gacha-prize').filter({ hasText: '바삭바삭' }).textContent(), /품절 · 추첨 제외/);
  assert.match(await page.locator('.gacha-prize').filter({ hasText: '다음 기회에' }).textContent(), /수량 제한 없음/);
  assert.doesNotMatch(await page.locator('.gacha-shop').textContent(), /확률|\d+%/);
  assert.equal(await page.getByRole('checkbox', { name: '효과음' }).isChecked(), true);
  await page.getByRole('button', { name: '100P로 뽑기' }).click();
  assert.equal(await page.getByRole('button', { name: '추첨 중...' }).isDisabled(), true);
  assert.notEqual(await page.locator('.gacha-crank-face').evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.notEqual(await page.locator('.gacha-chamber-capsule').first().evaluate(e => getComputedStyle(e).animationName), 'none');
  await page.screenshot({ path: 'tests/subway-shop-spinning.png', fullPage: true });
  await page.getByRole('checkbox', { name: '효과음' }).uncheck();
  await page.locator('.gacha-winning-ticket').waitFor();
  assert.match(await page.locator('.gacha-tray').textContent(), /당첨!/);
  assert.equal(await page.evaluate(() => window.apiCounts.draw), 1);
  await page.waitForTimeout(1000);
  assert.equal(await page.evaluate(() => window.apiCounts.load), 1, 'no polling');
  await page.getByRole('button', { name: '내 구매·당첨 내역', exact: true }).click();
  await page.getByText('지급 대기', { exact: true }).waitFor();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'tests/subway-shop-' + width + '.png', fullPage: true });
  }
  await page.evaluate(() => { window.failDraw = true; });
  await page.getByRole('button', { name: '100P로 뽑기' }).click();
  await page.getByRole('button', { name: '진행한 뽑기 결과 확인' }).waitFor();
  const requestId = await page.evaluate(() => window.lastRequest.requestId);
  await page.reload();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: '가챠샵 들어가기' }).click();
  await page.getByRole('button', { name: '진행한 뽑기 결과 확인' }).click();
  await page.locator('.gacha-winning-ticket').waitFor();
  assert.equal(await page.evaluate(() => window.lastRequest.requestId), requestId, 'reload uses same request');
  await page.goto('http://127.0.0.1:5180/tests/shop-preview.html?teacher=1');
  await page.getByRole('button', { name: '설정 저장' }).waitFor();
  assert.equal(await page.getByRole('radio', { name: '기본 상품으로 정하기' }).count(), 3);
  assert.equal(await page.getByRole('radio', { name: '기본 상품으로 정하기' }).last().isChecked(), true);
  await page.getByRole('button', { name: '설정 저장' }).click();
  await page.getByText('가챠 설정을 저장했습니다.').waitFor();
  await page.getByRole('button', { name: '전교 구매·당첨 내역 / 지급 관리' }).click();
  await page.getByRole('button', { name: '지급 완료', exact: true }).waitFor();
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '지급 완료', exact: true }).click();
  await page.getByText('지급 완료', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.apiCounts.fulfill), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'tests/subway-shop-teacher.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: draw animation, point display, manual history, no polling, mobile, recovery, teacher save and fulfillment.');
} finally { await browser.close(); }

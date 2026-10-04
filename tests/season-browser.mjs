import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(require.resolve('playwright',{paths:['C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules']}));
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5180/tests/season-preview.html');
  await page.locator('.student-shop-profile').waitFor();
  assert.equal(await page.locator('article').count(),5);
  assert.equal(await page.getByText('파도 반짝임',{exact:true}).count(),0);
  for(const [name,id] of [['네온 글리치','neon_glitch'],['번개 코어','lightning_core'],['별빛 궤도','stellar_orbit'],['단풍 회오리','autumn_vortex']]) {
    const card=page.locator('article').filter({has:page.getByText(name,{exact:true})});
    const button=card.getByRole('button');
    if(await button.isEnabled())await button.click();
    await page.locator(`.student-shop-profile .cosmetic-effect-${id}`).waitFor();
    assert.notEqual(await card.evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
    const effect=page.locator(`.student-shop-profile .cosmetic-effect-${id}`);
    const before=await effect.evaluate(e=>{const s=getComputedStyle(e,'::before');return s.transform+s.backgroundPosition;});
    await page.waitForTimeout(250);
    const after=await effect.evaluate(e=>{const s=getComputedStyle(e,'::before');return s.transform+s.backgroundPosition;});
    assert.notEqual(before,after,`${id} artwork must move`);
    await page.screenshot({path:`tests/subway-season-${id}.png`});
  }
  await page.locator('article').filter({has:page.getByText('청록빛 오라',{exact:true})}).getByRole('button').click();
  await page.locator('.student-shop-profile .cosmetic-effect-aura').waitFor();
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:950});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.waitForTimeout(1000);
    await page.screenshot({path:`tests/subway-season-${width}.png`,fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('article.cosmetic-season').first().evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
  await page.evaluate(()=>window.setSeasonStudent(s=>({...s,ownedCosmetics:[],equippedCosmetic:null})));
  assert.equal(await page.locator('article').count(),4);
  assert.deepEqual(errors,[]);
  console.log('PASS: four new cosmetics, ownership visibility, legacy equip, profile updates, desktop/mobile, reduced motion.');
}finally{await browser.close();}

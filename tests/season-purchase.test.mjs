import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {isCosmeticForSale} from '../src/constants/cosmetics.js';
const source=readFileSync(new URL('../api/student-security.js',import.meta.url),'utf8');
test('purchase API rejects retired cosmetics before any write, while new items use existing stock transaction',async()=>{
  for(const cosmeticId of ['glow_teal','border_forest','badge_summer','shine_wave','title_mvp','neon_glitch']){
    const student={classId:'c',totalPoints:500,ownedCosmetics:[]};
    const item={scope:'school',season:2,itemType:'cosmetic',cosmeticId,stock:3,price:80,active:true};
    const writes=[];
    const context={SHOP_SEASON:2,isCosmeticForSale,requireString:value=>value,requireSession:async()=>{},PATHS:{classStudents:'students',shopItems:'items',shopPurchases:'purchases'},publicCollection:path=>({doc:id=>({path,id})}),ApiError:class extends Error{constructor(status,code,message){super(message);this.code=code;}},FieldValue:{serverTimestamp:()=>0},safeProfile:(id,data)=>({id,...data}),database:()=>({runTransaction:async callback=>callback({get:async ref=>({exists:ref.path!=='purchases',data:()=>ref.path==='students'?student:item}),update:(ref,value)=>writes.push({ref,value}),set:(ref,value)=>writes.push({ref,value})})})};
    runInNewContext(source.slice(source.indexOf('async function buyStudentShopItem('),source.indexOf('async function equipStudentCosmetic(')),context);
    if(cosmeticId!=='neon_glitch'){
      await assert.rejects(context.buyStudentShopItem('uid',{studentId:'s',itemId:'i',requestId:'request_1234567890',expectedPrice:80}),/판매 종료/);
      assert.equal(writes.length,0);
    }else{
      const result=await context.buyStudentShopItem('uid',{studentId:'s',itemId:'i',requestId:'request_1234567890',expectedPrice:80});
      assert.equal(writes.length,3);
      assert.equal(result.profile.totalPoints,420);
      assert.equal(result.profile.ownedCosmetics[0],'neon_glitch');
      assert.equal(writes[1].value.stock,2);
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { COSMETIC_ITEMS, getCosmeticById, isCosmeticForSale, getEquippedBoosterBonus, getScoreBoosterBonus } from '../src/constants/cosmetics.js';

test('legacy cosmetics remain available for ownership, never for sale', () => {
  for (const id of ['glow_teal','border_forest','badge_summer','shine_wave']) {
    assert.ok(getCosmeticById(id));
    assert.equal(isCosmeticForSale(id), false);
    assert.equal(getEquippedBoosterBonus({ ownedCosmetics:[id],equippedCosmetic:id }), 0);
  }
  assert.equal(isCosmeticForSale('title_mvp'), false);
  assert.equal(isCosmeticForSale('unknown'), false);
});
test('only an owned and equipped season item grants five seconds without stacking', () => {
  const ids = COSMETIC_ITEMS.filter(item => item.season === 'autumn').map(item => item.id);
  assert.equal(ids.length,4);
  for(const id of ids) {
    assert.equal(isCosmeticForSale(id),true);
    assert.equal(getEquippedBoosterBonus({ownedCosmetics:ids,equippedCosmetic:id}),5);
    assert.equal(getEquippedBoosterBonus({ownedCosmetics:[],equippedCosmetic:id}),0);
  }
  assert.equal(getEquippedBoosterBonus({ownedCosmetics:ids}),0);
});
test('only class typing snapshots get the bonus; practice, guests, duel and subway stay unchanged', () => {
  const score = {entryType:'class',gameType:'typing',boosterBonusSeconds:5};
  assert.equal(getScoreBoosterBonus(score),5);
  assert.equal(getScoreBoosterBonus(score,true),0);
  for(const gameType of ['subway','duel']) assert.equal(getScoreBoosterBonus({...score,gameType}),0);
  assert.equal(getScoreBoosterBonus({...score,entryType:'guest'}),0);
  for(const boosterBonusSeconds of [undefined,0,10,100,'5']) assert.equal(getScoreBoosterBonus({...score,boosterBonusSeconds}),0);
});

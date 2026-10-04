import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGachaConfig, selectGachaPrize, getGachaOutcome, getGachaProbabilities } from '../src/utils/gacha.js';
import { createShopSeason2Actions } from '../server/shopSeason2.js';

const prize = { id: 'milk', name: '초코우유', stock: 1, weight: 10000, noReward: false };
const fallback = { id: 'blank', name: '다음 기회에', stock: 0, weight: 0, noReward: true };
const config = { enabled: true, price: 100, revision: 1, stockRevision: 0, defaultPrizeId: 'blank', prizes: [prize, fallback] };
const copy = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
class ApiError extends Error { constructor(status, code, message) { super(message); this.code = code; this.status = status; } }

function harness(overrides = {}) {
  const records = new Map(Object.entries({
    'students/s1': { name: '테스트1', classId: 'c1', totalPoints: 500 },
    'students/s2': { name: '테스트2', classId: 'c2', totalPoints: 500 },
    'settings/shop_season_2': copy(config),
    ...overrides,
  }));
  const versions = new Map();
  let readCount = 0, writeCount = 0;
  const snapshot = ref => ({ id: ref.id, exists: records.has(ref.key), data: () => copy(records.get(ref.key)) });
  const publicCollection = path => ({ doc: id => ({ id, key: `${path}/${id}`, get: async function () { readCount++; return snapshot(this); } }) });
  const database = () => ({ runTransaction: async callback => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const reads = new Map(), writes = [];
      const tx = {
        get: async ref => { assert.equal(writes.length, 0, 'all reads precede writes'); readCount++; reads.set(ref.key, versions.get(ref.key) || 0); return snapshot(ref); },
        update: (ref, values) => writes.push({ ref, values, merge: true }),
        set: (ref, values) => writes.push({ ref, values, merge: false }),
      };
      const result = await callback(tx);
      if ([...reads].some(([key, version]) => (versions.get(key) || 0) !== version)) continue;
      for (const { ref, values, merge } of writes) {
        records.set(ref.key, { ...(merge ? records.get(ref.key) : {}), ...copy(values) });
        versions.set(ref.key, (versions.get(ref.key) || 0) + 1); writeCount++;
      }
      return result;
    }
    throw new Error('too many retries');
  } });
  const actions = createShopSeason2Actions({ database, publicCollection, PATHS: { settings: 'settings', classStudents: 'students', shopPurchases: 'purchases' },
    requireTeacher: uid => { if (uid !== 'teacher') throw new ApiError(403, 'denied', 'teacher only'); },
    requireSession: async (uid, id) => { if (uid !== id) throw new ApiError(403, 'denied', 'session required'); },
    requireString: v => { if (!v || String(v).includes('/')) throw new Error('invalid'); return v; },
    safeProfile: (id, data) => ({ id, ...data }), ApiError, FieldValue: { serverTimestamp: () => 100 }, Timestamp: class {}, drawTicket: () => 9999,
  });
  return { actions, records, counts: () => ({ readCount, writeCount }) };
}
const request = (studentId = 's1', requestId = 'request_1234567890') => ({ studentId, requestId, revision: 1 });

test('sold out buckets transfer to default while other probabilities stay fixed', () => {
  const prizes = [{ ...prize, stock: 0, weight: 2000 }, { ...prize, id: 'snack', weight: 3000 }, fallback];
  const counts = { milk: 0, snack: 0, blank: 0 };
  for (let i = 0; i < 10000; i++) counts[selectGachaPrize(prizes, i, 'blank').id]++;
  assert.deepEqual(counts, { milk: 0, snack: 3000, blank: 7000 });
  assert.equal(getGachaOutcome(selectGachaPrize(prizes, 9999, 'blank')), 'no_reward');
  assert.equal(getGachaProbabilities([{ ...prize, stock: 0 }, fallback], 'blank')[1].weight, 10000);
  assert.throws(() => normalizeGachaConfig({ ...config, defaultPrizeId: '' }), /기본 상품/);
  assert.throws(() => normalizeGachaConfig({ ...config, defaultPrizeId: 'milk' }), /지급 없는/);
  assert.throws(() => normalizeGachaConfig({ ...config, prizes: [prize, { ...prize, id: 'other', weight: 1 }, fallback] }), /100%/);
  assert.throws(() => normalizeGachaConfig({ ...config, price: -1 }));
  assert.throws(() => normalizeGachaConfig({ ...config, prizes: [{ ...prize, stock: NaN }] }));
  assert.throws(() => normalizeGachaConfig({ ...config, prizes: [prize, prize] }));
});
test('draw commits points, shared stock and immutable receipt; retries charge once', async () => {
  const h = harness();
  const first = await h.actions.drawGacha('s1', request());
  assert.equal(first.purchase.outcome, 'won');
  assert.equal(first.profile.totalPoints, 400);
  assert.equal(h.records.get('settings/shop_season_2').prizes[0].stock, 0);
  assert.equal(h.counts().writeCount, 3);
  const retry = await h.actions.drawGacha('s1', request());
  assert.equal(retry.replayed, true);
  assert.equal(retry.profile.totalPoints, 400);
  assert.equal(h.counts().writeCount, 3);
});
test('simultaneous students from different classes cannot win the same last stock', async () => {
  const h = harness();
  const results = await Promise.all([h.actions.drawGacha('s1', request()), h.actions.drawGacha('s2', request('s2'))]);
  assert.deepEqual(results.map(r => r.purchase.outcome).sort(), ['no_reward', 'won']);
  assert.equal(h.records.get('students/s1').totalPoints, 400);
  assert.equal(h.records.get('students/s2').totalPoints, 400);
  assert.equal(h.records.get('settings/shop_season_2').prizes[0].stock, 0);
});
test('concurrent identical requests debit only once', async () => {
  const h = harness();
  await Promise.all([h.actions.drawGacha('s1', request()), h.actions.drawGacha('s1', request())]);
  assert.equal(h.records.get('students/s1').totalPoints, 400);
  assert.equal([...h.records.keys()].filter(key => key.startsWith('purchases/')).length, 1);
});
test('no-reward entry consumes its stock but does not create fulfillment work', async () => {
  const h = harness({ 'settings/shop_season_2': { ...config, prizes: [{ ...prize, noReward: true }, fallback] } });
  const data = await h.actions.drawGacha('s1', request());
  assert.equal(data.purchase.deliveryStatus, 'not_required');
  assert.equal(data.purchase.quantity, 0);
  assert.equal(data.purchase.outcome, 'no_reward');
  assert.equal(data.profile.totalPoints, 400);
});
test('default is unlimited and needs no stock write', async () => {
  const h = harness({ 'settings/shop_season_2': { ...config, prizes: [{ ...prize, stock: 0 }, fallback] } });
  const data = await h.actions.drawGacha('s1', request());
  assert.equal(data.purchase.itemId, 'blank');
  assert.equal(data.purchase.probability, 100);
  assert.equal(h.counts().writeCount, 2);
  assert.equal(h.records.get('settings/shop_season_2').prizes[1].stock, 0);
});
test('low points, paused shop, stale configuration and wrong student cannot charge', async () => {
  for (const overrides of [
    { 'students/s1': { totalPoints: 99 } },
    { 'settings/shop_season_2': { ...config, enabled: false } },
    { 'settings/shop_season_2': { ...config, revision: 2 } },
  ]) {
    const h = harness(overrides);
    await assert.rejects(h.actions.drawGacha('s1', request()));
    assert.equal(h.counts().writeCount, 0);
  }
  const h = harness();
  await assert.rejects(h.actions.drawGacha('s2', request()));
  assert.equal(h.counts().readCount, 0);
});
test('teacher save refuses stale stock, and student cannot save or fulfill', async () => {
  const h = harness();
  await h.actions.drawGacha('s1', request());
  await assert.rejects(h.actions.saveGachaShop('teacher', { config, revision: 1, stockRevision: 0 }), /재고가 변경/);
  await assert.rejects(h.actions.saveGachaShop('s1', { config, revision: 1 }), /teacher only/);
  const purchaseId = 's1_gacha_request_1234567890';
  await assert.rejects(h.actions.fulfillShopPurchase('s1', { purchaseId }), /teacher only/);
  await h.actions.fulfillShopPurchase('teacher', { purchaseId });
  const writes = h.counts().writeCount;
  await h.actions.fulfillShopPurchase('teacher', { purchaseId });
  assert.equal(h.counts().writeCount, writes);
  assert.equal(h.records.get(`purchases/${purchaseId}`).deliveryStatus, 'delivered');
});

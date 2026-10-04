export const SHOP_SEASON = 2;
export const GACHA_SETTING_ID = 'shop_season_2';
export const MAX_GACHA_PRIZES = 40;

export function normalizeGachaConfig(input = {}) {
  const price = Number(input.price);
  if (!Number.isSafeInteger(price) || price < 1 || price > 1000000) throw new Error('가격은 1~1,000,000P의 정수로 입력해주세요.');
  if (!Array.isArray(input.prizes) || input.prizes.length > MAX_GACHA_PRIZES) throw new Error(`상품은 최대 ${MAX_GACHA_PRIZES}개입니다.`);
  const ids = new Set();
  const prizes = input.prizes.map((item) => {
    const id = String(item.id || '');
    const name = String(item.name || '').trim();
    const stock = Number(item.stock);
    const weight = Number(item.weight);
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) throw new Error('상품 식별자가 올바르지 않습니다.');
    ids.add(id);
    if (!name || name.length > 80) throw new Error('상품명은 1~80자로 입력해주세요.');
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000) throw new Error('재고는 0~1,000,000의 정수로 입력해주세요.');
    if (!Number.isInteger(weight) || weight < 0 || weight > 10000) throw new Error('확률은 0~100%, 소수 둘째 자리까지 입력해주세요.');
    return { id, name, stock, weight, noReward: item.noReward === true };
  });
  const enabled = input.enabled === true;
  const defaultPrizeId = String(input.defaultPrizeId || '');
  const defaultPrize = prizes.find(p => p.id === defaultPrizeId);
  if (defaultPrizeId && !defaultPrize) throw new Error('기본 상품을 다시 선택해주세요.');
  if (defaultPrize && !defaultPrize.noReward) throw new Error('기본 상품은 지급 없는 결과로 설정해주세요.');
  if (enabled && !defaultPrize) throw new Error('운영하려면 기본 상품을 선택해주세요.');
  if (prizes.filter(p => p.id !== defaultPrizeId).reduce((sum, p) => sum + p.weight, 0) > 10000) throw new Error('일반 상품 확률 합계는 100%를 넘을 수 없습니다.');
  return { price, enabled, prizes, defaultPrizeId };
}

// Sold-out entries have no bucket; the unlimited default absorbs the remainder.
export function getGachaProbabilities(prizes, defaultPrizeId) {
  const activeTotal = prizes.filter(p => p.id !== defaultPrizeId && p.stock > 0).reduce((sum, p) => sum + p.weight, 0);
  return prizes.map(p => ({ ...p, isDefault: p.id === defaultPrizeId, weight: p.id === defaultPrizeId ? Math.max(0, 10000 - activeTotal) : p.stock > 0 ? p.weight : 0 }));
}

export function selectGachaPrize(prizes, ticket, defaultPrizeId) {
  if (!defaultPrizeId || !prizes.some(p => p.id === defaultPrizeId && p.noReward)) throw new Error('기본 상품이 없습니다.');
  const eligible = getGachaProbabilities(prizes, defaultPrizeId);
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= 10000 || eligible.reduce((sum, p) => sum + p.weight, 0) !== 10000) throw new Error('유효하지 않은 추첨 설정입니다.');
  let cumulative = 0;
  for (const prize of eligible) {
    cumulative += prize.weight;
    if (ticket < cumulative) return prize;
  }
  throw new Error('추첨 결과가 없습니다.');
}

export function getGachaOutcome(prize) {
  return prize.isDefault || prize.noReward ? 'no_reward' : prize.stock <= 0 ? 'sold_out' : 'won';
}

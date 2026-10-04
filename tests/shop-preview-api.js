// Isolated demo data: never imports Firebase or sends a network request.
import { selectGachaPrize, getGachaOutcome } from '../src/utils/gacha.js';
let config = { enabled: true, price: 100, revision: 1, stockRevision: 0, defaultPrizeId: 'blank', prizes: [
  { id: 'milk', name: '초코우유', stock: 5, weight: 3000, noReward: false },
  { id: 'snack', name: '바삭바삭 초콜릿 과자', stock: 0, weight: 2000, noReward: false },
  { id: 'blank', name: '다음 기회에!', stock: 100, weight: 5000, noReward: true },
] };
let points = 1000;
const history = [];
export async function getGachaShop() { return { config: structuredClone(config) }; }
export async function saveGachaShop(body) { config = { ...body.config, revision: config.revision + 1 }; return getGachaShop(); }
export async function drawGacha(body) {
  let purchase = history.find(p => p.id === body.requestId);
  if (!purchase) {
    if (points < config.price) throw new Error('포인트가 부족합니다.');
    const prize = selectGachaPrize(config.prizes, Math.floor(Math.random() * 10000), config.defaultPrizeId);
    const outcome = getGachaOutcome(prize);
    if (!prize.isDefault && prize.stock > 0) config.prizes.find(p => p.id === prize.id).stock--;
    points -= config.price;
    purchase = { id: body.requestId, itemId: prize.id, itemName: prize.name, outcome, pointsSpent: config.price, createdAt: Date.now(), studentName: '미리보기 학생', className: '1학년 1반', deliveryStatus: outcome === 'won' ? 'pending' : 'not_required' };
    history.unshift(purchase);
  }
  return { purchase, profile: { id: 'demo-student', name: '미리보기 학생', totalPoints: points, ownedCosmetics: [] }, remainingStock: config.prizes.find(p => p.id === purchase.itemId)?.stock };
}
export async function listShopHistory(body) { return { items: history.filter(p => !body.pendingOnly || p.deliveryStatus === 'pending'), cursor: null }; }
export async function fulfillShopPurchase(id) { const row = history.find(p => p.id === id); if (row) row.deliveryStatus = 'delivered'; return { delivered: true }; }

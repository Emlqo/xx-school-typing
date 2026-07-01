import { COSMETIC_ITEMS } from '../../constants/cosmetics.js';
import { safeToLocaleNumber } from '../../utils/format.js';

export default function StudentHomeShopPanel({
  student,
  shopItems = [],
  onBuyCosmetic = async () => null,
  onBuyStockItem = async () => null,
  onEquipCosmetic = async () => null,
  onRefreshStudentProfile = async () => null,
}) {
  if (!student) return null;
  const owned = Array.isArray(student.ownedCosmetics) ? student.ownedCosmetics : [];
  const stockItems = shopItems.filter((item) => item.itemType !== 'cosmetic' && item.active !== false);

  return (
    <section className="glass-box rounded-3xl p-5 md:p-6 shadow-2xl border-2 border-cyan-100">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <div className="text-xs font-black text-teal-600 tracking-widest">MY SHOP</div>
          <h2 className="text-2xl font-black text-gray-800">{student.name}의 포인트 상점</h2>
          <p className="text-xs text-gray-500 font-bold mt-1">최고 기록 {safeToLocaleNumber(student.bestScore)}점</p>
          <button
            type="button"
            onClick={onRefreshStudentProfile}
            className="mt-3 px-3 py-2 rounded-xl bg-white/85 hover:bg-white border border-cyan-100 text-cyan-700 text-xs font-black transition-colors"
          >
            내 포인트/칭호 새로고침
          </button>
        </div>
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-right">
          <div className="text-xs font-black text-emerald-600">보유 포인트</div>
          <div className="text-3xl font-black text-emerald-700">{safeToLocaleNumber(student.totalPoints)}P</div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-black text-amber-700 mb-3">반별 한정 상품</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stockItems.map((item) => {
            const stock = Math.max(0, Number(item.stock || 0));
            const price = Math.max(0, Number(item.price || 0));
            const canBuy = stock > 0 && Number(student.totalPoints || 0) >= price;
            return (
              <article key={item.id} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-gray-800">{item.name}</div>
                    <p className="text-xs text-gray-500 font-bold mt-1">{item.description || '한정 상품'}</p>
                  </div>
                  <div className="font-black text-amber-700">{safeToLocaleNumber(price)}P</div>
                </div>
                <div className={`text-xs font-black mt-3 ${stock ? 'text-amber-600' : 'text-red-500'}`}>{stock ? `남은 수량 ${stock}개` : '품절'}</div>
                <button
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onBuyStockItem(student, item)}
                  className="w-full mt-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 text-amber-950 font-black"
                >
                  {stock === 0 ? '품절' : canBuy ? '즉시 구매' : '포인트 부족'}
                </button>
              </article>
            );
          })}
          {stockItems.length === 0 && <div className="md:col-span-2 text-center text-gray-400 py-7 rounded-xl border border-dashed border-amber-200 font-bold">현재 판매 중인 한정 상품이 없습니다.</div>}
        </div>
      </div>

      <div className="border-t border-cyan-100 pt-5">
        <h3 className="font-black text-gray-700 mb-3">장식 아이템</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COSMETIC_ITEMS.map((cosmetic) => {
            const configured = shopItems.find((item) => item.itemType === 'cosmetic' && item.cosmeticId === cosmetic.id);
            const isOwned = owned.includes(cosmetic.id);
            const isEquipped = student.equippedCosmetic === cosmetic.id;
            const price = Number(configured?.price ?? cosmetic.price);
            const stock = Math.max(0, Number(configured?.stock || 0));
            const canBuy = Boolean(configured?.id) && configured.active !== false && stock > 0 && Number(student.totalPoints || 0) >= price;
            return (
              <article key={cosmetic.id} className={`rounded-2xl border p-4 ${cosmetic.previewClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-gray-800">{cosmetic.name}</div>
                    <p className="text-xs text-gray-500 font-bold mt-1">{cosmetic.description}</p>
                  </div>
                  <span className="text-sm font-black text-emerald-700 bg-white/80 rounded-lg px-2 py-1">{price}P</span>
                </div>
                <button
                  type="button"
                  disabled={isEquipped || (!isOwned && !canBuy)}
                  onClick={() => isOwned ? onEquipCosmetic(student, cosmetic.id) : onBuyCosmetic(student, cosmetic.id, configured)}
                  className="w-full mt-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black"
                >
                  {isEquipped ? '장착 중' : isOwned ? '장착하기' : configured?.id && stock === 0 ? '품절' : configured?.id ? canBuy ? '구매하기' : '포인트 부족' : '판매 준비 중'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

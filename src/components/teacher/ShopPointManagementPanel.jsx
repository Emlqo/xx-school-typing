import { useState } from 'react';
import { COSMETIC_ITEMS } from '../../constants/cosmetics.js';
import { safeToLocaleNumber } from '../../utils/format.js';

export default function ShopPointManagementPanel({
  classes = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  students = [],
  handleSetStudentPoints = () => {},
  handleAdjustStudentPoints = () => {},
  handleGrantStudentCosmetic = () => {},
  handleRemoveStudentCosmetic = () => {},
  handleResetStudentCosmetics = () => {},
  shopItems = [],
  handleSaveShopItem = async () => false,
  handleDeleteShopItem = () => {},
}) {
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId) || null;
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemStock, setItemStock] = useState('');
  const [itemActive, setItemActive] = useState(true);

  const resetItemForm = () => {
    setEditingItemId(null);
    setItemName('');
    setItemDescription('');
    setItemPrice('');
    setItemStock('');
    setItemActive(true);
  };

  const submitShopItem = async (event) => {
    event.preventDefault();
    const saved = await handleSaveShopItem({
      name: itemName,
      description: itemDescription,
      price: itemPrice,
      stock: itemStock,
      active: itemActive,
    }, editingItemId);
    if (saved) resetItemForm();
  };

  const editShopItem = (item) => {
    setEditingItemId(item.id);
    setItemName(item.name || '');
    setItemDescription(item.description || '');
    setItemPrice(String(item.price ?? ''));
    setItemStock(String(item.stock ?? ''));
    setItemActive(item.active !== false);
  };

  return (
    <div className="glass-box p-6 rounded-3xl border border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-teal-800 flex items-center gap-2">상점/포인트 관리</h2>
          <p className="text-sm text-gray-500 font-bold mt-1">
            학급 학생의 포인트와 보유 장식을 직접 관리합니다.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-white border border-teal-100 text-teal-700 font-black">
          선택 학급 {selectedClass?.name || '없음'}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-teal-100 p-4 mb-5">
        <label className="text-xs text-gray-400 font-black block mb-2">관리할 학급</label>
        <select
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className="w-full px-4 py-3 border border-teal-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400 bg-white font-bold text-gray-700"
        >
          <option value="">학급을 선택하세요</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 mb-8">
        <form onSubmit={submitShopItem} className="bg-white rounded-2xl border border-amber-100 p-5 space-y-3">
          <div>
            <div className="text-xs font-black text-amber-600 tracking-widest">반별 재고 상품</div>
            <h3 className="text-lg font-black text-gray-800">{editingItemId ? '상품 수정' : '새 상품 등록'}</h3>
          </div>
          <input
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            placeholder="상품명 (예: 초코우유)"
            className="w-full px-4 py-3 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
          />
          <textarea
            value={itemDescription}
            onChange={(event) => setItemDescription(event.target.value)}
            placeholder="상품 설명"
            rows={3}
            className="w-full px-4 py-3 border border-amber-200 rounded-xl outline-none resize-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              value={itemPrice}
              onChange={(event) => setItemPrice(event.target.value)}
              placeholder="가격(P)"
              className="w-full px-4 py-3 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="number"
              min="0"
              value={itemStock}
              onChange={(event) => setItemStock(event.target.value)}
              placeholder="수량"
              className="w-full px-4 py-3 border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-black text-gray-600">
            <input
              type="checkbox"
              checked={itemActive}
              onChange={(event) => setItemActive(event.target.checked)}
              className="w-4 h-4"
            />
            학생 상점에 판매 상품으로 표시
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!selectedClassId}
              className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-300 text-amber-950 rounded-xl font-black"
            >
              {editingItemId ? '수정 저장' : '상품 등록'}
            </button>
            {editingItemId && (
              <button type="button" onClick={resetItemForm} className="px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-black">
                취소
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-amber-100 p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-black text-gray-800">등록 상품</h3>
            <span className="text-xs font-black text-amber-700">{shopItems.length}개</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {shopItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-gray-800 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">{item.description || '설명 없음'}</div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs font-black">
                      <span className="text-emerald-700">{safeToLocaleNumber(item.price || 0)}P</span>
                      <span className={Number(item.stock || 0) > 0 ? 'text-amber-700' : 'text-red-500'}>
                        재고 {safeToLocaleNumber(item.stock || 0)}개
                      </span>
                      <span className={item.active !== false ? 'text-teal-600' : 'text-gray-400'}>
                        {item.active !== false ? '판매 중' : '판매 중지'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => editShopItem(item)} className="px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-black">
                      수정
                    </button>
                    <button type="button" onClick={() => handleDeleteShopItem(item.id, item.name)} className="px-3 py-2 bg-white border border-red-100 text-red-500 rounded-lg text-xs font-black">
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {selectedClassId && shopItems.length === 0 && (
              <div className="text-center text-gray-400 py-10 font-bold">이 반에 등록된 재고 상품이 없습니다.</div>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-black text-teal-800 mb-4">학생 포인트 및 장식 관리</h3>
      <div className="space-y-4">
        {students.map((student) => {
          const ownedCosmetics = Array.isArray(student.ownedCosmetics) ? student.ownedCosmetics : [];
          const totalPoints = Number(student.totalPoints || 0);

          return (
            <div key={student.id} className="bg-white rounded-2xl border border-cyan-100 p-4 shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                <div className="min-w-0 xl:w-56">
                  <div className="text-lg font-black text-gray-800 truncate">{student.name}</div>
                  <div className="text-xs text-gray-400 font-bold mt-1">
                    최고 기록 {safeToLocaleNumber(student.bestScore || 0)}점
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-2">
                    {safeToLocaleNumber(totalPoints)}P
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    handleSetStudentPoints(student.id, formData.get('points'));
                  }}
                  className="flex flex-wrap items-center gap-2 xl:w-80"
                >
                  <input
                    key={totalPoints}
                    name="points"
                    type="number"
                    min="0"
                    defaultValue={totalPoints}
                    className="w-28 px-3 py-2 border border-teal-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400 font-bold"
                  />
                  <button type="submit" className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-black">
                    설정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStudentPoints(student.id, totalPoints, 10)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black border border-emerald-100"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStudentPoints(student.id, totalPoints, 50)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black border border-emerald-100"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStudentPoints(student.id, totalPoints, -10)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black border border-rose-100"
                  >
                    -10
                  </button>
                </form>

                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-black mb-2">아이템 지급/회수</div>
                  <div className="flex flex-wrap gap-2">
                    {COSMETIC_ITEMS.map((item) => {
                      const owned = ownedCosmetics.includes(item.id);
                      const equipped = student.equippedCosmetic === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => (owned
                            ? handleRemoveStudentCosmetic(student, item.id)
                            : handleGrantStudentCosmetic(student, item.id))}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                            owned
                              ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                              : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-cyan-50 hover:text-cyan-700'
                          }`}
                          title={owned ? '클릭하면 회수합니다.' : '클릭하면 지급합니다.'}
                        >
                          {item.name}{equipped ? ' · 장착 중' : owned ? ' · 보유' : ''}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleResetStudentCosmetics(student.id)}
                      className="px-3 py-2 rounded-xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-500"
                    >
                      장식 초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!selectedClassId && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-teal-100 font-bold">
            먼저 관리할 학급을 선택하세요.
          </div>
        )}

        {selectedClassId && students.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-teal-100 font-bold">
            선택한 학급에 등록된 학생이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

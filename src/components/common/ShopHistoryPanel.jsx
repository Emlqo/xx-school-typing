import { useEffect, useRef, useState } from 'react';
import * as shopApi from '../../services/studentSecurityApi.js';

export default function ShopHistoryPanel({ studentId, teacher = false, classId = '', classes = [], api = shopApi }) {
  const { fulfillShopPurchase, listShopHistory } = api;
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const generation = useRef(0);
  async function load(more = false, version = generation.current) {
    setBusy(true); setError('');
    try {
      const data = await listShopHistory({ studentId, teacher, classId, pendingOnly, cursor: more ? cursor : null });
      if (version !== generation.current) return;
      setItems(previous => more ? [...previous, ...data.items] : data.items);
      setCursor(data.cursor);
    } catch (e) { if (version === generation.current) setError(e.message); }
    finally { if (version === generation.current) setBusy(false); }
  }
  useEffect(() => {
    const version = ++generation.current;
    setItems([]); setCursor(null); load(false, version);
    return () => { generation.current++; };
  }, [studentId, teacher, classId, pendingOnly]);
  async function fulfill(item) {
    if (!window.confirm(`${item.studentName} · ${item.itemName} 지급을 완료했나요?`)) return;
    setBusy(true); setError('');
    try {
      await fulfillShopPurchase(item.id);
      setItems(previous => pendingOnly ? previous.filter(row => row.id !== item.id) : previous.map(row => row.id === item.id ? { ...row, deliveryStatus: 'delivered' } : row));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="shop-history mt-5 border-t border-teal-200 pt-4">
    <div className="flex flex-wrap gap-3 justify-between items-center mb-3">
      <h3 className="font-black text-lg text-teal-900">{teacher ? '전교 구매·당첨 내역' : '내 구매·당첨 내역'}</h3>
      <div className="flex gap-3 items-center">
        {teacher && <label className="font-bold text-sm"><input type="checkbox" checked={pendingOnly} disabled={busy} onChange={e => setPendingOnly(e.target.checked)} /> 미지급만</label>}
        <button type="button" disabled={busy} onClick={() => load()} className="shop-button-secondary">새로고침</button>
      </div>
    </div>
    {error && <p role="alert" className="text-red-700 mb-3">{error}</p>}
    <div className="space-y-2">
      {items.map(item => <article key={item.id} className="border border-teal-100 rounded-lg p-3 bg-white flex flex-wrap gap-3 justify-between items-center">
        <div className="min-w-0 break-words">
          <div className="font-black">{teacher && `${item.className || classes.find(c => c.id === item.classId)?.name || '학급 미확인'} ${item.studentName} · `}{item.itemName}</div>
          <div className="text-sm text-gray-600">{new Date(item.createdAt).toLocaleString('ko-KR')} · {item.pointsSpent}P</div>
          <div className="text-sm font-bold text-teal-700">{item.outcome === 'sold_out' ? '품절로 미당첨' : item.outcome === 'no_reward' ? '지급 없는 결과' : item.deliveryStatus === 'delivered' ? '지급 완료' : item.deliveryStatus === 'pending' ? '지급 대기' : '구매 완료'}</div>
        </div>
        {teacher && item.deliveryStatus === 'pending' && <button type="button" disabled={busy} onClick={() => fulfill(item)} className="shop-button">지급 완료</button>}
      </article>)}
    </div>
    {!busy && !items.length && !error && <p className="py-5 text-gray-500">기록이 없습니다.</p>}
    {busy && <p role="status" className="py-3">불러오는 중...</p>}
    {cursor && <button type="button" disabled={busy} onClick={() => load(true)} className="shop-button-secondary mt-3">다음 20건</button>}
  </section>;
}

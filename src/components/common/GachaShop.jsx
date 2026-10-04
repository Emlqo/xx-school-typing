import { useEffect, useRef, useState } from 'react';
import * as shopApi from '../../services/studentSecurityApi.js';
import ShopHistoryPanel from './ShopHistoryPanel.jsx';
import GachaMachine from './GachaMachine.jsx';
import { createGachaSound } from '../../utils/gachaSound.js';
import '../../styles/shop-season2.css';

export default function GachaShop({ student, onProfileChange = () => {}, onBack, api = shopApi }) {
  const { drawGacha, getGachaShop } = api;
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(null);
  const [history, setHistory] = useState(false);
  const [muted, setMuted] = useState(false);
  const sound = useRef(null);
  useEffect(() => {
    sound.current = createGachaSound();
    return () => sound.current?.dispose();
  }, []);
  const lock = useRef(false);
  const alive = useRef(true);
  const storageKey = `shop-season2-pending-${student.id}`;
  async function load() {
    setLoading(true); setError('');
    try { const data = await getGachaShop({ studentId: student.id }); if (alive.current) setConfig(data.config); }
    catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => {
    alive.current = true;
    try { setPending(JSON.parse(localStorage.getItem(storageKey) || 'null')); } catch { setError('브라우저 저장공간을 사용할 수 없습니다.'); }
    load();
    return () => { alive.current = false; };
  }, [storageKey]);
  async function spin() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setResult(null);
    sound.current?.start();
    let request = pending;
    try {
      if (!request) {
        request = { studentId: student.id, requestId: crypto.randomUUID(), revision: config.revision };
        // Persist before the request; retries always use the same receipt key.
        localStorage.setItem(storageKey, JSON.stringify(request));
        setPending(request);
      }
      const [data] = await Promise.all([drawGacha(request), new Promise(resolve => setTimeout(resolve, 3200))]);
      localStorage.removeItem(storageKey);
      if (!alive.current) return;
      setPending(null); setResult(data.purchase); onProfileChange(data.profile);
      sound.current?.reveal(data.purchase.outcome === 'won');
      if (data.remainingStock !== undefined) setConfig(previous => ({ ...previous, prizes: previous.prizes.map(p => p.id === data.purchase.itemId ? { ...p, stock: data.remainingStock } : p) }));
    } catch (e) {
      sound.current?.stop();
      if (!alive.current) return;
      // Explicit API rejection is safe to discard. Network/5xx uncertainty keeps the key.
      if (['api/failed-precondition', 'api/invalid-argument', 'api/not-found'].includes(e.code)) {
        localStorage.removeItem(storageKey); setPending(null);
      }
      setError(e.message || '결과 확인에 실패했습니다. 같은 요청으로 다시 확인해주세요.');
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const prizes = config?.prizes || [];
  return <div className="gacha-shop">
    <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
      <button type="button" onClick={onBack} disabled={busy} className="shop-button-secondary">일반 상점으로</button>
      <span className="text-xl font-black text-teal-800">{student.totalPoints || 0}P</span>
      <label className="text-sm font-bold text-teal-900"><input type="checkbox" checked={!muted} onChange={e => { setMuted(!e.target.checked); sound.current?.setMuted(!e.target.checked); }} /> 효과음</label>
    </div>
    <GachaMachine busy={busy} result={result} enabled={config?.enabled} price={config?.price} pending={pending} onSpin={spin} disabled={busy || loading || (!pending && (!config?.enabled || student.totalPoints < config.price))} />
    {error && <p role="alert" className="p-3 mt-3 text-red-800 bg-red-50 rounded-lg">{error}</p>}
    <div className="my-4 p-3 border border-amber-300 bg-amber-50 text-amber-950 rounded-lg font-bold text-sm">품절 상품은 뽑히지 않습니다. 기본 상품은 지급 없는 결과이며, 뽑기 포인트는 차감됩니다.</div>
    <div className="flex flex-wrap justify-between gap-3 items-center"><h4 className="text-lg font-black">상품 목록</h4><button type="button" disabled={busy || loading} onClick={load} className="shop-button-secondary">재고·설정 새로고침</button></div>
    <p className="text-sm text-gray-500 mt-2">표시 재고는 조회 시점 기준이며, 최종 재고는 추첨 시 확인합니다.</p>
    <div className="gacha-prize-list">{prizes.map(p => <article key={p.id} className="gacha-prize"><strong className="col-span-2">{p.name}</strong><small>{p.id === config?.defaultPrizeId ? '기본 상품 · 수량 제한 없음' : p.stock > 0 ? `${p.stock}개` : '품절 · 추첨 제외'}{p.noReward ? ' · 지급 없음' : ''}</small></article>)}</div>
    <button type="button" disabled={busy} onClick={() => setHistory(v => !v)} className="shop-button-secondary">{history ? '내역 닫기' : '내 구매·당첨 내역'}</button>
    {history && <ShopHistoryPanel studentId={student.id} api={api} />}
  </div>;
}

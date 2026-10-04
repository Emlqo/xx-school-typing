import { useEffect, useRef, useState } from 'react';
import * as shopApi from '../../services/studentSecurityApi.js';
import { normalizeGachaConfig, getGachaProbabilities, MAX_GACHA_PRIZES } from '../../utils/gacha.js';
import ShopHistoryPanel from '../common/ShopHistoryPanel.jsx';
import '../../styles/shop-season2.css';

export default function GachaManagementPanel({ classes = [], api = shopApi }) {
  const { getGachaShop, saveGachaShop } = api;
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState(false);
  const mounted = useRef(true);
  async function load() {
    setBusy(true); setMessage('');
    try { const data = await getGachaShop({ teacher: true }); if (mounted.current) setConfig(data.config); }
    catch (e) { if (mounted.current) setMessage(e.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  useEffect(() => { mounted.current = true; load(); return () => { mounted.current = false; }; }, []);
  function changePrize(id, key, value) {
    setConfig(previous => ({ ...previous, prizes: previous.prizes.map(p => p.id === id ? { ...p, [key]: value } : p) }));
  }
  async function save(event) {
    event.preventDefault(); setMessage('');
    try {
      const normalized = normalizeGachaConfig(config);
      setBusy(true);
      const data = await saveGachaShop({ config: normalized, revision: config.revision, stockRevision: config.stockRevision });
      if (mounted.current) { setConfig(data.config); setMessage('가챠 설정을 저장했습니다.'); }
    } catch (e) { if (mounted.current) setMessage(e.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  const total = (config?.prizes || []).filter(p => p.id !== config?.defaultPrizeId).reduce((sum, p) => sum + Number(p.weight || 0), 0) / 100;
  const defaultWeight = getGachaProbabilities(config?.prizes || [], config?.defaultPrizeId).find(p => p.isDefault)?.weight || 0;
  return <section className="mt-8 border-t border-teal-200 pt-6">
    <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
      <h3 className="text-xl font-black text-teal-900">시즌2 가챠 관리 · 전교 공통</h3>
      <button type="button" disabled={busy} onClick={() => { if (window.confirm('저장하지 않은 변경을 버리고 다시 불러올까요?')) load(); }} className="shop-button-secondary">설정 다시 불러오기</button>
    </div>
    {message && <p role="status" className="mb-4 text-rose-800 font-bold">{message}</p>}
    {config && <form onSubmit={save}>
      <fieldset disabled={busy} className="min-w-0">
        <div className="flex flex-wrap gap-5 items-end mb-4">
          <label className="font-bold">1회 가격(P)<input type="number" min="1" max="1000000" required value={config.price} onChange={e => setConfig({ ...config, price: e.target.value })} className="gacha-admin-field mt-1 max-w-48 block" /></label>
          <label className="font-bold py-3"><input type="checkbox" checked={config.enabled} onChange={e => setConfig({ ...config, enabled: e.target.checked })} /> 가챠 운영 ON</label>
          <strong className={`py-3 ${total <= 100 ? 'text-teal-700' : 'text-red-700'}`}>일반 상품 설정 {Number(total.toFixed(2))}% · 기본 상품 현재 {defaultWeight / 100}%</strong>
        </div>
        <div className="space-y-3">
          {config.prizes.map(p => <article key={p.id} className="grid grid-cols-2 xl:grid-cols-[minmax(160px,1fr)_120px_110px_auto_auto] gap-3 items-end p-3 bg-white border border-teal-100 rounded-lg">
            <label className="col-span-2 xl:col-span-1 font-bold text-sm">상품명<input required maxLength="80" value={p.name} onChange={e => changePrize(p.id, 'name', e.target.value)} className="gacha-admin-field mt-1" /></label>
            <label className="font-bold text-sm">{p.id === config.defaultPrizeId ? '자동 확률(%)' : '확률(%)'}<input type="number" min="0" max="100" step="0.01" required disabled={p.id === config.defaultPrizeId} value={p.id === config.defaultPrizeId ? defaultWeight / 100 : p.weight / 100} onChange={e => changePrize(p.id, 'weight', Math.round(Number(e.target.value) * 100))} className="gacha-admin-field mt-1" /></label>
            <label className="font-bold text-sm">{p.id === config.defaultPrizeId ? '수량 제한 없음' : '남은 수량'}<input type="number" min="0" max="1000000" step="1" required disabled={p.id === config.defaultPrizeId} value={p.stock} onChange={e => changePrize(p.id, 'stock', e.target.value)} className="gacha-admin-field mt-1" /></label>
            <div className="space-y-2"><label className="block font-bold text-sm"><input type="checkbox" checked={p.noReward} disabled={p.id === config.defaultPrizeId} onChange={e => changePrize(p.id, 'noReward', e.target.checked)} /> 지급 없는 결과</label><label className="block font-bold text-sm"><input type="radio" name="default-prize" checked={p.id === config.defaultPrizeId} onChange={() => setConfig({ ...config, defaultPrizeId: p.id, prizes: config.prizes.map(row => row.id === p.id ? { ...row, noReward: true, weight: 0 } : row) })} /> 기본 상품으로 정하기</label></div>
            <button type="button" className="shop-button-secondary text-red-700" onClick={() => setConfig({ ...config, defaultPrizeId: config.defaultPrizeId === p.id ? '' : config.defaultPrizeId, prizes: config.prizes.filter(row => row.id !== p.id) })}>삭제</button>
          </article>)}
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button type="button" disabled={config.prizes.length >= MAX_GACHA_PRIZES} className="shop-button-secondary" onClick={() => setConfig({ ...config, prizes: [...config.prizes, { id: crypto.randomUUID(), name: '', stock: 0, weight: 0, noReward: false }] })}>상품 추가</button>
          <button type="submit" className="shop-button">설정 저장</button>
        </div>
        <p className="text-sm text-gray-600 mt-3">품절 상품은 추첨 제외. 남은 확률은 수량 제한 없는 기본 상품(지급 없음)으로 자동 배정됩니다.</p>
      </fieldset>
    </form>}
    {busy && <p role="status" className="py-3">처리 중...</p>}
    <button type="button" className="shop-button-secondary mt-6" onClick={() => setHistory(v => !v)}>{history ? '내역 닫기' : '전교 구매·당첨 내역 / 지급 관리'}</button>
    {history && <ShopHistoryPanel teacher classes={classes} api={api} />}
  </section>;
}

import { useEffect, useRef, useState } from 'react';
import { SubwayTrain } from './SubwayGameView.jsx';
import { LINE_4, formatRaceTime, subwayMillis, subwayStart } from '../../utils/subway.js';
import { submitSubwayRun } from '../../services/studentSecurityApi.js';

export default function SubwayRecallView({ room, scoreData, scoreId, nickname, onHome, submitRun = submitSubwayRun }) {
  const [answers, setAnswers] = useState(() => [...new Set((scoreData?.subwayAnswers || []).filter(name => LINE_4.includes(name)))]);
  const [value, setValue] = useState('');
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(() => ['completed', 'timeout'].includes(scoreData?.subwayStatus) ? scoreData : null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const input = useRef(null), busy = useRef(false), finalSent = useRef(false), sync = useRef(subwayMillis(room?.syncRequestedAt)), animation = useRef(null);
  const deadline = subwayMillis(room?.expiresAt);
  const ended = Boolean(result) || now >= deadline || answers.length === LINE_4.length;
  useEffect(() => {
    input.current?.focus();
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => { clearInterval(timer); clearTimeout(animation.current); };
  }, []);
  async function save() {
    if (busy.current || result || !room || !scoreId) return;
    busy.current = true; setSaving(true); setError('');
    try {
      const response = await submitRun(scoreId, answers);
      if (['completed', 'timeout'].includes(response.score.subwayStatus)) setResult(response.score);
    } catch (e) { setError(e.message || '기록 저장에 실패했습니다.'); }
    finally { busy.current = false; setSaving(false); }
  }
  useEffect(() => {
    if (ended && !result && !finalSent.current && !busy.current) { finalSent.current = true; void save(); }
    const request = subwayMillis(room?.syncRequestedAt);
    if (!ended && request > sync.current && !busy.current) { sync.current = request; void save(); }
  }, [ended, result, saving, now, room?.syncRequestedAt]);
  function submit(event) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (ended || Date.now() >= deadline || Date.now() < subwayStart(room)) return;
    const name = value.trim();
    if (!LINE_4.includes(name)) { setMessage('4호선 역 이름을 확인해주세요.'); return; }
    if (answers.includes(name)) { setMessage('이미 입력한 역이에요.'); return; }
    setAnswers(previous => [...previous, name]); setValue(''); setMessage(`${name} 정답!`); setMoving(true);
    clearTimeout(animation.current); animation.current = setTimeout(() => setMoving(false), 550);
  }
  const submitted = result?.subwayAnswers || answers;
  if (!room) return <main className="metro-game"><button onClick={onHome}>학생 홈으로</button></main>;
  return <main className={`metro-game ${moving ? 'metro-accelerating' : 'metro-stopped'}`}>
    <header className="metro-header"><div className="metro-brand"><span className="metro-line">4</span><div><b>역 이름 많이 맞히기</b><small>{nickname} · 4호선 전체</small></div></div></header>
    <section className="metro-dashboard"><div><small>맞힌 정거장</small><strong>{submitted.length} / {LINE_4.length}</strong></div><div className="metro-clock"><small>남은 시간</small><strong>{formatRaceTime(Math.max(0, deadline - now)).slice(0, 5)}</strong></div><div><small>진행 방식</small><strong>순서 자유</strong></div></section>
    <section className="metro-scene" aria-label="4호선 열차"><div className="metro-mountains"/><div className="metro-buildings"/><div className="metro-track"/><SubwayTrain /></section>
    <section className="metro-console">{!ended ? <><div className="metro-departure-board"><span className="metro-board-label">기억나는 4호선 정거장은?</span><h1 className="metro-word">다음 역을 입력하세요</h1></div>
      <input className="metro-input" ref={input} aria-label="정거장 이름 입력" value={value} onChange={e => setValue(e.target.value)} onKeyDown={submit} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} onBeforeInput={e => { if (['insertFromPaste', 'insertFromDrop'].includes(e.nativeEvent.inputType)) e.preventDefault(); }} autoComplete="off" spellCheck={false} placeholder="역 이름 입력" />
      <p className="metro-feedback" role="status">{message || '4호선 · 중복 없이 도전!'}</p></> : <div className="metro-finish"><h1>{submitted.length === LINE_4.length ? '모든 정거장 정복!' : '도전 종료!'}</h1><strong className="metro-finish-time">{submitted.length}개 정답</strong><p>{result ? '기록이 선생님께 제출되었습니다.' : saving ? '기록 제출 중...' : '기록 제출을 확인해주세요.'}</p>{result && <button onClick={onHome}>학생 홈으로</button>}</div>}
      {error && <div role="alert" className="metro-error">{error}<button disabled={saving} onClick={save}>기록 저장 다시 시도</button></div>}
    </section>
    <section className="metro-route"><div className="metro-route-caption"><b>발견한 정거장</b><span>{submitted.length} / {LINE_4.length}</span></div><ol className="metro-recall-map select-none">{LINE_4.map((name, i) => <li key={name} className={submitted.includes(name) ? 'found' : ''}><small>{i + 1}</small><b>{submitted.includes(name) ? name : '?'}</b></li>)}</ol></section>
  </main>;
}

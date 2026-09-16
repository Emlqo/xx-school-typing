import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { submitSubwayRun } from '../../services/studentSecurityApi.js';
import { formatRaceTime, subwayMillis, subwayRoute, subwayStart, stationInitials, subwayHintPenalty } from '../../utils/subway.js';
import '../../styles/subway.css';

export function SubwayTrain() {
  return <svg viewBox="0 0 760 155" className="metro-train" role="img" aria-label="4호선 전동차">
    <defs><linearGradient id="train-body" x2="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#c4d4db"/></linearGradient></defs>
    {[0, 245, 490].map((x) => <g key={x} transform={`translate(${x} 0)`}>
      <rect x="3" y="22" width="242" height="99" rx="15" fill="url(#train-body)" stroke="#75949e" strokeWidth="2"/>
      <path d="M8 94H239V112H8Z" fill="#00a5df"/>
      {[22, 76, 160, 204].map((wx) => <g key={wx}><rect x={wx} y="41" width="31" height="34" rx="5" fill="#204d61"/><path d={`M${wx + 4} 45h20l-20 22z`} fill="#78cbdc" opacity=".45"/></g>)}
      <rect x="117" y="38" width="33" height="73" rx="3" fill="#e4edf0" stroke="#8caab4"/><path d="M133 39v71" stroke="#8caab4"/>
      <rect x="120" y="44" width="10" height="26" rx="2" fill="#204d61"/><rect x="136" y="44" width="10" height="26" rx="2" fill="#204d61"/>
      <rect x="41" y="118" width="162" height="8" rx="4" fill="#324951"/>
      {[53, 73, 176, 196].map((cx) => <circle key={cx} cx={cx} cy="129" r="10" fill="#203d48" stroke="#78929c" strokeWidth="3"/>)}
      <rect x="46" y="15" width="144" height="8" rx="4" fill="#9ab0b9"/>
    </g>)}
    <path d="M733 24q22 8 22 52v31q0 12-19 14V24" fill="#e3edf0" stroke="#75949e" strokeWidth="2"/>
    <path d="M737 38q10 10 11 34h-11z" fill="#204d61"/><rect x="743" y="88" width="8" height="9" rx="3" fill="#fff7ae"/>
  </svg>;
}

export default function SubwayGameView({ room, scoreData, scoreId, nickname, onHome, submitRun = submitSubwayRun }) {
  const route = useMemo(() => subwayRoute(room?.subway), [room?.subway?.from, room?.subway?.to, room?.subway?.line]);
  const [progress, setProgress] = useState(() => Math.min(route.length, Number(scoreData?.subwayProgress || 0)));
  const [value, setValue] = useState('');
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(() => ['completed', 'timeout'].includes(scoreData?.subwayStatus) ? scoreData : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [typo, setTypo] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [hints, setHints] = useState(() => {
    try { return { ...JSON.parse(sessionStorage.getItem(`subway-hints:${scoreId}`) || '{}'), ...scoreData?.subwayHints }; }
    catch { return scoreData?.subwayHints || {}; }
  });
  const hintsRef = useRef(hints);
  const input = useRef(null);
  const activeStop = useRef(null);
  const progressRef = useRef(progress);
  const inFlight = useRef(false);
  const lastRequest = useRef(0);
  const finalAttempted = useRef(false);
  const animationTimer = useRef(null);
  const start = subwayStart(room);
  const memory = room?.subway?.practice === 'memory';
  const preview = memory && now < start;
  const hintLevel = hints[progress] || 0;
  const penalty = subwayHintPenalty(hints);
  const deadline = subwayMillis(room?.expiresAt);
  const expired = deadline > 0 && now >= deadline;
  const finished = Boolean(result) || progress >= route.length || expired;
  const elapsed = result?.subwayElapsedMs ?? Math.max(0, Math.min(now, deadline || now) - start) + penalty;
  const stationLabel = !memory || preview || hintLevel === 2 ? route[progress] : hintLevel === 1 ? stationInitials(route[progress] || '') : '?'.repeat((route[progress] || '').length);

  useEffect(() => { if (!preview) input.current?.focus(); }, [preview]);
  useEffect(() => {
    const stop = activeStop.current;
    if (stop) stop.parentElement.scrollTo({ left: stop.offsetLeft - stop.parentElement.offsetLeft - stop.parentElement.clientWidth / 2 + stop.clientWidth / 2, behavior: 'smooth' });
  }, [progress, preview]);

  const revealHint = () => {
    if (!memory || preview || finished || hintLevel >= 2) return;
    const next = { ...hintsRef.current, [progress]: hintLevel + 1 };
    hintsRef.current = next;
    setHints(next);
    try { sessionStorage.setItem(`subway-hints:${scoreId}`, JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
    input.current?.focus();
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 50);
    input.current?.focus();
    return () => { clearInterval(timer); clearTimeout(animationTimer.current); };
  }, []);

  const persist = useCallback(async (final = false) => {
    if (inFlight.current || !scoreId || !room || result) return;
    inFlight.current = true;
    if (final) setSaving(true);
    setError('');
    try {
      const response = await submitRun(scoreId, route.slice(0, progressRef.current), hintsRef.current);
      if (['completed', 'timeout'].includes(response.score.subwayStatus)) setResult(response.score);
    } catch (failure) {
      setError(failure.message || '기록을 저장하지 못했습니다. 다시 시도해주세요.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [scoreId, room, route, result, submitRun]);

  useEffect(() => {
    if (!room || !finished || result || finalAttempted.current || inFlight.current) return;
    finalAttempted.current = true;
    persist(true);
  }, [finished, result, persist, saving, now, room]);

  useEffect(() => {
    const request = subwayMillis(room?.syncRequestedAt);
    if (!request || request <= lastRequest.current || finished || preview) return;
    lastRequest.current = request;
    persist();
  }, [room?.syncRequestedAt, finished, preview, persist]);

  const submit = (event) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (finished || Date.now() >= deadline || Date.now() < start) return;
    if (value.trim() !== route[progressRef.current]) { setTypo(true); return; }
    progressRef.current += 1;
    setProgress(progressRef.current);
    setValue('');
    setTypo(false);
    setArriving(true);
    clearTimeout(animationTimer.current);
    animationTimer.current = setTimeout(() => setArriving(false), 550);
  };

  if (!room || !route.length) return <main className="metro-game"><h1>경기가 종료되었거나 노선을 찾을 수 없습니다.</h1><button onClick={onHome}>학생 홈으로</button></main>;

  return <main className={`metro-game ${arriving ? 'metro-accelerating' : ''} ${finished || preview || !arriving ? 'metro-stopped' : ''}`}>
    {preview && !finished && <section className="metro-memorize-overlay" role="dialog" aria-modal="true" aria-labelledby="metro-memorize-title">
      <div className="metro-memorize-panel">
        <div className="metro-memorize-heading">
        <span className="metro-memorize-badge">4호선 · 암기 시간</span>
        <h1 id="metro-memorize-title">지금 외우세요!</h1>
        <p>정거장 이름과 순서를 기억하세요.</p>
        <div className={`metro-memorize-count ${start - now <= 5000 ? 'metro-count-urgent' : ''}`} role="timer" aria-label="암기 남은 시간"><strong>{Math.max(0, Math.ceil((start - now) / 1000))}</strong><span>초 후 출발</span></div>
        </div>
        <ol className="metro-memorize-stations select-none" onCopy={(event) => event.preventDefault()}>{route.map((name, i) => <li key={name}><span>{i + 1}</span><b>{name}</b></li>)}</ol>
      </div>
    </section>}
    <header className="metro-header"><div className="metro-brand"><span className="metro-line">4</span><div><b>지하철 타자 레이스</b><small>LINE 04 · {nickname}</small></div></div><span className="metro-route-label">{route[0]} → {route.at(-1)}</span></header>
    <section className="metro-dashboard">
      <div className="metro-clock"><small>{result?.subwayStatus === 'completed' ? '최종 기록' : '경과 시간'}</small><strong>{formatRaceTime(result?.subwayElapsedMs ?? Math.max(0, elapsed - penalty))}</strong>{!finished && <small>남은 시간 {Math.max(0, Math.ceil((deadline - Math.max(now, start)) / 1000))}초</small>}</div>
      <div><small>도착한 정거장</small><strong>{progress}<span> / {route.length}</span></strong></div>
      <div><small>힌트 가산</small><strong>+{(result?.subwayPenaltyMs ?? penalty) / 1000}<span>초</span></strong></div>
    </section>
    <section className="metro-scene" aria-label="움직이는 4호선 열차">
      {memory && !preview && !finished && now - start < 1200 && <div className="metro-start-signal" role="status">출발!</div>}
      <div className="metro-sun"/><div className="metro-mountains"/><div className="metro-buildings"/>
      <div className="metro-overhead"/><div className="metro-track"/>
      <div className="metro-station-sign"><span>{finished ? '운행 종료' : arriving ? '출발' : '정차 중'} · 4호선</span><b>{finished ? progress ? route[progress - 1] : '출발 전' : stationLabel}</b></div>
      <SubwayTrain />
      <div className="metro-speed-lines"/>
    </section>
    <section className="metro-console">
      {!finished ? <>
        <div className="metro-announcement"><span className="metro-live-dot"/>{progress ? `이전 정거장 · ${route[progress - 1]}` : '출발 정거장'} <span className="metro-next">{progress + 1} / {route.length}</span></div>
        <div className="metro-departure-board"><span className="metro-board-label">{memory ? '다음 정거장은?' : '이번 정거장'}</span>
        <h1 className="metro-word select-none" onCopy={(event) => event.preventDefault()}><small>{String(progress + 1).padStart(2, '0')}</small>{stationLabel}</h1></div>
        {preview && <div className="metro-memory-route select-none">{route.map((name, i) => <span key={name}><small>{i + 1}</small>{name}</span>)}</div>}
        <div className={typo ? 'animate-shake' : ''}><input ref={input} disabled={preview} aria-label="정거장 이름 입력" value={value} onChange={(event) => { setValue(event.target.value); setTypo(false); }} onKeyDown={submit} onPaste={(event) => event.preventDefault()} onDrop={(event) => event.preventDefault()} onBeforeInput={(event) => { if (['insertFromPaste', 'insertFromDrop'].includes(event.nativeEvent.inputType)) event.preventDefault(); }} autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="정거장 이름 입력" className="metro-input" /></div>
        {memory && !preview && <div className="metro-hints"><button disabled={hintLevel >= 2} onClick={revealHint}>{hintLevel === 0 ? '초성 힌트 +3초' : hintLevel === 1 ? '정답 보기 +5초' : '정답 공개됨'}</button><span>힌트 가산 {penalty / 1000}초</span></div>}
        <p className={`metro-feedback ${typo ? 'metro-error' : ''}`}>{typo ? '정거장 이름을 다시 확인해주세요.' : `목적지까지 ${route.length - progress}개 정거장`}</p>
      </> : <div className="metro-finish" aria-live="polite">
        <span className="metro-finish-label">{result?.subwayStatus === 'completed' ? 'ARRIVED' : expired && progress < route.length ? 'TIME UP' : 'FINISH'}</span>
        <h1>{result?.subwayStatus === 'timeout' || (expired && progress < route.length) ? '운행 시간이 종료됐어요' : '종점 도착!'}</h1>
        <strong className="metro-finish-time">{result?.subwayStatus === 'completed' ? formatRaceTime(result.subwayElapsedMs) : `${progress} / ${route.length}`}</strong>
        <p className="metro-last-station">{progress ? `마지막 도착 · ${route[progress - 1]}` : '도착 기록 없음'}</p>
        {result?.subwayStatus === 'completed' && <div className="metro-time-breakdown"><span>경과 시간 <b>{formatRaceTime(Math.max(0, result.subwayElapsedMs - (result.subwayPenaltyMs ?? penalty)))}</b></span><span>힌트 가산 <b>+{(result.subwayPenaltyMs ?? penalty) / 1000}초</b></span></div>}
        <p>{saving ? '완주 기록 확인 중...' : result ? '기록이 선생님께 제출되었습니다.' : '기록 제출을 확인해주세요.'}</p>
        {result && <button onClick={onHome}>학생 홈으로</button>}
      </div>}
      {error && <div className="metro-error" role="alert">{error}<button disabled={saving} onClick={() => persist(finished)}>기록 저장 다시 시도</button></div>}
    </section>
    <footer className="metro-route"><div className="metro-route-caption"><b>4호선</b><span>{progress} / {route.length}개 정거장 도착</span></div><div className="metro-progress"><span style={{ width: `${progress / route.length * 100}%` }}/></div><div className="metro-stops">{route.map((name, i) => <span key={name} ref={i === Math.min(progress, route.length - 1) ? activeStop : null} className={i < progress ? 'passed' : i === progress ? 'current' : ''}><i>{i + 1}</i>{memory && !preview && !finished && i >= progress ? '?' : name}</span>)}</div></footer>
  </main>;
}

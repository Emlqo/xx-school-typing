import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { elementRange, memoryStart } from '../../utils/memoryGame.js';
import { formatRaceTime, subwayMillis, subwayHintPenalty } from '../../utils/subway.js';
import { submitSubwayRun } from '../../services/studentSecurityApi.js';
import useGameFocusGuard from '../../hooks/useGameFocusGuard.js';
import { isFocusGuardEnabled } from '../../utils/fairPlay.js';
import '../../styles/elements.css';

function AtomScene({ active, symbol, number }) {
  return <div className={`element-reactor ${active ? 'element-reactor-active' : ''}`} aria-hidden="true">
    <svg className="element-atom-art" viewBox="0 0 400 300">
      {[0, 60, -60].map((angle, index) => <g key={angle} transform={`rotate(${angle} 200 150)`}>
        <path className={`element-orbit-path element-orbit-path-${index}`} d="M40 150a160 58 0 1 0 320 0a160 58 0 1 0-320 0" />
        <circle className={`element-electron element-electron-${index}`} r="5" />
      </g>)}
      <circle className="element-atom-guide" cx="200" cy="150" r="125" />
      <path className="element-atom-crosshair" d="M192 12h16M200 4v16M192 288h16M200 280v16M54 142v16M46 150h16M346 142v16M338 150h16" />
    </svg>
    <div className="element-nucleus"><small>{number || 'ATOM'}</small><strong>{symbol || '?'}</strong></div>
  </div>;
}

export default function ElementGameView({ room, scoreData, scoreId, nickname, onHome, onViolation, submitRun = submitSubwayRun }) {
  const items = useMemo(() => elementRange(room?.subway), [room?.subway?.fromNumber, room?.subway?.toNumber]);
  const recall = room?.subway?.practice === 'recall';
  const [answers, setAnswers] = useState(() => recall
    ? [...new Set((scoreData?.subwayAnswers || []).filter(name => items.some(item => item.name === name)))]
    : items.slice(0, Math.max(0, Math.min(items.length, Number(scoreData?.subwayProgress || 0)))).map(item => item.name));
  const [hints, setHints] = useState(() => {
    let local = {};
    try { if (scoreId) local = JSON.parse(sessionStorage.getItem(`element-hints:${scoreId}`) || '{}'); } catch { /* Storage may be disabled. */ }
    return Object.fromEntries(items.map((_, i) => [i, Math.max(Number(local?.[i]) || 0, Number(scoreData?.subwayHints?.[i]) || 0)]).filter(([, level]) => level === 1 || level === 2));
  });
  const [value, setValue] = useState('');
  const [now, setNow] = useState(Date.now());
  const [result, setResult] = useState(() => ['completed', 'timeout'].includes(scoreData?.subwayStatus) ? scoreData : null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [wrong, setWrong] = useState(false);
  const [reaction, setReaction] = useState(false);
  const input = useRef(null), answersRef = useRef(answers), hintsRef = useRef(hints), busy = useRef(false), finalSent = useRef(false), reactionTimer = useRef(null);
  const lastSync = useRef(subwayMillis(room?.syncRequestedAt));
  const start = memoryStart(room), deadline = subwayMillis(room?.expiresAt);
  const preview = now < start && !result;
  const ended = Boolean(result) || answers.length >= items.length || now >= deadline;
  const current = items[answers.length];
  const level = hints[answers.length] || 0;
  const penalty = subwayHintPenalty(hints);
  useGameFocusGuard(!ended && Boolean(onViolation) && isFocusGuardEnabled(room), onViolation);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => { clearInterval(timer); clearTimeout(reactionTimer.current); };
  }, []);
  useEffect(() => { if (!preview && !ended) input.current?.focus(); }, [preview, ended]);

  const save = useCallback(async () => {
    if (busy.current || result || !scoreId || !room || Date.now() < start) return;
    const finalRequest = answersRef.current.length >= items.length || Date.now() >= deadline;
    busy.current = true; setSaving(true); setError('');
    try {
      const response = await submitRun(scoreId, answersRef.current, hintsRef.current);
      if (['completed', 'timeout'].includes(response.score.subwayStatus)) setResult(response.score);
      else if (finalRequest) setError('서버에서 종료 시간을 확인 중입니다. 잠시 후 다시 제출해주세요.');
    } catch (failure) { setError(failure.message || '기록을 저장하지 못했습니다. 다시 시도해주세요.'); }
    finally { busy.current = false; setSaving(false); }
  }, [room, scoreId, result, start, submitRun, items.length, deadline]);

  useEffect(() => {
    if (ended && !result && !finalSent.current && !busy.current) { finalSent.current = true; void save(); }
  }, [ended, result, saving, save]);
  useEffect(() => {
    const request = subwayMillis(room?.syncRequestedAt);
    if (!preview && !ended && request > lastSync.current && !busy.current) { lastSync.current = request; void save(); }
  }, [room?.syncRequestedAt, preview, ended, saving, save]);

  function revealHint() {
    if (recall || preview || ended || level >= 2) return;
    const next = { ...hintsRef.current, [answersRef.current.length]: level + 1 };
    hintsRef.current = next; setHints(next);
    try { sessionStorage.setItem(`element-hints:${scoreId}`, JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
    input.current?.focus();
  }

  function submit(event) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (ended || Date.now() < start || Date.now() >= deadline) return;
    const name = value.trim();
    const expected = items[answersRef.current.length];
    if (recall ? !items.some(item => item.name === name) : name !== expected?.name) {
      setWrong(true); setMessage(recall ? '선택한 범위의 한글 원소 이름을 입력해주세요.' : '원소 이름을 다시 확인해주세요.'); return;
    }
    if (answersRef.current.includes(name)) { setWrong(true); setMessage('이미 입력한 원소예요.'); return; }
    const next = [...answersRef.current, name];
    answersRef.current = next; setAnswers(next); setValue(''); setWrong(false); setMessage(`${name} 정답!`); setReaction(true);
    clearTimeout(reactionTimer.current); reactionTimer.current = setTimeout(() => setReaction(false), 650);
  }

  if (!items.length || !room) return <main className="element-game"><h1>원소 범위를 확인해주세요.</h1><button onClick={onHome}>학생 홈으로</button></main>;
  const submitted = recall ? result?.subwayAnswers || answers : answers;
  const isComplete = result ? result.subwayStatus === 'completed' : submitted.length === items.length;
  return <main className={`element-game ${reaction ? 'element-reaction' : ''} ${!preview && !ended && deadline - now <= 15000 ? 'element-urgent' : ''}`}>
    <div className="element-shell">
      <header className="element-header"><div className="element-brand"><div className="element-brand-mark" aria-hidden="true"><small>01</small><b>H</b></div><div><span className="element-eyebrow">ELEMENT LAB / SPACE MISSION</span><h1>원소 암기 연구소</h1><p>{nickname} · 원자번호 {items[0].number}~{items.at(-1).number} · {recall ? '순서 없이 많이 맞히기' : '순서대로 외우기'}</p></div></div><span className="element-lab-status">{preview ? '암기 준비' : ended ? '실험 종료' : '실험 진행 중'}</span></header>
      <section className="element-status-bar" aria-label="게임 현황"><div><small>{preview ? '암기 남은 시간' : '남은 시간'}</small><strong>{formatRaceTime(Math.max(0, (preview ? start : deadline) - now)).slice(0, 5)}</strong></div><div><small>맞힌 원소</small><strong>{submitted.length}<em> / {items.length}</em></strong></div><div><small>{recall ? '진행 방식' : '힌트 가산'}</small><strong>{recall ? '순서 자유' : `+${(result?.subwayPenaltyMs ?? penalty) / 1000}초`}</strong></div></section>
      {preview ? <section className="element-study" role="dialog" aria-modal="true" aria-labelledby="element-study-title">
        <div className="element-study-heading"><div><span className="element-eyebrow">MEMORY TIME</span><h2 id="element-study-title">지금 원소 이름을 외우세요!</h2><p>{recall ? '순서는 상관없어요. 기억나는 한글 이름을 입력하세요.' : '원자번호 순서대로 한글 이름을 기억하세요.'}</p></div><strong className="element-study-count" role="timer">{Math.max(0, Math.ceil((start - now) / 1000))}<small>초 후 시작</small></strong></div>
        <div className="element-table select-none" onCopy={event => event.preventDefault()}>{items.map(item => <div className={`element-tile element-family-${item.family}`} key={item.number}><small>{item.number}</small><strong>{item.symbol}</strong><b>{item.name}</b></div>)}</div>
      </section> : <>
        <section className="element-lab-bench"><div className="element-atom-stage"><span className="element-stage-label">{ended ? 'MISSION COMPLETE' : 'ATOMIC REACTOR'}</span><AtomScene active={reaction} symbol={ended ? '✓' : recall ? '?' : level >= 1 ? current?.symbol : '?'} number={recall || ended ? null : current?.number} /><div className="element-reaction-status">{reaction ? '원소 확인 완료!' : ended ? '실험 데이터 확인' : '기억을 깨워 원소를 발견하세요'}</div><div className="element-discovery-meter" role="progressbar" aria-label="원소 발견률" aria-valuenow={Math.round(submitted.length / items.length * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${submitted.length / items.length * 100}%` }} /></div></div>
          <div className="element-console">{ended ? <div className="element-results" aria-live="polite"><span className="element-eyebrow">EXPERIMENT COMPLETE</span><h2>{isComplete ? '모든 원소 발견!' : '도전 종료!'}</h2><strong>{submitted.length}<small> / {items.length}개</small></strong>{result?.subwayStatus === 'completed' && <p>완주 기록 {formatRaceTime(result.subwayElapsedMs)}{Number(result.subwayPenaltyMs) > 0 && ` · 힌트 +${result.subwayPenaltyMs / 1000}초 포함`}</p>}<p>{result ? '기록이 선생님께 제출되었습니다.' : saving ? '기록 제출 중...' : '기록 제출을 확인해주세요.'}</p>{result && <button className="element-primary" onClick={onHome}>학생 홈으로</button>}</div> : <>
            <span className="element-eyebrow">{recall ? 'FREE RECALL' : `ATOMIC NUMBER ${current?.number}`}</span><h2>{recall ? '기억나는 원소 이름은?' : `원자번호 ${current?.number}번 원소는?`}</h2>
            {!recall && <div className="element-answer select-none" onCopy={event => event.preventDefault()}>{level === 2 ? current?.name : level === 1 ? current?.symbol : '?'}<small>{level === 2 ? '정답 이름' : level === 1 ? '원소기호 힌트' : '한글 이름 입력'}</small></div>}
            <div className={wrong ? 'animate-shake' : ''}><input ref={input} className="element-input" aria-label="원소 이름 입력" value={value} onChange={event => { setValue(event.target.value); setWrong(false); }} onKeyDown={submit} onPaste={event => event.preventDefault()} onDrop={event => event.preventDefault()} onBeforeInput={event => { if (['insertFromPaste', 'insertFromDrop'].includes(event.nativeEvent.inputType)) event.preventDefault(); }} autoComplete="off" spellCheck={false} placeholder="한글 원소 이름" /></div>
            <p className={`element-feedback ${wrong ? 'element-feedback-wrong' : ''}`} role="status">{message || (recall ? '순서 상관없이 · 중복 없이 도전!' : '기억나는 이름을 입력하고 Enter')}</p>
            {!recall && <button className="element-hint" onClick={revealHint} disabled={level >= 2}>{level === 0 ? '원소기호 힌트 보기 (+3초)' : level === 1 ? '정답 이름 보기 (+5초 추가)' : '정답 공개됨 (+8초)'}</button>}
          </>}{error && <div className="element-save-error" role="alert">{error}<button onClick={save} disabled={saving}>기록 저장 다시 시도</button></div>}</div>
        </section>
        <section className="element-discoveries"><div className="element-section-title"><h2>{ended ? '전체 원소 다시 보기' : '발견한 원소'}</h2><span>{ended ? `맞힘 ${submitted.length}개 · 못 맞힘 ${items.length - submitted.length}개` : `${submitted.length} / ${items.length}`}</span></div><div className="element-table select-none" onCopy={event => event.preventDefault()}>{items.map(item => {
          const found = submitted.includes(item.name), visible = ended || found;
          return <div key={item.number} className={`element-tile element-family-${item.family} ${found ? 'element-found' : ended ? 'element-missed' : 'element-unknown'}`}><small>{item.number}</small><strong>{visible ? item.symbol : '?'}</strong><b>{visible ? item.name : '미발견'}</b>{ended && <em>{found ? '맞힘' : '못 맞힘'}</em>}</div>;
        })}</div></section>
      </>}
    </div>
  </main>;
}

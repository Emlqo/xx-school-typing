import { useEffect, useMemo, useRef, useState } from 'react';
import { loadClassTypingGrowth, saveTypingGrowthExclusion } from '../../services/typingGrowth.js';
import { calculateTypingGrowth, selectGrowthTopFive } from '../../utils/typingGrowth.js';

const number = value => Number(value).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default function TypingGrowthPanel({ classes = [], authorize = () => false,
  loadRecords = loadClassTypingGrowth, saveExclusion = saveTypingGrowthExclusion }) {
  const [classId, setClassId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  const mounted = useRef(true);
  const busy = useRef(false);
  const selectedClass = classes.find(item => item.id === classId);
  const excluded = Array.isArray(selectedClass?.typingGrowthExcludedStudentIds) ? selectedClass.typingGrowthExcludedStudentIds : [];
  const validDates = !fromDate || !toDate || fromDate <= toDate;
  const analysis = useMemo(() => calculateTypingGrowth(loaded?.records || [], { classId, fromDate, toDate }),
    [loaded, classId, fromDate, toDate]);
  const rows = useMemo(() => selectGrowthTopFive(analysis.rankings, excluded), [analysis, excluded]);
  const winnerCount = rows.filter(row => !row.excluded).length;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; revision.current++; };
  }, []);

  const selectClass = value => {
    revision.current++;
    setClassId(value);
    setLoaded(null);
    setError('');
    setLoading(false);
  };
  const load = async (force = false) => {
    if (!selectedClass || !validDates || busy.current || !authorize()) return;
    if (force && !window.confirm(`[${selectedClass.name}] 저장된 기록을 다시 조회할까요? Firestore 읽기가 발생합니다.`)) return;
    busy.current = true;
    const current = ++revision.current;
    setLoading(true);
    setError('');
    try {
      const result = await loadRecords(classId, { force });
      if (mounted.current && current === revision.current) setLoaded(result);
    } catch (failure) {
      if (mounted.current && current === revision.current) setError(failure.message || '기록을 불러오지 못했습니다.');
    } finally {
      busy.current = false;
      if (mounted.current && current === revision.current) setLoading(false);
    }
  };
  const toggle = async row => {
    if (busy.current || saving || !authorize()) return;
    const targetClassId = classId;
    busy.current = true;
    setSaving(true);
    setError('');
    try {
      await saveExclusion(targetClassId, row.studentId, !row.excluded);
    } catch (failure) {
      if (mounted.current) setError(failure.message || '예외 설정을 저장하지 못했습니다.');
    } finally {
      busy.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  return <section className="bg-white/95 px-4 py-6 md:p-6 space-y-5" aria-labelledby="typing-growth-title">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-teal-200 pb-4">
      <div><p className="text-sm font-bold text-teal-700">학급별 타자 기록</p>
        <h2 id="typing-growth-title" className="text-2xl font-black text-gray-800 mt-1">성장 TOP 5</h2></div>
      <span className="text-sm font-bold text-gray-500">첫 3회 평균 → 최근 3회 평균 CPM</span>
    </header>
    <form onSubmit={event => { event.preventDefault(); load(); }} className="glass-box rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
      <label className="text-sm font-bold text-gray-600">학급
        <select aria-label="성장 분석 학급" value={classId} disabled={saving || loading} onChange={event => selectClass(event.target.value)} className="mt-2 w-full rounded-lg border border-teal-200 bg-white p-3 text-gray-800">
          <option value="">학급 선택</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-bold text-gray-600">시작일 · 비우면 전체
        <input aria-label="분석 시작일" type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} className="mt-2 w-full min-w-0 rounded-lg border border-teal-200 bg-white p-3" />
      </label>
      <label className="text-sm font-bold text-gray-600">종료일 · 비우면 전체
        <input aria-label="분석 종료일" type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} className="mt-2 w-full min-w-0 rounded-lg border border-teal-200 bg-white p-3" />
      </label>
      <button type="submit" disabled={!selectedClass || !validDates || loading || saving} className="rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-40">{loading ? '분석 중…' : '분석하기'}</button>
    </form>
    {!validDates && <p role="alert" className="text-red-700 font-bold">종료일은 시작일보다 빠를 수 없습니다.</p>}
    {error && <p role="alert" className="border-l-4 border-red-500 bg-red-50 p-4 text-red-800 font-bold">{error}</p>}
    {!loaded && !loading && <div className="py-16 text-center text-gray-500 font-bold">{selectedClass ? '아직 불러온 기록이 없습니다.' : '분석할 학급을 선택해주세요.'}</div>}
    {loaded && validDates && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
          <span className="font-black text-lg text-teal-900">{selectedClass?.name}</span>
          <span>선정 <b className="text-teal-800">{winnerCount}명</b></span>
          <span>유효 기록 <b>{analysis.validRecordCount.toLocaleString()}건</b></span>
          <span>6회 이상 참여 <b>{analysis.eligibleStudentCount}명</b></span>
        </div>
        <button type="button" onClick={() => load(true)} disabled={loading || saving} className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-40">새 기록 불러오기</button>
      </div>
      <div className="overflow-x-auto border-y border-gray-200 bg-white/90">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-teal-50 text-teal-900"><tr>{['순위', '학생', '초기 평균', '최근 평균', 'CPM 증가', '참여', '예외'].map(label => <th key={label} scope="col" className="px-4 py-3 font-bold whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{rows.map(row => <tr key={row.studentId} data-student-id={row.studentId} data-excluded={row.excluded} className={row.excluded ? 'bg-red-50 text-red-700' : row.rank === 1 ? 'bg-amber-50/80 text-gray-800' : 'text-gray-800'}>
            <td className="px-4 py-4 font-black text-lg">{row.excluded ? <span className="text-xs font-bold">제외</span> : row.rank}</td>
            <td className="px-4 py-4"><span className={`text-lg font-black ${row.excluded ? 'line-through decoration-2 decoration-red-500' : ''}`}>{row.nickname}</span>
              <details className="mt-1 text-xs"><summary className="cursor-pointer text-gray-500">비교 기록</summary>
                <div className="mt-2 space-y-2 text-gray-600"><p className="font-bold">초기</p>{row.first.map((item, index) => <p key={`first-${index}`}>{item.date} · {item.cpm}타</p>)}
                  <p className="font-bold">최근</p>{row.recent.map((item, index) => <p key={`recent-${index}`}>{item.date} · {item.cpm}타</p>)}</div>
              </details>
            </td>
            <td className={`px-4 py-4 tabular-nums ${row.excluded ? 'line-through' : ''}`}>{number(row.initialCpm)}</td>
            <td className={`px-4 py-4 tabular-nums font-bold ${row.excluded ? 'line-through' : ''}`}>{number(row.recentCpm)}</td>
            <td className={`px-4 py-4 tabular-nums text-lg font-black ${row.excluded ? 'line-through' : 'text-teal-700'}`}>+{number(row.gain)}</td>
            <td className="px-4 py-4 whitespace-nowrap">{row.recordCount}회</td>
            <td className="px-4 py-4"><button type="button" aria-label={`${row.nickname} ${row.excluded ? '순위 복원' : '순위 제외'}`} disabled={saving || loading} onClick={() => toggle(row)} className={`rounded-lg border px-3 py-2 whitespace-nowrap font-bold disabled:opacity-40 ${row.excluded ? 'border-red-200 bg-white text-red-700' : 'border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-700'}`}>{row.excluded ? '복원' : '예외 처리'}</button></td>
          </tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="text-center py-16 text-gray-500 font-bold">선정 가능한 성장 기록이 없습니다.</p>}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500">
        <span>조회 {new Date(loaded.loadedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</span>
        <span>점수 문서 {loaded.scoreCount.toLocaleString()}건 · 방 문서 {loaded.roomCount.toLocaleString()}건</span>
        <span>예외 {excluded.length}명</span>
      </div>
    </>}
  </section>;
}

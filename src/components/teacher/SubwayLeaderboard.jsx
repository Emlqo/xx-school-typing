import { formatRaceTime, rankSubwayResults, subwayRoute, subwayMillis, subwayProgressSummary } from '../../utils/subway.js';

export default function SubwayLeaderboard({ room, records, students = [], currentTime, startRoomGame, requestScoreSync }) {
  const recall = room.subway?.practice === 'recall';
  const ranked = rankSubwayResults(records, room.subway?.practice);
  const roster = students.filter(student => student.active !== false);
  const enteredIds = new Set(records.map(record => record.studentId).filter(Boolean));
  const missing = roster.filter(student => !enteredIds.has(student.id));
  const route = subwayRoute(room.subway);
  const total = route.length;
  const expired = subwayMillis(room.expiresAt) > 0 && currentTime >= subwayMillis(room.expiresAt);
  return <section className="glass-box col-span-1 rounded-3xl p-6 lg:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-black text-sky-600">LINE 04</span><h2 className="text-2xl font-black text-gray-800">{recall ? '역 이름 많이 맞히기 순위' : '지하철판 완주 순위'}</h2><p className="mt-1 font-bold text-sky-700">{recall ? '4호선 전체 · 순서 자유' : `${room.subway?.from} → ${room.subway?.to}`} · {total}개 정거장</p></div>
      {room.status === 'waiting' ? <button className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white" onClick={() => startRoomGame(room.id)}>출발!</button> : <button className="rounded-lg bg-sky-600 px-5 py-3 font-bold text-white" onClick={() => requestScoreSync(room.id)}>진행 현황 가져오기</button>}
    </div>
    {room.entryType === 'class' && <section className="my-5 rounded-lg border border-amber-200 bg-white/90 p-4" aria-label="학급 입장 현황">
      <div className="mb-3 flex flex-wrap justify-between gap-2"><h3 className="font-black text-amber-700">미입장 학생</h3><strong className="text-sm text-gray-700">입장 {roster.length - missing.length} / {roster.length}명 · 미입장 {missing.length}명</strong></div>
      {roster.length === 0 ? <p className="text-sm text-gray-500">학생 명단이 없습니다. 명단 불러오기 상태를 확인해주세요.</p> : missing.length ? <div className="flex flex-wrap gap-2">{missing.map(student => <span key={student.id} className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 font-bold text-amber-800">{student.name}</span>)}</div> : <p className="rounded-lg bg-emerald-50 p-3 font-bold text-emerald-700">모든 학생이 입장했습니다.</p>}
      <p className="mt-3 text-xs text-gray-500">입장 기록 기준이며, 현재 접속 여부와는 다릅니다.</p>
    </section>}
    <p className="my-5 text-sm font-bold text-gray-500">입장 {records.length}명 · 완주 {records.filter((r) => r.subwayStatus === 'completed').length}명</p>
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-base"><thead className="bg-sky-50 text-sky-800"><tr>{['순위', '이름', '상태', recall ? '맞힌 역 · 진행률' : '마지막 도착 · 진행률', recall ? '정답 개수' : '최종 기록'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
      {ranked.map((record) => {
        const progress = subwayProgressSummary(route, record);
        const complete = record.subwayStatus === 'completed';
        const stopped = expired || record.subwayStatus === 'timeout';
        return <tr key={record.id} className="border-b border-sky-100 even:bg-sky-50/40">
          <td className="p-3 text-xl font-black text-sky-700">{record.subwayRank ? `${record.subwayRank}위` : '—'}</td>
          <td className="p-3 font-bold text-gray-800">{record.nickname}</td>
          <td className={`p-3 font-bold ${complete ? 'text-emerald-700' : stopped ? 'text-rose-700' : 'text-sky-700'}`}>{complete ? '완주' : stopped ? recall ? '종료' : '미완주' : room.status === 'waiting' ? '출발 대기' : '운행 중'}</td>
          <td className="min-w-[220px] p-3">{recall ? <details><summary className="cursor-pointer font-bold text-sky-700">맞힌 역 목록</summary><p className="max-w-md py-2 text-sm text-gray-700">{(record.subwayAnswers || []).join(' · ') || '정답 기록 없음'}</p></details> : <strong className="block text-gray-800">{progress.lastStation ? `${progress.lastStation} 도착` : '도착 기록 없음'}</strong>}
            <div className="my-2 h-2 overflow-hidden rounded-full bg-sky-100" role="progressbar" aria-label={`${record.nickname} 진행률`} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}><div className={`h-full ${complete ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress.percent}%` }} /></div>
            <span className="text-sm font-semibold text-gray-600">{progress.count} / {progress.total}개 · {progress.percent}%</span>
          </td>
          <td className="p-3 font-mono text-lg font-black">{recall ? `${progress.count}개` : complete ? formatRaceTime(record.subwayElapsedMs) : '—'}{!recall && complete && Number(record.subwayPenaltyMs) > 0 && <small className="block font-sans text-xs font-semibold text-gray-500">힌트 +{record.subwayPenaltyMs / 1000}초 포함</small>}</td>
        </tr>;
      })}
    </tbody></table></div>
    {!ranked.length && <p className="py-8 text-center text-gray-500">아직 입장한 학생이 없습니다.</p>}
    <p className="mt-3 text-xs text-gray-500">진행 위치는 마지막으로 저장된 기록 기준입니다.</p>
  </section>;
}

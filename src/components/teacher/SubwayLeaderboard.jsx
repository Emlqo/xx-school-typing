import { formatRaceTime, rankSubwayResults, subwayRoute, subwayMillis } from '../../utils/subway.js';

export default function SubwayLeaderboard({ room, records, currentTime, startRoomGame, requestScoreSync }) {
  const ranked = rankSubwayResults(records);
  const total = subwayRoute(room.subway).length;
  const expired = subwayMillis(room.expiresAt) > 0 && currentTime >= subwayMillis(room.expiresAt);
  return <section className="glass-box col-span-1 rounded-3xl p-6 lg:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-xs font-black text-sky-600">LINE 04 · TIME ATTACK</span><h2 className="text-2xl font-black text-gray-800">지하철판 완주 순위</h2><p className="mt-1 font-bold text-sky-700">{room.subway?.from} → {room.subway?.to} · {total}개 정거장</p></div>
      {room.status === 'waiting' ? <button className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white" onClick={() => startRoomGame(room.id)}>출발!</button> : <button className="rounded-lg bg-sky-600 px-5 py-3 font-bold text-white" onClick={() => requestScoreSync(room.id)}>진행 현황 가져오기</button>}
    </div>
    <p className="my-5 text-sm font-bold text-gray-500">입장 {records.length}명 · 완주 {records.filter((r) => r.subwayStatus === 'completed').length}명</p>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-sky-50 text-sky-800"><tr>{['순위', '이름', '진행', '완주 시간'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
      {ranked.map((record) => <tr key={record.id} className="border-b border-sky-100"><td className="p-3 font-black text-sky-600">{record.subwayRank ? `${record.subwayRank}위` : '—'}</td><td className="p-3 font-bold">{record.nickname}</td><td className="p-3">{record.subwayStatus === 'completed' ? '완주' : expired || record.subwayStatus === 'timeout' ? '미완주' : room.status === 'waiting' ? '출발 대기' : `${record.subwayProgress || 0} / ${total}`}</td><td className="p-3 font-mono font-black">{record.subwayStatus === 'completed' ? formatRaceTime(record.subwayElapsedMs) : '—'}</td></tr>)}
    </tbody></table></div>
  </section>;
}

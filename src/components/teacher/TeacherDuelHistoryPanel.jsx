import { safeToLocaleNumber } from '../../utils/format.js';

function formatCompletedAt(value) {
  const millis = Number(value || 0);
  if (!millis) return '기록 시간 없음';
  return new Date(millis).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PlayerResult({ player = {}, name = '', className = '', didWin = false }) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${didWin ? 'bg-amber-50 border-amber-300 shadow-md shadow-amber-100' : 'bg-white border-cyan-100'}`}>
      <div className="text-xs font-black text-gray-400 truncate">{className || '학급 미지정'}</div>
      <div className="text-lg font-black text-gray-800 truncate mt-1">
        {didWin && <span className="mr-1">👑</span>}
        {player.nickname || name || '이름 없음'}
      </div>
      <div className={`text-3xl font-black mt-2 ${didWin ? 'text-amber-600' : 'text-teal-600'}`}>
        {safeToLocaleNumber(player.score)}
      </div>
      <div className="text-xs font-bold text-gray-400 mt-1">
        CPM {player.cpm || 0} · 퀴즈 {player.quizCorrectCount || 0}
      </div>
    </div>
  );
}

export default function TeacherDuelHistoryPanel({
  records = [],
  isLoading = false,
  hasMore = false,
  error = '',
  onLoadMore = () => {},
  onRefresh = () => {},
}) {
  return (
    <section className="glass-box rounded-3xl border border-rose-100 p-5 md:p-7 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-black tracking-widest text-rose-500">1:1 DUEL RECORDS</div>
          <h2 className="text-2xl font-black text-gray-800 mt-1">⚔️ 전체 학생 결투 전적</h2>
          <p className="text-sm font-bold text-gray-500 mt-1">완료된 결투를 최신순으로 10경기씩 조회합니다.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-3 bg-white hover:bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl font-black disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {records.map((record) => {
          const isDraw = record.result === 'draw' || !record.winnerStudentId;
          return (
            <article key={record.id} className="rounded-2xl border border-cyan-100 bg-white/80 p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-xs font-bold text-gray-400">{formatCompletedAt(record.completedAt)}</div>
                <div className={`px-3 py-1 rounded-full text-xs font-black ${isDraw ? 'bg-cyan-100 text-cyan-700' : 'bg-rose-100 text-rose-600'}`}>
                  {isDraw ? '무승부 · 포인트 변동 없음' : `승자에게 ${record.pointTransfer || 5}P 이동`}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-center">
                <PlayerResult
                  player={record.finalScores?.challenger}
                  name={record.challengerName}
                  className={record.challengerClassName}
                  didWin={record.winnerStudentId === record.challengerStudentId}
                />
                <div className="font-black text-gray-300">VS</div>
                <PlayerResult
                  player={record.finalScores?.target}
                  name={record.targetName}
                  className={record.targetClassName}
                  didWin={record.winnerStudentId === record.targetStudentId}
                />
              </div>
            </article>
          );
        })}
      </div>

      {!isLoading && records.length === 0 && !error && (
        <div className="rounded-2xl border border-cyan-100 bg-white/70 py-14 text-center">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-black text-gray-500">아직 완료된 결투 기록이 없습니다.</p>
        </div>
      )}

      {isLoading && (
        <div className="py-8 text-center font-black text-rose-500 animate-pulse">결투 전적을 불러오는 중...</div>
      )}

      {!isLoading && hasMore && (
        <button type="button" onClick={onLoadMore} className="w-full mt-5 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black">
          다음 10경기 보기
        </button>
      )}
    </section>
  );
}

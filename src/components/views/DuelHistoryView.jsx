import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
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

function getRecordDetails(record, studentId) {
  const isChallenger = record.challengerStudentId === studentId;
  const mine = isChallenger ? record.finalScores?.challenger : record.finalScores?.target;
  const opponent = isChallenger ? record.finalScores?.target : record.finalScores?.challenger;
  const opponentName = isChallenger ? record.targetName : record.challengerName;
  const opponentClassName = isChallenger ? record.targetClassName : record.challengerClassName;
  const isDraw = record.result === 'draw' || !record.winnerStudentId;
  const didWin = record.winnerStudentId === studentId;

  return {
    mine: mine || {},
    opponent: opponent || {},
    opponentName: opponent?.nickname || opponentName || '상대 학생',
    opponentClassName: opponentClassName || '학급 정보 없음',
    resultLabel: isDraw ? '무승부' : didWin ? '승리' : '패배',
    pointLabel: isDraw ? '변동 없음' : didWin ? `+${record.pointTransfer || 5}P` : `-${record.pointTransfer || 5}P`,
    resultClass: isDraw
      ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
      : didWin
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-rose-100 text-rose-600 border-rose-200',
  };
}

export default function DuelHistoryView({
  records = [],
  studentId = '',
  isLoading = false,
  hasMore = false,
  error = '',
  onLoadMore = () => {},
  onBack = () => {},
}) {
  return (
    <div className="min-h-screen spring-bg p-4 md:p-8 relative overflow-hidden">
      <CherryBlossomBackground />
      <main className="relative z-10 max-w-4xl mx-auto">
        <div className="glass-box rounded-3xl border-2 border-cyan-100 p-5 md:p-8 shadow-2xl">
          <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-black tracking-widest text-rose-500">1:1 DUEL HISTORY</div>
              <h1 className="text-3xl font-black text-gray-800 mt-1">⚔️ 최근 결투 전적</h1>
              <p className="text-sm font-bold text-gray-500 mt-2">완료된 결투를 최신순으로 10경기씩 보여줍니다.</p>
            </div>
            <button type="button" onClick={onBack} className="px-4 py-3 bg-white border border-cyan-100 text-teal-700 rounded-2xl font-black">
              ← 학생 홈
            </button>
          </header>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {records.map((record) => {
              const details = getRecordDetails(record, studentId);
              return (
                <article key={record.id} className="bg-white/90 border border-cyan-100 rounded-2xl p-4 md:p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-gray-400">{formatCompletedAt(record.completedAt)}</div>
                      <div className="text-lg font-black text-gray-800 mt-1">
                        VS {details.opponentName}
                        <span className="ml-2 text-xs font-bold text-gray-400">{details.opponentClassName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full border text-sm font-black ${details.resultClass}`}>{details.resultLabel}</span>
                      <span className="text-sm font-black text-gray-600">{details.pointLabel}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mt-4">
                    <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-center">
                      <div className="text-xs font-black text-teal-600">나</div>
                      <div className="text-2xl font-black text-gray-800">{safeToLocaleNumber(details.mine.score)}</div>
                      <div className="text-[11px] font-bold text-gray-400">CPM {details.mine.cpm || 0} · 퀴즈 {details.mine.quizCorrectCount || 0}</div>
                    </div>
                    <div className="font-black text-gray-300">VS</div>
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-center">
                      <div className="text-xs font-black text-rose-500">{details.opponentName}</div>
                      <div className="text-2xl font-black text-gray-800">{safeToLocaleNumber(details.opponent.score)}</div>
                      <div className="text-[11px] font-bold text-gray-400">CPM {details.opponent.cpm || 0} · 퀴즈 {details.opponent.quizCorrectCount || 0}</div>
                    </div>
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
            <div className="py-8 text-center font-black text-teal-600 animate-pulse">전적을 불러오는 중...</div>
          )}

          {!isLoading && hasMore && (
            <button type="button" onClick={onLoadMore} className="w-full mt-5 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black">
              다음 10경기 보기
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

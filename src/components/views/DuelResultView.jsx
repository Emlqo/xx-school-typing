import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { safeToLocaleNumber } from '../../utils/format.js';

export default function DuelResultView({ duel = null, studentId = '', onHome = () => {} }) {
  const challenger = duel?.finalScores?.challenger || { nickname: duel?.challengerName, score: 0 };
  const target = duel?.finalScores?.target || { nickname: duel?.targetName, score: 0 };
  const isDraw = duel?.result === 'draw' || !duel?.winnerStudentId;
  const didWin = duel?.winnerStudentId === studentId;
  const didLose = duel?.loserStudentId === studentId;
  const title = isDraw ? '무승부!' : didWin ? '결투 승리!' : '결투 종료';
  const pointText = isDraw ? '포인트 변동 없음' : didWin ? '+5P 획득' : didLose ? '-5P 이동' : '결과 확정';

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4 relative overflow-hidden">
      <CherryBlossomBackground />
      <div className={`relative z-10 glass-box rounded-3xl border-2 p-8 md:p-10 max-w-2xl w-full text-center shadow-2xl ${didWin ? 'border-yellow-300' : isDraw ? 'border-cyan-200' : 'border-rose-200'}`}>
        <div className="text-7xl mb-3">{isDraw ? '🤝' : didWin ? '👑' : '🛡️'}</div>
        <div className="text-xs font-black tracking-widest text-rose-500">1:1 KEYBOARD DUEL RESULT</div>
        <h1 className="text-4xl font-black text-gray-800 mt-2">{title}</h1>
        <div className={`inline-block mt-3 px-5 py-2 rounded-full font-black ${didWin ? 'bg-yellow-100 text-yellow-700' : isDraw ? 'bg-cyan-100 text-cyan-700' : 'bg-rose-100 text-rose-600'}`}>
          {pointText}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center my-8">
          <div className={`rounded-2xl border p-5 ${duel?.winnerStudentId === duel?.challengerStudentId ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-100'}`}>
            <div className="text-sm font-bold text-gray-400">{challenger.nickname}</div>
            <div className="text-4xl font-black text-teal-600 mt-1">{safeToLocaleNumber(challenger.score)}</div>
            <div className="text-xs font-bold text-gray-400 mt-2">CPM {challenger.cpm || 0} · 퀴즈 {challenger.quizCorrectCount || 0}</div>
          </div>
          <div className="text-3xl font-black text-gray-300">VS</div>
          <div className={`rounded-2xl border p-5 ${duel?.winnerStudentId === duel?.targetStudentId ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-100'}`}>
            <div className="text-sm font-bold text-gray-400">{target.nickname}</div>
            <div className="text-4xl font-black text-rose-500 mt-1">{safeToLocaleNumber(target.score)}</div>
            <div className="text-xs font-bold text-gray-400 mt-2">CPM {target.cpm || 0} · 퀴즈 {target.quizCorrectCount || 0}</div>
          </div>
        </div>

        <p className="text-sm font-bold text-gray-500 mb-6">결투 기록은 명예의 전당 활용을 위해 안전하게 저장되었습니다.</p>
        <button type="button" onClick={onHome} className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg">
          학생 홈으로
        </button>
      </div>
    </div>
  );
}

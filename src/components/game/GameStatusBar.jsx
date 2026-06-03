import { safeToLocaleNumber } from '../../utils/format.js';

export default function GameStatusBar({
  nickname = '',
  combo = 0,
  pointWeight = 1.0,
  score = 0,
  boosterActive = false,
  timeLeft = 0,
  formatTime = (value) => value,
}) {
  return (
    <div className="max-w-5xl w-full mx-auto glass-box rounded-3xl p-5 mb-8 flex flex-wrap justify-between items-center gap-4 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="bg-white px-4 py-2 rounded-xl font-bold text-gray-700 border border-pink-100 shadow-sm flex items-center gap-2">
          🧑‍🎓 {nickname || '선수'}
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold transition-all ${combo > 2 ? 'bg-pink-100 border-pink-300 text-pink-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500'}`}>
          🔥 {combo} 콤보
        </div>
        {pointWeight > 1.0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold bg-purple-100 border-purple-300 text-purple-600 shadow-sm">
            ✨ 점수 x{pointWeight}
          </div>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="text-gray-500 font-medium text-lg">
          점수: <span className={`font-black text-2xl md:text-3xl transition-colors ${boosterActive ? 'text-orange-500 animate-pulse' : 'text-pink-500'}`}>{safeToLocaleNumber(score)}</span>
        </div>
        <div className={`font-mono text-2xl font-bold px-4 py-2 rounded-xl border ${timeLeft <= 60 ? 'bg-red-50 border-red-200 text-red-500 animate-pulse' : 'bg-white border-pink-200 text-gray-700'}`}>
          ⏱️ {formatTime(timeLeft)}
        </div>
      </div>
    </div>
  );
}

import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { REWARD_RULES } from '../../constants/rewards.js';
import { calculateCpm } from '../../utils/scoring.js';
import { safeToLocaleNumber } from '../../utils/format.js';

function RewardSummary({ reward }) {
  if (!reward || !reward.totalEarned) return null;

  const growthPercent = Math.round(REWARD_RULES.growthRateThreshold * 100);
  const rows = [
    ['게임 완료', reward.gameCompletePoints],
    ['퀴즈 정답', reward.quizPoints],
    ['최고 기록 갱신', reward.bestScoreBonus],
    [`${growthPercent}% 성장 보너스`, reward.growthBonus],
  ].filter(([, value]) => value > 0);

  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 mb-8 text-left shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-xs font-black text-emerald-600 tracking-widest">이번 게임 보상</div>
          <div className="text-2xl font-black text-emerald-700">+{safeToLocaleNumber(reward.totalEarned)}P</div>
        </div>
        <div className="text-4xl">✨</div>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm font-bold text-gray-600">
            <span>{label}</span>
            <span className="text-emerald-600">+{safeToLocaleNumber(value)}P</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultView({
  score = 0,
  correctChars = 0,
  gameDuration = 0,
  lastReward = null,
  onHome = () => {},
  onPracticeAgain = () => {},
}) {
  const finalCpm = calculateCpm({ chars: correctChars, seconds: gameDuration });

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4 relative overflow-hidden">
      <CherryBlossomBackground />

      <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full border border-pink-100 shadow-2xl z-10 relative">
        <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-pink-200 text-5xl">
          🏆
        </div>

        <h1 className="text-3xl font-black text-gray-800 mb-2">연습 종료!</h1>
        <p className="text-gray-500 mb-8 font-medium">
          오늘의 기록을 확인하고 다음 도전에 이어 가세요.
        </p>

        <div className="bg-white rounded-2xl p-6 mb-8 border border-pink-100 shadow-sm">
          <div className="text-sm text-gray-500 font-bold mb-1">최종 점수</div>
          <div className="text-6xl font-black text-pink-500 mb-6">{safeToLocaleNumber(score)}</div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-5">
            <div>
              <div className="text-xs text-gray-400 font-bold">분당 타수(CPM)</div>
              <div className="text-2xl font-black text-gray-700">{finalCpm} <span className="text-sm text-gray-400 font-medium">타</span></div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-bold">정확히 친 글자</div>
              <div className="text-2xl font-black text-gray-700">{safeToLocaleNumber(correctChars)} <span className="text-sm text-gray-400 font-medium">자</span></div>
            </div>
          </div>
        </div>

        <RewardSummary reward={lastReward} />

        <div className="space-y-3">
          <button onClick={onHome} className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-md transition-colors">
            처음으로 돌아가기
          </button>
          <button onClick={onPracticeAgain} className="w-full py-4 bg-white border-2 border-pink-300 text-pink-600 hover:bg-pink-50 rounded-2xl font-bold text-lg shadow-sm transition-colors">
            다시 연습하기
          </button>
        </div>
      </div>
    </div>
  );
}

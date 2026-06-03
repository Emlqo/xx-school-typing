import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { calculateCpm } from '../../utils/scoring.js';
import { safeToLocaleNumber } from '../../utils/format.js';

export default function ResultView({
  score = 0,
  correctChars = 0,
  gameDuration = 0,
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
          자유 연습을 마쳤습니다. 실전 대결에 도전해보세요!
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

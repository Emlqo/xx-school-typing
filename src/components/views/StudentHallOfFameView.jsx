import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import HallOfFamePanel from '../teacher/HallOfFamePanel.jsx';

export default function StudentHallOfFameView({
  monthKey = '',
  setMonthKey = () => {},
  hallOfFame = {},
  savedAt = null,
  isLoading = false,
  error = null,
  onBack = () => {},
}) {
  return (
    <div className="min-h-screen spring-bg p-4 md:p-8 relative overflow-hidden">
      <CherryBlossomBackground />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-3 bg-white/90 hover:bg-white text-teal-700 border border-cyan-100 rounded-2xl font-black shadow-md transition-colors"
          >
            ← 학생 홈
          </button>
          <div className="text-right">
            <div className="text-xs font-black tracking-widest text-teal-700">풍양중학교 키보드 배틀</div>
            <div className="text-sm font-bold text-gray-500">우리들의 빛나는 기록</div>
          </div>
        </div>

        <HallOfFamePanel
          monthKey={monthKey}
          setMonthKey={setMonthKey}
          hallOfFame={hallOfFame}
          savedAt={savedAt}
          isLoading={isLoading}
          error={error}
          readOnly
        />
      </div>
    </div>
  );
}

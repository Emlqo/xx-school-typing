import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { DUEL_RULES } from '../../constants/duelRules.js';
import { getCurrentDuelDailyWinPoints } from '../../utils/classStudents.js';

export default function DuelChallengeView({
  student = null,
  classes = [],
  students = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  isSubmitting = false,
  duelEnabled = true,
  availabilityLoading = false,
  onChallenge = () => {},
  onBack = () => {},
}) {
  const dailyWinPoints = getCurrentDuelDailyWinPoints(student);
  const reachedDailyLimit = dailyWinPoints >= DUEL_RULES.dailyWinPointLimit;
  const canChallenge = duelEnabled
    && !availabilityLoading
    && Number(student?.totalPoints || 0) >= DUEL_RULES.stakePoints
    && !reachedDailyLimit;

  return (
    <div className="min-h-screen spring-bg p-4 md:p-8 relative overflow-hidden">
      <CherryBlossomBackground />
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="glass-box rounded-3xl border-2 border-cyan-100 p-6 md:p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-black tracking-widest text-rose-500">1:1 KEYBOARD DUEL</div>
              <h1 className="text-3xl font-black text-gray-800 mt-1">⚔️ 결투 상대 선택</h1>
              <p className="text-sm font-bold text-gray-500 mt-2">상대 학급과 이름을 선택해 3분 결투 신청서를 보냅니다.</p>
            </div>
            <button type="button" onClick={onBack} className="px-4 py-3 bg-white border border-cyan-100 text-teal-700 rounded-2xl font-black">
              ← 학생 홈
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-white/90 border border-cyan-100 rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-400">나의 포인트</div>
              <div className="text-2xl font-black text-teal-600">{student?.totalPoints || 0}P</div>
            </div>
            <div className="bg-white/90 border border-cyan-100 rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-400">경기 시간</div>
              <div className="text-2xl font-black text-gray-800">3분 혼합</div>
            </div>
            <div className="bg-white/90 border border-cyan-100 rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-400">승부 포인트</div>
              <div className="text-2xl font-black text-rose-500">±5P</div>
            </div>
            <div className="bg-white/90 border border-amber-100 rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-400">오늘 결투 획득</div>
              <div className="text-2xl font-black text-amber-500">
                {dailyWinPoints} / {DUEL_RULES.dailyWinPointLimit}P
              </div>
              <div className="text-[11px] font-bold text-gray-400 mt-1">매일 00:00 초기화</div>
            </div>
          </div>

          {!duelEnabled ? (
            <div className="mb-5 rounded-2xl bg-gray-100 border border-gray-200 p-4 text-gray-600 font-black">
              선생님이 현재 결투 기능을 닫았습니다. 학생 홈으로 돌아가 주세요.
            </div>
          ) : availabilityLoading ? (
            <div className="mb-5 rounded-2xl bg-cyan-50 border border-cyan-200 p-4 text-cyan-700 font-black">
              결투 가능 여부를 확인하고 있습니다.
            </div>
          ) : reachedDailyLimit ? (
            <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-700 font-black">
              오늘 결투 획득 한도 15P를 모두 채웠습니다. 자정 이후 다시 도전하세요.
            </div>
          ) : !canChallenge && (
            <div className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-600 font-black">
              결투를 신청하려면 최소 5P가 필요합니다.
            </div>
          )}

          <label className="block text-sm font-black text-gray-600 mb-2">상대 학급</label>
          <select
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="w-full bg-white border-2 border-cyan-100 rounded-2xl px-4 py-3 font-black text-gray-700 outline-none focus:border-teal-400 mb-6"
          >
            <option value="">학급을 선택하세요</option>
            {classes.filter((item) => item.active !== false).map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {selectedClassId && students.length > 0 ? students.map((target) => {
              const isMe = target.id === student?.id;
              return (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => onChallenge(target)}
                  disabled={!canChallenge || isMe || isSubmitting}
                  className="min-h-24 bg-white hover:bg-rose-50 border-2 border-white hover:border-rose-200 rounded-2xl p-4 text-left shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="text-xs font-black text-rose-400">{isMe ? '나' : '도전 가능'}</div>
                  <div className="text-lg font-black text-gray-800 truncate mt-1">{target.name}</div>
                </button>
              );
            }) : (
              <div className="col-span-full text-center py-12 bg-white/60 border border-cyan-100 rounded-2xl text-gray-400 font-bold">
                {selectedClassId ? '등록된 학생이 없습니다.' : '먼저 상대 학급을 선택하세요.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

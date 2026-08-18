import { useEffect, useMemo, useState } from 'react';
import { formatTime, safeToLocaleNumber } from '../../utils/format.js';
import { DUEL_RULES } from '../../constants/duelRules.js';

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
};

const getDuelClock = (duel, currentTime) => {
  if (!duel) return { label: '0:00', phase: 'waiting' };
  const startsAt = toMillis(duel.startsAt);
  const endsAt = toMillis(duel.endsAt);
  if (duel.status === 'completed') return { label: '종료', phase: 'completed' };
  if (duel.status === 'cancelled') return { label: '취소', phase: 'cancelled' };
  if (startsAt > currentTime) {
    return { label: String(Math.max(1, Math.ceil((startsAt - currentTime) / 1000))), phase: 'countdown' };
  }
  if (endsAt > currentTime) {
    return { label: formatTime(Math.max(0, Math.ceil((endsAt - currentTime) / 1000))), phase: 'playing' };
  }
  return { label: '집계 중', phase: 'finalizing' };
};

function PlayerSide({ name, className, score = {}, side = 'left', isLeader = false, isBroadcast = false }) {
  const accent = side === 'left' ? 'cyan' : 'emerald';
  return (
    <section className={`relative min-w-0 px-1 ${isBroadcast ? 'sm:px-3 md:px-8' : ''}`}>
      {isLeader && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-950 shadow-lg shadow-amber-300/30">
          LEADING
        </div>
      )}
      <div className={`text-center ${isLeader ? 'scale-[1.02]' : ''} transition-transform`}>
        <p className={`font-black uppercase tracking-widest ${isBroadcast ? 'text-base text-white/60' : 'text-xs text-gray-400'}`}>
          {className || '학급 미지정'}
        </p>
        <h3 className={`${isBroadcast ? 'mt-3 text-2xl sm:text-3xl md:text-6xl text-white' : 'mt-1 text-xl sm:text-2xl text-gray-900'} font-black break-words`}>
          {name || '선수'}
        </h3>
        <div className={`${isBroadcast ? 'mt-7 text-4xl sm:text-6xl md:text-8xl' : 'mt-5 text-3xl sm:text-5xl'} font-black tabular-nums ${accent === 'cyan' ? 'text-cyan-400' : 'text-emerald-400'}`}>
          {safeToLocaleNumber(Number(score.score || 0))}
        </div>
        <p className={`${isBroadcast ? 'text-xl text-white/50' : 'text-sm text-gray-400'} mt-1 font-bold`}>POINT</p>
        <div className={`mt-6 grid grid-cols-3 overflow-hidden border ${isBroadcast ? 'border-white/15 bg-white/5' : 'border-cyan-100 bg-white/70'} rounded-lg`}>
          {[
            ['CPM', score.cpm],
            ['정답 글자', score.correctChars],
            ['퀴즈', score.quizCorrectCount],
          ].map(([label, value], index) => (
            <div key={label} className={`px-1 py-2 text-center sm:px-2 sm:py-3 ${index > 0 ? isBroadcast ? 'border-l border-white/15' : 'border-l border-cyan-100' : ''}`}>
              <div className={`${isBroadcast ? 'text-lg sm:text-2xl text-white' : 'text-base sm:text-lg text-gray-800'} font-black tabular-nums`}>{safeToLocaleNumber(Number(value || 0))}</div>
              <div className={`${isBroadcast ? 'text-white/50' : 'text-gray-400'} mt-1 text-xs font-bold`}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveScoreboard({ duel, scores, currentTime, isBroadcast = false }) {
  const challengerScore = scores.find((score) => score.studentId === duel?.challengerStudentId) || {};
  const targetScore = scores.find((score) => score.studentId === duel?.targetStudentId) || {};
  const challengerPoints = Number(challengerScore.score || 0);
  const targetPoints = Number(targetScore.score || 0);
  const maxScore = Math.max(challengerPoints, targetPoints, 1);
  const challengerWidth = Math.max(4, (challengerPoints / maxScore) * 100);
  const targetWidth = Math.max(4, (targetPoints / maxScore) * 100);
  const clock = getDuelClock(duel, currentTime);

  if (!duel) {
    return (
      <div className="flex min-h-[420px] items-center justify-center text-center text-gray-400">
        <div>
          <div className="text-5xl">LIVE</div>
          <p className="mt-4 font-bold">왼쪽 목록에서 중계할 결투를 선택하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isBroadcast ? 'flex min-h-screen flex-col justify-center px-4 py-16 md:px-12' : 'p-5 md:p-8'}>
      <div className="flex items-center justify-center gap-3">
        <span className="live-badge rounded-full px-3 py-1 text-xs font-black text-white">LIVE</span>
        <span className={`${isBroadcast ? 'text-white/60' : 'text-gray-400'} text-sm font-bold`}>1:1 혼합 타자 결투</span>
      </div>

      <div className="my-6 text-center">
        <div className={`${clock.phase === 'countdown' ? 'text-amber-300' : clock.phase === 'finalizing' ? 'text-orange-300' : isBroadcast ? 'text-white' : 'text-gray-900'} ${isBroadcast ? 'text-5xl sm:text-6xl md:text-8xl' : 'text-4xl sm:text-5xl'} font-black tabular-nums`}>
          {clock.label}
        </div>
        {clock.phase === 'countdown' && <p className={`${isBroadcast ? 'text-white/50' : 'text-gray-400'} mt-2 font-bold`}>잠시 후 결투가 시작됩니다</p>}
      </div>

      <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3 md:gap-6">
        <PlayerSide
          name={duel.challengerName}
          className={duel.challengerClassName}
          score={challengerScore}
          side="left"
          isLeader={challengerPoints > targetPoints}
          isBroadcast={isBroadcast}
        />
        <div className={`${isBroadcast ? 'text-3xl md:text-5xl text-white/30' : 'text-2xl text-gray-300'} font-black`}>VS</div>
        <PlayerSide
          name={duel.targetName}
          className={duel.targetClassName}
          score={targetScore}
          side="right"
          isLeader={targetPoints > challengerPoints}
          isBroadcast={isBroadcast}
        />
      </div>

      <div className={`mx-auto mt-8 w-full max-w-5xl ${isBroadcast ? 'space-y-4' : 'space-y-2'}`}>
        <div className={`${isBroadcast ? 'h-5 bg-white/10' : 'h-3 bg-gray-100'} overflow-hidden rounded-full`}>
          <div className="h-full rounded-full bg-cyan-400 transition-[width] duration-500" style={{ width: `${challengerWidth}%` }} />
        </div>
        <div className={`${isBroadcast ? 'h-5 bg-white/10' : 'h-3 bg-gray-100'} overflow-hidden rounded-full`}>
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${targetWidth}%` }} />
        </div>
      </div>
      <p className={`${isBroadcast ? 'text-white/40' : 'text-gray-400'} mt-5 text-center text-xs font-bold`}>
        점수는 학생 기기에서 변경될 때 최대 약 3초 간격으로 반영됩니다.
      </p>
    </div>
  );
}

export default function TeacherDuelLivePanel({
  duels = [],
  selectedDuelId = '',
  setSelectedDuelId = () => {},
  selectedDuel = null,
  scores = [],
  currentTime = Date.now(),
  isLoading = false,
  error = null,
  detailError = null,
  finalizingDuelId = '',
  onFinalizeSelected = () => {},
  onCancelAll = () => {},
  isCancellingAll = false,
}) {
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const selectedStillListed = useMemo(
    () => duels.some((duel) => duel.id === selectedDuelId),
    [duels, selectedDuelId],
  );
  const canFinalizeSelected = Boolean(
    selectedDuel
      && selectedDuel.status === 'playing'
      && toMillis(selectedDuel.endsAt) > 0
      && toMillis(selectedDuel.endsAt) + DUEL_RULES.finalizeGraceMs <= currentTime
      && scores.length === 2
      && !detailError
  );
  const isFinalizingSelected = Boolean(
    selectedDuel?.id && finalizingDuelId === selectedDuel.id,
  );

  useEffect(() => {
    if (!selectedDuelId && duels[0]?.id) setSelectedDuelId(duels[0].id);
  }, [duels, selectedDuelId, setSelectedDuelId]);

  useEffect(() => {
    if ((!selectedDuel && !selectedStillListed) || selectedDuel?.status === 'cancelled') setIsBroadcastOpen(false);
  }, [selectedDuel, selectedStillListed]);

  return (
    <>
      <div className="glass-box overflow-hidden rounded-3xl border border-cyan-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100 bg-white/70 px-5 py-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">결투 LIVE 중계</h2>
            <p className="mt-1 text-sm font-bold text-gray-400">진행 중인 경기 하나를 선택해 실시간으로 확인합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCancelAll}
              disabled={duels.length === 0 || isCancellingAll}
              title="수업 종료 시 모든 진행 중 결투를 취소하고 승부 포인트를 반환합니다."
              className="rounded-xl border border-red-200 bg-white px-4 py-2 font-black text-red-600 shadow-sm transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {isCancellingAll ? '전체 취소 중...' : '진행 경기 전체 취소'}
            </button>
            <button
              type="button"
              onClick={onFinalizeSelected}
              disabled={!canFinalizeSelected || isFinalizingSelected}
              title={canFinalizeSelected ? '마지막 저장 점수로 승패를 확정합니다.' : '종료 시간이 지난 뒤 사용할 수 있습니다.'}
              className="rounded-xl bg-rose-600 px-4 py-2 font-black text-white shadow-md transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isFinalizingSelected ? '결과 확정 중...' : '선택 경기 결과 확정'}
            </button>
            <button
              type="button"
              onClick={() => setIsBroadcastOpen(true)}
              disabled={!selectedDuel}
              className="rounded-xl bg-teal-600 px-4 py-2 font-black text-white shadow-md transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              전체 화면 중계
            </button>
          </div>
        </div>

        <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-b border-cyan-100 bg-cyan-50/60 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-black text-gray-700">진행 중 결투</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-teal-700">{duels.length}경기</span>
            </div>
            <div className="custom-scrollbar max-h-[460px] space-y-2 overflow-y-auto pr-1">
              {duels.map((duel) => {
                const clock = getDuelClock(duel, currentTime);
                const isSelected = duel.id === selectedDuelId;
                return (
                  <button
                    key={duel.id}
                    type="button"
                    onClick={() => setSelectedDuelId(duel.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${isSelected ? 'border-teal-400 bg-teal-600 text-white shadow-md' : 'border-cyan-100 bg-white text-gray-700 hover:border-teal-300'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black ${isSelected ? 'text-white/70' : 'text-teal-600'}`}>{clock.label}</span>
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>혼합 1:1</span>
                    </div>
                    <div className="mt-2 truncate font-black">{duel.challengerName || '선수'} VS {duel.targetName || '선수'}</div>
                    <div className={`mt-1 truncate text-xs font-bold ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      {duel.challengerClassName || '학급 미지정'} · {duel.targetClassName || '학급 미지정'}
                    </div>
                  </button>
                );
              })}
              {!isLoading && duels.length === 0 && (
                <div className="rounded-lg border border-dashed border-cyan-200 bg-white/70 px-4 py-10 text-center text-sm font-bold text-gray-400">
                  현재 진행 중인 결투가 없습니다.
                </div>
              )}
              {isLoading && <div className="py-10 text-center text-sm font-bold text-teal-600">LIVE 경기 확인 중...</div>}
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-600">결투 목록을 불러오지 못했습니다.</div>}
            </div>
          </aside>

          <main className="bg-white/55">
            {selectedDuel && scores.length < 2 && !detailError && (
              <div className="mx-5 mt-5 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-center text-sm font-bold text-cyan-700">
                두 선수의 점수 연결을 기다리고 있습니다.
              </div>
            )}
            {detailError && (
              <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                중계 데이터 연결이 불안정합니다. 표시된 점수가 최신 값이 아닐 수 있습니다.
              </div>
            )}
            <LiveScoreboard duel={selectedDuel} scores={scores} currentTime={currentTime} />
          </main>
        </div>
      </div>

      {isBroadcastOpen && selectedDuel && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#062f31]">
          {detailError && (
            <div className="fixed left-4 top-4 z-[110] rounded-lg border border-red-300/40 bg-red-500/20 px-4 py-2 text-sm font-black text-red-100 backdrop-blur">
              중계 연결 불안정
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsBroadcastOpen(false)}
            className="fixed right-4 top-4 z-[110] rounded-lg border border-white/20 bg-black/20 px-4 py-2 font-black text-white backdrop-blur hover:bg-black/35"
          >
            중계 화면 닫기
          </button>
          <LiveScoreboard duel={selectedDuel} scores={scores} currentTime={currentTime} isBroadcast />
        </div>
      )}
    </>
  );
}

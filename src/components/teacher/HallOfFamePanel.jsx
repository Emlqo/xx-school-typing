import { safeToLocaleNumber } from '../../utils/format.js';

const defaultHallOfFame = {
  classMvp: [],
  quizKing: [],
  speedKing: [],
  participationKing: [],
  growthKing: [],
};

function formatSavedAt(value) {
  if (!value) return '';

  const date = typeof value.toDate === 'function'
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR');
}

function RankingRow({
  item,
  index,
  valueLabel = '점',
  valueKey = 'value',
}) {
  const rankLabel = index === 0 ? '1위' : `${index + 1}위`;
  const value = item?.[valueKey] ?? item?.value ?? 0;

  return (
    <div className="bg-white border border-pink-100 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-pink-300 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 ${index === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-pink-50 text-pink-500'}`}>
          {rankLabel}
        </div>
        <div className="min-w-0">
          <div className="font-black text-gray-800 truncate">{item.nickname || '이름 없음'}</div>
          <div className="text-xs text-gray-400 font-bold truncate">{item.className || '학급 미지정'}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-black text-pink-500 text-lg">{safeToLocaleNumber(value)}</div>
        <div className="text-xs text-gray-400 font-bold">{valueLabel}</div>
      </div>
    </div>
  );
}

function RankingList({
  title,
  description,
  items = [],
  valueLabel,
  valueKey,
}) {
  return (
    <div className="bg-white/70 border border-pink-100 rounded-2xl p-4">
      <div className="mb-3">
        <h3 className="text-lg font-black text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400 font-bold mt-1">{description}</p>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
        {items.length > 0 ? items.map((item, index) => (
          <RankingRow
            key={`${item.classId || 'all'}-${item.studentId || index}-${title}`}
            item={item}
            index={index}
            valueLabel={valueLabel}
            valueKey={valueKey}
          />
        )) : (
          <div className="text-center text-gray-400 py-10 bg-white rounded-xl border border-pink-100 font-bold">
            아직 불러온 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function ClassMvpSection({ items = [] }) {
  const overallMvp = items.reduce((best, item) => (
    !best || Number(item.value || 0) > Number(best.value || 0) ? item : best
  ), null);

  return (
    <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-orange-300 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-black">반별 이달의 MVP</h3>
          <p className="text-sm text-white/80 font-bold mt-1">그 달에 기록한 가장 높은 단일 게임 점수로 학급마다 한 명씩 선정합니다.</p>
        </div>
        <div className="text-4xl">🏆</div>
      </div>

      {overallMvp && (
        <div className="relative overflow-hidden mb-4 rounded-2xl border-2 border-yellow-200 bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 p-5 text-yellow-950 shadow-[0_0_30px_rgba(253,224,71,0.75)] animate-success-pop">
          <div className="absolute inset-x-0 top-0 h-1 bg-white/80 animate-pulse" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-black tracking-widest text-amber-700">이번 달 전체 최고 MVP</div>
              <div className="text-3xl font-black truncate mt-1">{overallMvp.nickname || '이름 없음'}</div>
              <div className="text-sm font-black text-amber-700 mt-1">{overallMvp.className || '학급 미지정'}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-5xl drop-shadow-md">👑</div>
              <div className="text-right">
                <div className="text-xs font-black text-amber-700">월간 최고 점수</div>
                <div className="text-4xl font-black">{safeToLocaleNumber(overallMvp.value || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.length > 0 ? items.map((item) => {
          const isOverallMvp = overallMvp?.classId === item.classId
            && overallMvp?.studentId === item.studentId;

          return (
            <div
              key={`${item.classId}-${item.studentId}`}
              className={`relative text-gray-800 rounded-xl p-4 border shadow-sm ${
                isOverallMvp
                  ? 'hall-mvp-champion'
                  : 'bg-white/95 border-white/80'
              }`}
            >
              {isOverallMvp && (
                <>
                  <div className="hall-mvp-crown" aria-hidden="true">👑</div>
                  <span className="hall-mvp-spark hall-mvp-spark-one" aria-hidden="true">✦</span>
                  <span className="hall-mvp-spark hall-mvp-spark-two" aria-hidden="true">✧</span>
                  <span className="hall-mvp-spark hall-mvp-spark-three" aria-hidden="true">✦</span>
                </>
              )}

              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className={`text-xs font-black ${isOverallMvp ? 'text-amber-700' : 'text-pink-500'}`}>
                    {item.className || '학급 미지정'}
                  </div>
                  {isOverallMvp && (
                    <span className="hall-mvp-badge">전체 1위</span>
                  )}
                </div>
                <div className={`font-black text-xl truncate ${isOverallMvp ? 'text-amber-950 drop-shadow-sm' : ''}`}>
                  {item.nickname || '이름 없음'}
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className={`text-xs font-bold ${isOverallMvp ? 'text-amber-700' : 'text-gray-400'}`}>월간 최고 점수</div>
                    <div className={`text-2xl font-black ${isOverallMvp ? 'text-amber-700' : 'text-pink-500'}`}>
                      {safeToLocaleNumber(item.value || item.bestScore || 0)}
                    </div>
                  </div>
                  <div className={`text-xs font-bold ${isOverallMvp ? 'text-amber-700' : 'text-gray-400'}`}>
                    {item.gamesPlayed || 0}회 참여
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="md:col-span-2 xl:col-span-3 text-center py-10 bg-white/20 rounded-xl border border-white/30 font-bold">
            아직 선정된 MVP 기록이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

export default function HallOfFamePanel({
  monthKey = '',
  setMonthKey = () => {},
  hallOfFame = defaultHallOfFame,
  monthlyScores = [],
  scoreCount = 0,
  savedAt = null,
  onRefresh = () => {},
  isLoading = false,
  error = null,
  readOnly = false,
}) {
  const data = { ...defaultHallOfFame, ...hallOfFame };
  const loadedScoreCount = scoreCount || monthlyScores.length;
  const savedAtLabel = formatSavedAt(savedAt);

  return (
    <div className="glass-box p-6 rounded-3xl mt-6 border border-yellow-100">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-yellow-700 flex items-center gap-2">🏆 명예의 전당</h2>
          <p className="text-sm text-gray-500 font-bold mt-1">
            {readOnly
              ? '선생님이 확정해 저장한 월간 명예의 전당 기록입니다.'
              : '저장된 월간 결과를 먼저 표시하고, 버튼을 누를 때만 전체 기록을 다시 계산합니다.'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-100 p-3 min-w-[260px]">
          <label className="text-xs font-black text-gray-400 block mb-1">집계 월</label>
          <input
            type="month"
            value={monthKey}
            onChange={(event) => setMonthKey(event.target.value)}
            className="w-full px-3 py-2 border border-yellow-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-black text-gray-700"
          />
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="w-full mt-3 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-yellow-950 rounded-xl font-black transition-colors"
              >
                {isLoading ? '기록 처리 중...' : '선택한 월 기록 갱신하고 저장'}
              </button>
              <div className="text-xs text-gray-400 font-bold mt-2">계산에 사용한 기록 {loadedScoreCount}개</div>
            </>
          )}
          {savedAtLabel && (
            <div className="text-xs text-emerald-600 font-bold mt-1">마지막 저장 {savedAtLabel}</div>
          )}
          {error && (
            <div className="text-xs text-red-500 font-bold mt-2">
              기록을 불러오는 중 오류가 발생했습니다.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <ClassMvpSection items={data.classMvp} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <RankingList
            title="퀴즈왕 TOP 10"
            description="단일 게임 퀴즈 정답 수 최고 기록 기준"
            items={data.quizKing}
            valueLabel="개"
          />
          <RankingList
            title="스피드왕 TOP 10"
            description="월간 최고 CPM 기준"
            items={data.speedKing}
            valueLabel="CPM"
          />
          <RankingList
            title="꾸준왕 TOP 10"
            description="로그인 후 완료한 월간 자유 연습 횟수 기준"
            items={data.participationKing}
            valueLabel="회"
          />
        </div>
      </div>
    </div>
  );
}

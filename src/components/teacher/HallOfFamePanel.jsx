import { safeToLocaleNumber } from '../../utils/format.js';

const defaultHallOfFame = {
  classMvp: [],
  quizKing: [],
  speedKing: [],
  participationKing: [],
  growthKing: [],
};

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
  return (
    <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-orange-300 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-black">반별 이달의 MVP</h3>
          <p className="text-sm text-white/80 font-bold mt-1">월간 누적 점수 기준으로 학급마다 한 명씩 선정합니다.</p>
        </div>
        <div className="text-4xl">🏆</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.length > 0 ? items.map((item) => (
          <div key={`${item.classId}-${item.studentId}`} className="bg-white/95 text-gray-800 rounded-xl p-4 border border-white/80 shadow-sm">
            <div className="text-xs font-black text-pink-500 mb-1">{item.className || '학급 미지정'}</div>
            <div className="font-black text-xl truncate">{item.nickname || '이름 없음'}</div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-gray-400 font-bold">월간 누적 점수</div>
                <div className="text-2xl font-black text-pink-500">{safeToLocaleNumber(item.value || item.totalScore || 0)}</div>
              </div>
              <div className="text-xs font-bold text-gray-400">{item.gamesPlayed || 0}회 참여</div>
            </div>
          </div>
        )) : (
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
  onRefresh = () => {},
  isLoading = false,
  error = null,
}) {
  const data = { ...defaultHallOfFame, ...hallOfFame };

  return (
    <div className="glass-box p-6 rounded-3xl mt-6 border border-yellow-100">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-yellow-700 flex items-center gap-2">🏆 명예의 전당</h2>
          <p className="text-sm text-gray-500 font-bold mt-1">버튼을 누를 때만 월간 기록을 불러와 DB 읽기를 최소화합니다.</p>
        </div>
        <div className="bg-white rounded-2xl border border-yellow-100 p-3 min-w-[260px]">
          <label className="text-xs font-black text-gray-400 block mb-1">집계 월</label>
          <input
            type="month"
            value={monthKey}
            onChange={(event) => setMonthKey(event.target.value)}
            className="w-full px-3 py-2 border border-yellow-200 rounded-xl outline-none focus:ring-2 focus:ring-yellow-400 font-black text-gray-700"
          />
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full mt-3 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-yellow-950 rounded-xl font-black transition-colors"
          >
            {isLoading ? '기록 불러오는 중...' : '선택한 월 기록 불러오기'}
          </button>
          <div className="text-xs text-gray-400 font-bold mt-2">불러온 기록 {monthlyScores.length}개</div>
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
            description="월간 퀴즈 정답 수 합계 기준"
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
            description="월간 참여 횟수 기준"
            items={data.participationKing}
            valueLabel="회"
          />
          <RankingList
            title="성장왕 TOP 10"
            description="월 초 기록 대비 월 말 기록의 점수 상승폭 기준"
            items={data.growthKing}
            valueLabel="점 상승"
            valueKey="growth"
          />
        </div>
      </div>
    </div>
  );
}

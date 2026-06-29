import AnnouncementModal from '../common/AnnouncementModal.jsx';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import LinkifiedText from '../common/LinkifiedText.jsx';
import { REWARD_RULES } from '../../constants/rewards.js';
import StudentHomeShopPanel from '../common/StudentHomeShopPanel.jsx';

const VACATION_CEREMONY_DATE = '2026-07-20';

function calculateVacationDday() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetDate = new Date(`${VACATION_CEREMONY_DATE}T00:00:00+09:00`);
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.ceil((targetStart.getTime() - todayStart.getTime()) / 86400000);

  if (diffDays > 0) return `D-${diffDays}`;
  if (diffDays === 0) return 'D-DAY';
  return '방학 중';
}

function formatAnnouncementDate(announcement) {
  if (announcement.createdAt?.toDate) {
    return announcement.createdAt.toDate().toLocaleDateString('ko-KR');
  }

  return '';
}

function AnnouncementBoard({ announcements = [], onOpenModal = () => {} }) {
  return (
    <div className="bg-white/90 border border-cyan-100 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-black text-sky-600 tracking-widest">학교 게시판</div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            공지사항
            {announcements.length > 0 && (
              <span className="bg-teal-500 text-white text-xs px-2 py-1 rounded-full">{announcements.length}</span>
            )}
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenModal}
          className="px-4 py-2 bg-cyan-50 hover:bg-cyan-100 text-teal-700 border border-cyan-100 rounded-xl font-black text-sm transition-colors"
        >
          크게 보기
        </button>
      </div>

      <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-2">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <article
              key={announcement.id}
              className={`text-left rounded-2xl border p-4 shadow-sm ${
                announcement.isAlert
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gradient-to-br from-white to-cyan-50/60 border-cyan-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-black text-gray-800 leading-snug">
                  {announcement.isAlert && <span className="text-red-500 mr-1 animate-pulse">🚨</span>}
                  {announcement.title}
                </h3>
                {announcement.isAlert && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-red-500 text-white font-black shrink-0">중요</span>
                )}
              </div>
              <LinkifiedText text={announcement.content} className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-medium" />
              <div className="text-xs text-gray-400 font-bold text-right mt-3">
                {formatAnnouncementDate(announcement)}
              </div>
            </article>
          ))
        ) : (
          <div className="text-center py-12 bg-cyan-50/70 border border-cyan-100 rounded-2xl">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-400 font-bold">등록된 공지사항이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RewardGuideBoard() {
  const growthPercent = Math.round(REWARD_RULES.growthRateThreshold * 100);
  const rewardItems = [
    ['순위 보상', `1위 ${REWARD_RULES.rankPoints.first}P · 2위 ${REWARD_RULES.rankPoints.second}P · 3위 ${REWARD_RULES.rankPoints.third}P`, `상위 30%는 ${REWARD_RULES.rankPoints.topThirtyPercent}P, 나머지 완주자는 ${REWARD_RULES.rankPoints.completion}P를 받아요.`],
    ['퀴즈 정답', `정답 1개당 +${REWARD_RULES.quizCorrectPoints}P`, '돌발 퀴즈를 맞힐수록 포인트가 쌓여요.'],
    ['최고 기록 갱신', `+${REWARD_RULES.bestScoreBonus}P`, '내 이전 최고 점수를 넘으면 보너스가 있어요.'],
    [`${growthPercent}% 성장`, `+${REWARD_RULES.growthBonus}P`, '이전 최고 기록보다 크게 성장하면 추가 보상!'],
  ];

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 border border-cyan-100 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-black text-teal-600 tracking-widest">포인트 얻는 법</div>
          <h2 className="text-xl font-black text-gray-800">상점 포인트 안내</h2>
        </div>
        <div className="text-4xl">💎</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rewardItems.map(([title, points, description]) => (
          <div key={title} className="bg-white/85 border border-white rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="font-black text-gray-800">{title}</div>
              <div className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{points}</div>
            </div>
            <p className="text-xs text-gray-500 font-bold leading-relaxed">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginView({
  announcements = [],
  showAnnouncementModal = false,
  setShowAnnouncementModal = () => {},
  onStudentClick = () => {},
  onPracticeClick = () => {},
  onGuestClick = () => {},
  onStudentLogout = () => {},
  onTeacherClick = () => {},
  studentProfile = null,
  shopItems = [],
  onBuyCosmetic = async () => null,
  onBuyStockItem = async () => null,
  onEquipCosmetic = async () => null,
}) {
  const vacationDday = calculateVacationDday();

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />

      {showAnnouncementModal && (
        <AnnouncementModal
          announcements={announcements}
          onClose={() => setShowAnnouncementModal(false)}
        />
      )}

      <button
        onClick={() => setShowAnnouncementModal(true)}
        className="absolute top-4 right-4 bg-white/80 hover:bg-white text-teal-700 px-4 py-2 rounded-full text-sm font-bold shadow-md border border-cyan-100 transition-all flex items-center gap-2 z-20"
      >
        📢 공지사항
        {announcements.length > 0 && (
          <span className="bg-teal-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs animate-bounce">
            {announcements.length}
          </span>
        )}
      </button>

      <div className="max-w-6xl w-full z-10 relative space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)] gap-6">
        <div className="glass-box rounded-3xl p-8 md:p-10 text-center shadow-2xl border-2 border-cyan-100">
          <div className="text-6xl mb-3 animate-bounce">🎮🏔️</div>

          <h1 className="text-4xl md:text-5xl font-black mb-3 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500 drop-shadow-sm">
            풍양중학교<br />키보드 배틀
          </h1>

          <p className="text-teal-900/70 font-bold mb-5 tracking-wide">
            시원한 여름 숲속 타자 대결
          </p>

          <div className="mb-8 bg-white/80 border border-cyan-100 rounded-2xl px-5 py-4 shadow-sm">
            <div className="text-xs font-black text-teal-600 tracking-widest mb-1">여름방학 카운트다운</div>
            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-500">
              {vacationDday}
            </div>
            <div className="text-xs font-bold text-gray-400 mt-1">방학식 2026년 7월 20일</div>
          </div>

          <div className="space-y-4">
            <button onClick={onStudentClick} className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-teal-300/60 transition-all flex items-center justify-center gap-2 transform hover:scale-105">
              🎒 선수 입장
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={onPracticeClick} className="py-3 bg-cyan-50 hover:bg-cyan-100 text-teal-700 rounded-2xl font-black border border-cyan-100">자유 연습</button>
              <button onClick={onGuestClick} className="py-3 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-2xl font-black border border-sky-100">게스트 입장</button>
            </div>
            <button onClick={onTeacherClick} className="w-full py-4 bg-white/85 hover:bg-white text-slate-700 rounded-2xl font-bold text-lg border-2 border-cyan-100 transition-all flex items-center justify-center gap-2">
              🧑‍🏫 교무실(관리자) 접속
            </button>
            <button onClick={onStudentLogout} className="w-full py-2 text-sm font-bold text-gray-400 hover:text-red-500 transition-colors">학생 로그아웃</button>
          </div>
        </div>

        <div className="glass-box rounded-3xl p-5 md:p-6 shadow-2xl border-2 border-cyan-100 space-y-5">
          <AnnouncementBoard
            announcements={announcements}
            onOpenModal={() => setShowAnnouncementModal(true)}
          />
          <RewardGuideBoard />
        </div>
      </div>
      <StudentHomeShopPanel
        student={studentProfile}
        shopItems={shopItems}
        onBuyCosmetic={onBuyCosmetic}
        onBuyStockItem={onBuyStockItem}
        onEquipCosmetic={onEquipCosmetic}
      />
      </div>
    </div>
  );
}

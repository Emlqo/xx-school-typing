import { useEffect, useRef } from 'react';
import AnnouncementModal from '../common/AnnouncementModal.jsx';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import LinkifiedText from '../common/LinkifiedText.jsx';
import StudentAssessmentBoard from '../common/StudentAssessmentBoard.jsx';
import StudentHomeShopPanel from '../common/StudentHomeShopPanel.jsx';
import TypeforgeProfileGear from '../common/TypeforgeProfileGear.jsx';
import { formatAnnouncementDate, safeToLocaleNumber } from '../../utils/format.js';
import { REWARD_RULES } from '../../constants/rewards.js';
import './StudentHome.css';

const EXAM_DATE = new Date(2026, 11, 7);
const PANELS = [
  { id: 'assessments', label: '형성평가', icon: '✎' },
  { id: 'shop', label: '상점', icon: '◇' },
  { id: 'gear', label: '내 장비', icon: '▣' },
  { id: 'announcements', label: '공지 내역', icon: '▤' },
];

function examCountdown() {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const remaining = Math.round((EXAM_DATE - midnight) / 86400000);
  return remaining > 0 ? `시험 D-${remaining}` : remaining === 0 ? '시험 D-DAY' : '';
}

function HomeAction({ label, icon, detail, primary = false, onClick }) {
  return (
    <button type="button" className="student-home__action" data-primary={primary} onClick={onClick}>
      <span className="student-home__action-icon" aria-hidden="true">{icon}</span>
      <span className="student-home__action-copy">
        <strong>{label}</strong>
        <span>{detail}</span>
      </span>
      <span className="student-home__action-arrow" aria-hidden="true">→</span>
    </button>
  );
}

function AnnouncementHistory({ announcements, loading, error, onRefresh }) {
  return (
    <section className="student-home__surface" aria-busy={loading}>
      <div className="student-home__surface-header">
        <h2>공지 내역</h2>
        <button type="button" className="student-home__text-action" disabled={loading} onClick={onRefresh}>
          {error ? '다시 불러오기' : '새로고침'}
        </button>
      </div>
      {loading && <p className="student-home__feedback" role="status">공지 내역을 불러오고 있어요.</p>}
      {error && <p className="student-home__feedback" role="alert">공지 내역을 불러오지 못했어요.</p>}
      {!loading && !error && announcements.length === 0 && <p className="student-home__feedback">등록된 공지사항이 없어요.</p>}
      <div className="student-home__history">
        {!loading && !error && announcements.map((announcement) => (
          <article key={announcement.id} data-urgent={announcement.isAlert || undefined}>
            <header>
              <h3>{announcement.isAlert && <span>긴급</span>}{announcement.title}</h3>
              <time>{formatAnnouncementDate(announcement.createdAt)}</time>
            </header>
            <LinkifiedText text={announcement.content} className="student-home__notice-body" />
          </article>
        ))}
      </div>
    </section>
  );
}

function RewardGuide() {
  const growth = Math.round(REWARD_RULES.growthRateThreshold * 100);
  return (
    <details className="student-home__surface student-home__rewards">
      <summary>상점 포인트 얻는 방법</summary>
      <ul>
        <li>학급 경기 순위 보상은 1위 {REWARD_RULES.rankPoints.first}P, 2위 {REWARD_RULES.rankPoints.second}P, 3위 {REWARD_RULES.rankPoints.third}P예요. 상위 30%는 {REWARD_RULES.rankPoints.topThirtyPercent}P, 나머지 완주자는 {REWARD_RULES.rankPoints.completion}P를 받아요.</li>
        <li>퀴즈를 맞힐 때마다 {REWARD_RULES.quizCorrectPoints}P를 받아요.</li>
        <li>최고 기록을 갱신하면 {REWARD_RULES.bestScoreBonus}P, 이전 기록보다 {growth}% 이상 성장하면 {REWARD_RULES.growthBonus}P를 추가로 받아요.</li>
      </ul>
    </details>
  );
}

export default function LoginView({
  activePanel = '',
  onPanelChange = () => {},
  announcements = [],
  announcementsLoading = false,
  announcementError = null,
  onRefreshAnnouncements = () => {},
  urgentAnnouncements = [],
  showAnnouncementModal = false,
  setShowAnnouncementModal = () => {},
  onStudentClick = () => {},
  onPracticeClick = () => {},
  onGuestClick = () => {},
  onHallOfFameClick = () => {},
  onDuelClick = () => {},
  duelEnabled = true,
  duelAvailabilityLoading = false,
  onDuelHistoryClick = () => {},
  onStudentLogout = () => {},
  onTeacherClick = () => {},
  studentProfile = null,
  studentHomeCacheKey = '',
  shopItems = [],
  shopLoading = false,
  shopError = null,
  onRefreshShopItems = () => {},
  onBuyCosmetic = async () => null,
  onBuyStockItem = async () => null,
  onEquipCosmetic = async () => null,
  onRefreshStudentProfile = async () => null,
  onShopProfileChange = () => {},
  onOpenAssessment = () => {},
}) {
  const panelRef = useRef(null);
  const currentPanel = PANELS.find((panel) => panel.id === activePanel);
  const exam = examCountdown();

  useEffect(() => {
    const panel = panelRef.current;
    if (!activePanel || !panel) return;
    panel.focus({ preventScroll: true });
    if (panel.getBoundingClientRect().top > window.innerHeight * 0.7) {
      panel.scrollIntoView({ block: 'start' });
    }
  }, [activePanel]);

  return (
    <div className="spring-bg student-home">
      <CherryBlossomBackground />
      <main className="student-home__layout">
        <header className="student-home__header">
          <div>
            {exam && <p className="student-home__exam">{exam}</p>}
            <h1>풍양중학교 정보 시스템</h1>
          </div>
          {studentProfile && (
            <div className="student-home__profile">
              <span className="student-home__avatar" aria-hidden="true">{studentProfile.name?.trim().slice(-2) || '학생'}</span>
              <div className="student-home__identity">
                <strong>{studentProfile.name}</strong>
                {studentProfile.className && <span>{studentProfile.className}</span>}
              </div>
              <span className="student-home__points" aria-label={`보유 포인트 ${safeToLocaleNumber(studentProfile.totalPoints)}점`}>
                {safeToLocaleNumber(studentProfile.totalPoints)}<small>P</small>
              </span>
            </div>
          )}
        </header>

        <div className="student-home__actions" role="group" aria-label="타자 경기">
          <HomeAction label="선수 입장" icon="⌨" detail="우리 반 경기 참가" primary onClick={onStudentClick} />
          <HomeAction label="자유연습" icon="↗" detail="내 속도로 타자 연습" onClick={onPracticeClick} />
        </div>

        {urgentAnnouncements.length > 0 && (
          <button type="button" className="student-home__urgent" onClick={() => setShowAnnouncementModal(true)}>
            <strong>긴급 공지</strong>
            <span>{urgentAnnouncements[0].title}</span>
            <span aria-hidden="true">→</span>
          </button>
        )}

        <nav className="student-home__tiles" aria-label="학생 메뉴">
          {PANELS.map(({ id, label, icon }) => (
            <button key={id} type="button" aria-expanded={activePanel === id} aria-controls="student-home-panel"
              onClick={() => onPanelChange(activePanel === id ? '' : id)}>
              <span className="student-home__tile-icon" aria-hidden="true">{icon}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </nav>

        <section id="student-home-panel" className="student-home__panel" ref={panelRef} tabIndex={-1}
          aria-label={currentPanel?.label || '학생 메뉴 내용'} hidden={!currentPanel}>
          {activePanel === 'assessments' && (
            <StudentAssessmentBoard key={studentHomeCacheKey} cacheKey={studentHomeCacheKey} onOpenAssessment={onOpenAssessment} />
          )}
          {activePanel === 'shop' && (
            <>
              <div className="student-home__surface-header student-home__shop-heading">
                <h2>포인트 상점</h2>
                <button type="button" className="student-home__text-action" disabled={shopLoading} onClick={onRefreshShopItems}>
                  {shopError ? '다시 불러오기' : '상품 새로고침'}
                </button>
              </div>
              {shopLoading && <p className="student-home__feedback" role="status">상품을 불러오고 있어요.</p>}
              {shopError && <p className="student-home__feedback" role="alert">상품을 불러오지 못했어요.</p>}
              {!shopLoading && !shopError && (
                <StudentHomeShopPanel key={studentProfile?.id} student={studentProfile} showGear={false}
                  shopItems={shopItems} onBuyCosmetic={onBuyCosmetic} onBuyStockItem={onBuyStockItem}
                  onEquipCosmetic={onEquipCosmetic} onRefreshStudentProfile={onRefreshStudentProfile}
                  onProfileChange={onShopProfileChange} />
              )}
              <RewardGuide />
            </>
          )}
          {activePanel === 'gear' && <TypeforgeProfileGear key={studentHomeCacheKey} cacheKey={studentHomeCacheKey} />}
          {activePanel === 'announcements' && (
            <AnnouncementHistory announcements={announcements} loading={announcementsLoading}
              error={announcementError} onRefresh={onRefreshAnnouncements} />
          )}
        </section>

        <nav className="student-home__links" aria-label="경기와 기록">
          <button type="button" onClick={onDuelClick} disabled={!duelEnabled || duelAvailabilityLoading}>
            {duelAvailabilityLoading ? '결투 확인 중…' : duelEnabled ? '1:1 결투 신청' : '결투 일시 중지'}
          </button>
          <button type="button" onClick={onDuelHistoryClick}>최근 결투 전적 보기</button>
          <button type="button" onClick={onHallOfFameClick}>명예의 전당</button>
          <button type="button" onClick={onGuestClick}>게스트 입장</button>
        </nav>
        <footer className="student-home__footer">
          <button type="button" onClick={onTeacherClick}>교무실(관리자) 접속</button>
          <button type="button" onClick={onStudentLogout}>학생 로그아웃</button>
        </footer>
      </main>
      {showAnnouncementModal && urgentAnnouncements.length > 0 && (
        <AnnouncementModal announcements={urgentAnnouncements} onClose={() => setShowAnnouncementModal(false)} />
      )}
    </div>
  );
}

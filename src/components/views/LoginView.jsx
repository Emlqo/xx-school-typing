import AnnouncementModal from '../common/AnnouncementModal.jsx';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function LoginView({
  announcements = [],
  showAnnouncementModal = false,
  setShowAnnouncementModal = () => {},
  onStudentClick = () => {},
  onTeacherClick = () => {},
}) {
  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />

      {showAnnouncementModal && (
        <AnnouncementModal
          announcements={announcements}
          onClose={() => setShowAnnouncementModal(false)}
        />
      )}

      <button onClick={() => setShowAnnouncementModal(true)} className="absolute top-4 right-4 bg-white/80 hover:bg-white text-teal-700 px-4 py-2 rounded-full text-sm font-bold shadow-md border border-cyan-100 transition-all flex items-center gap-2 z-20">
        📢 공지사항 {announcements.length > 0 && <span className="bg-teal-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-xs animate-bounce">{announcements.length}</span>}
      </button>

      <div className="glass-box rounded-3xl p-8 md:p-10 text-center max-w-md w-full z-10 relative shadow-2xl border-2 border-cyan-100">
        <div className="text-6xl mb-3 animate-bounce">⛰️🌿</div>

        <h1 className="text-4xl md:text-5xl font-black mb-3 italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500 drop-shadow-sm">
          풍양중학교<br />키보드 배틀
        </h1>

        <p className="text-teal-900/70 font-bold mb-8 tracking-wide">
          시원한 여름 숲속 타자 대결
        </p>

        <div className="space-y-4">
          <button onClick={onStudentClick} className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-teal-300/60 transition-all flex items-center justify-center gap-2 transform hover:scale-105">
            🎮 선수 입장
          </button>
          <button onClick={onTeacherClick} className="w-full py-4 bg-white/85 hover:bg-white text-slate-700 rounded-2xl font-bold text-lg border-2 border-cyan-100 transition-all flex items-center justify-center gap-2">
            👩‍🏫 교무실(관리자) 접속
          </button>
        </div>
      </div>
    </div>
  );
}

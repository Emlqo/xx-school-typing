import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function EntryView({
  onStudentLogin = () => {},
  onGuestEntry = () => {},
  onPractice = () => {},
  onTeacherClick = () => {},
}) {
  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <main className="glass-box rounded-3xl p-7 md:p-10 max-w-lg w-full z-10 relative shadow-2xl border-2 border-cyan-100 text-center">
        <div className="text-6xl mb-3 animate-bounce">🎮🏔️</div>
        <h1 className="text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500">
          풍양중학교<br />키보드 배틀
        </h1>
        <p className="text-teal-900/70 font-bold mb-8">개인 PIN으로 로그인하고 내 기록과 상점을 확인하세요.</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onStudentLogin}
            className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-teal-300/60 transition-all hover:scale-[1.02]"
          >
            학생 로그인
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onPractice} className="py-3 bg-white/90 hover:bg-white border-2 border-cyan-100 text-teal-700 rounded-2xl font-black transition-colors">
              자유 연습
            </button>
            <button type="button" onClick={onGuestEntry} className="py-3 bg-white/90 hover:bg-white border-2 border-cyan-100 text-sky-700 rounded-2xl font-black transition-colors">
              게스트 입장
            </button>
          </div>
          <button type="button" onClick={onTeacherClick} className="w-full py-3 text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors">
            교무실(관리자) 접속
          </button>
        </div>

        <div className="mt-7 rounded-2xl bg-white/70 border border-cyan-100 p-4 text-left">
          <div className="text-xs font-black text-teal-600 tracking-widest">로그인 안내</div>
          <p className="text-sm text-gray-600 font-bold mt-1 leading-relaxed">
            학급과 이름을 선택한 뒤 개인 PIN을 입력합니다. 로그인은 30분 동안 유지됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}

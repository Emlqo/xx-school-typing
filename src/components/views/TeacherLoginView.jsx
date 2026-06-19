import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function TeacherLoginView({
  error = '',
  isLoading = false,
  teacherUidConfigured = false,
  currentUser = null,
  gatePassed = false,
  gatePassword = '',
  setGatePassword = () => {},
  onBack = () => {},
  onGateSubmit = () => {},
  onGoogleSignIn = () => {},
}) {
  const setupUid = !teacherUidConfigured && currentUser && !currentUser.isAnonymous
    ? currentUser.uid
    : '';

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full z-10 relative shadow-xl">
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 font-medium">
          ← 뒤로
        </button>
        <div className="text-5xl mb-4 mt-4">🔐</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">교무실 보안 로그인</h1>
        <p className="text-gray-500 mb-7">
          {gatePassed ? '등록된 선생님 Google 계정으로 최종 인증하세요.' : '1차 관리자 비밀번호를 입력하세요.'}
        </p>

        {!gatePassed ? (
          <form onSubmit={onGateSubmit}>
            <input
              type="password"
              value={gatePassword}
              onChange={(event) => setGatePassword(event.target.value)}
              placeholder="관리자 비밀번호"
              autoComplete="current-password"
              className="w-full px-4 py-4 bg-white border border-cyan-100 outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 rounded-2xl text-center text-lg font-black"
            />
            <button type="submit" disabled={isLoading || !gatePassword} className="w-full py-4 mt-3 bg-slate-800 hover:bg-slate-900 disabled:bg-gray-300 text-white rounded-2xl font-black text-lg shadow-lg">
              1차 인증하기
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={onGoogleSignIn}
            disabled={isLoading}
            className="w-full py-4 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 text-gray-700 rounded-2xl font-black text-lg shadow-lg border border-gray-200 flex items-center justify-center gap-3"
          >
            <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-blue-600 font-black">G</span>
            {isLoading ? 'Google 계정 확인 중...' : currentUser && !currentUser.isAnonymous ? '관리자 페이지 열기' : 'Google 계정으로 로그인'}
          </button>
        )}

        {error && (
          <p className="text-red-500 text-sm font-bold mt-4 whitespace-pre-wrap">{error}</p>
        )}

        {gatePassed && setupUid && (
          <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left">
            <div className="text-sm font-black text-amber-800">최초 관리자 UID 설정 필요</div>
            <p className="text-xs text-amber-700 mt-1">아래 UID를 로컬과 Vercel의 VITE_TEACHER_UID에 설정하세요.</p>
            <code className="block mt-3 p-3 rounded-xl bg-white border border-amber-100 text-xs break-all select-all text-gray-700">
              {setupUid}
            </code>
          </div>
        )}

        <p className="text-xs text-gray-400 font-bold mt-6">공용 PC에서는 사용 후 반드시 로그아웃하세요.</p>
      </div>
    </div>
  );
}

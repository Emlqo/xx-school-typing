import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function TeacherLoginView({
  teacherPwd = '',
  setTeacherPwd = () => {},
  pwdError = '',
  onBack = () => {},
  onSubmit = () => {},
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(event);
  };

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full z-10 relative">
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 font-medium">← 뒤로</button>
        <div className="text-5xl mb-4 mt-4">🔐</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">교무실 인증</h1>
        <p className="text-gray-500 mb-6">선생님 전용 비밀번호를 입력해주세요.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={teacherPwd}
            onChange={(e) => setTeacherPwd(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full px-4 py-4 bg-white border border-pink-200 outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 rounded-2xl mb-2 text-center tracking-widest text-lg"
          />
          {pwdError && <p className="text-red-500 text-sm mb-4">{pwdError}</p>}
          <button type="submit" className="w-full py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-lg mt-4">인증하기</button>
        </form>
      </div>
    </div>
  );
}

import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function WaitingView({
  nickname = '',
  myRoomData = null,
  onLeave = () => {},
}) {
  return (
    <div className="min-h-screen spring-bg flex flex-col items-center justify-center p-4">
      <CherryBlossomBackground />
      <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full z-10 relative shadow-xl">
        <div className="text-6xl mb-6 animate-bounce">⏳</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">시작 대기 중...</h1>
        <p className="text-pink-500 font-black mb-2">{nickname || '선수'} 님</p>
        <p className="text-gray-500 font-medium mb-6">
          [{myRoomData?.name || '선택한 방'}] 반에 입장했습니다.<br />
          선생님이 시작할 때까지 손가락을 풀어주세요!
        </p>
        <div className="w-full bg-pink-100 h-2 rounded-full overflow-hidden mb-6">
          <div className="bg-pink-500 h-full animate-pulse" style={{ width: '100%' }} />
        </div>
        <button onClick={onLeave} className="w-full py-3 bg-white border-2 border-pink-200 text-pink-600 hover:bg-pink-50 rounded-2xl font-bold shadow-sm transition-colors">
          나가기
        </button>
      </div>
    </div>
  );
}

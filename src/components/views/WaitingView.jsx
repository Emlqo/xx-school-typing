import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { enterGameFullscreen, isFocusGuardEnabled } from '../../utils/fairPlay.js';

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
        {myRoomData?.mode === 'subway' && <p className="mb-3 font-black text-sky-600">{myRoomData.subway?.practice === 'recall' ? '4호선 전체 · 역 이름 많이 맞히기' : `4호선 · ${myRoomData.subway?.from} → ${myRoomData.subway?.to}`}<br />{myRoomData.subway?.practice === 'recall' ? '순서 자유 · 중복 없이 도전' : '지하철판 · 완주 시간 대결'}</p>}
        <p className="text-pink-500 font-black mb-2">{nickname || '선수'} 님</p>
        <p className="text-gray-500 font-medium mb-6">
          [{myRoomData?.name || '선택한 방'}] 반에 입장했습니다.<br />
          선생님이 시작할 때까지 손가락을 풀어주세요!
        </p>
        {isFocusGuardEnabled(myRoomData) ? <div className="mb-6 rounded-lg border-2 border-rose-300 bg-rose-50 p-4 text-left text-rose-900">
          <strong className="block mb-2">화면 이탈 주의</strong>
          <p className="text-sm leading-relaxed">경기 시작 후에는 전체 화면을 유지해주세요. 암기 시간에도 다른 탭·창 이동, Alt+Tab, 전체 화면 해제 시 경기가 즉시 중단되며 선생님 점수판에 표시됩니다. 새로고침하거나 재입장해도 이어 할 수 없습니다.</p>
          <button type="button" onClick={enterGameFullscreen} className="mt-3 font-bold underline">전체 화면으로 돌아가기</button>
        </div> : <p className="mb-6 font-bold text-emerald-700">화면 이탈 방지 OFF · 전체 화면 자유</p>}
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

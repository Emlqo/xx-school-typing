import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function StudentRoomEntryView({
  student,
  rooms = [],
  isLoading = false,
  onRefresh = () => {},
  onJoin = () => {},
  onBack = () => {},
}) {
  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <main className="glass-box rounded-3xl p-6 md:p-9 max-w-3xl w-full z-10 relative shadow-2xl border-2 border-cyan-100">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="text-sm font-black text-gray-500 hover:text-teal-700">← 메인으로</button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="rounded-xl border border-cyan-100 bg-white px-3 py-2 text-sm font-black text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? '확인 중...' : '↻ 방 새로고침'}
          </button>
        </div>
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">🎮</div>
          <h1 className="text-3xl font-black text-gray-800">선수 입장</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">{student?.name} 학생의 학급에 개설된 방만 표시됩니다.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => onJoin(student, room)}
              className="text-left p-5 rounded-2xl bg-white border border-cyan-100 hover:border-teal-300 hover:bg-teal-50 transition-all"
            >
              <div className="font-black text-xl text-gray-800">{room.className || room.name}</div>
              <div className="text-sm font-bold text-gray-500 mt-2">
                {room.status === 'playing' ? '진행 중 · 재입장 가능' : '입장 대기 중'} · {room.duration || 300}초
              </div>
            </button>
          ))}
          {rooms.length === 0 && (
            <div className="sm:col-span-2 text-center py-14 rounded-2xl bg-white/80 border border-dashed border-cyan-200">
              <div className="text-4xl mb-3">🏫</div>
              <p className="font-black text-gray-500">현재 선생님이 개설한 학급 방이 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

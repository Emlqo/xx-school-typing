export default function RoomList({
  rooms = [],
  currentTime = Date.now(),
  viewingRoomId = '',
  setViewingRoomId = () => {},
  handleDeleteRoom = () => {},
}) {
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
      <div onClick={() => setViewingRoomId('all')} className={`p-3 rounded-xl cursor-pointer transition-all border font-medium flex justify-between items-center ${viewingRoomId === 'all' ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white border-transparent hover:bg-pink-50 text-gray-600'}`}>
        <span>학교 전체 보기</span>
      </div>
      {rooms.map((room) => {
        const isExpired = room.expiresAt && currentTime > room.expiresAt;

        return (
          <div key={room.id} onClick={() => setViewingRoomId(room.id)} className={`p-3 rounded-xl cursor-pointer transition-all border flex flex-col gap-1 ${viewingRoomId === room.id ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white border-gray-100 hover:bg-pink-50 text-gray-600'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold">{room.name} <span className="text-blue-500 font-black ml-2 bg-blue-50 px-2 py-1 rounded">코드: {room.roomCode}</span></span>
              </div>
              <button onClick={(event) => { event.stopPropagation(); handleDeleteRoom(room.id, room.name); }} className="text-red-300 hover:text-red-500 px-2 text-lg transition-colors" title="반 삭제하기">✖</button>
            </div>
            <div className="text-[11px] font-bold mt-1">
              <span className="text-gray-400 mr-2">
                {room.mode === 'ko' ? '한글' : room.mode === 'en' ? '영어' : '혼합'} | {room.duration / 60}분
              </span>
              {isExpired ? (
                <span className="text-red-400">마감됨</span>
              ) : (
                <span className="text-pink-500 animate-pulse">{room.status === 'playing' ? '진행 중' : '입장 가능'}</span>
              )}
            </div>
          </div>
        );
      })}
      {rooms.length === 0 && <div className="text-center text-gray-400 py-6 bg-white rounded-2xl border border-pink-100">아직 만든 반이 없습니다.</div>}
    </div>
  );
}

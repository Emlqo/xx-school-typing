function toMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

function getRoomStatusLabel(room, currentTime) {
  const expiresAt = toMillis(room.expiresAt);
  const isExpired = room.status === 'playing' && expiresAt && currentTime > expiresAt;

  if (isExpired) return { label: '종료됨', className: 'text-gray-400' };
  if (room.status === 'playing') return { label: '진행 중', className: 'text-emerald-600 animate-pulse' };
  if (room.status === 'waiting') return { label: '입장 가능', className: 'text-teal-600 animate-pulse' };
  return { label: room.status || '대기', className: 'text-gray-400' };
}

function formatRoomMeta(room) {
  const modeLabel = room.mode === 'ko' ? '한글' : room.mode === 'en' ? '영어' : '혼합';
  const durationLabel = `${Math.floor((room.duration || 300) / 60)}분`;
  return `${modeLabel} · ${durationLabel}`;
}

function formatRoomCreatedAt(value) {
  const millis = toMillis(value);
  if (!millis) return '생성 시간 준비 중';

  const date = new Date(millis);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시`;
}

function RoomChoice({
  room,
  currentTime,
  viewingRoomId,
  setViewingRoomId,
  handleDeleteRoom,
  showRoomCode = false,
}) {
  const status = getRoomStatusLabel(room, currentTime);

  return (
    <div
      onClick={() => setViewingRoomId(room.id)}
      className={`p-3 rounded-xl cursor-pointer transition-all border flex flex-col gap-1 ${
        viewingRoomId === room.id
          ? 'bg-pink-50 border-pink-300 text-pink-700'
          : 'bg-white border-gray-100 hover:bg-pink-50 text-gray-600'
      }`}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <div className="font-black truncate">{room.name}</div>
          <div className="text-[11px] font-black text-teal-600 mt-0.5">
            {formatRoomCreatedAt(room.createdAt)}
          </div>
          <div className="text-[11px] font-bold text-gray-400 mt-1">
            {formatRoomMeta(room)}
            {showRoomCode && room.roomCode && (
              <span className="text-blue-500 font-black ml-2 bg-blue-50 px-2 py-1 rounded">코드: {room.roomCode}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleDeleteRoom(room.id, room.name);
          }}
          className="text-red-300 hover:text-red-500 px-2 text-lg transition-colors"
          title="방 삭제"
        >
          ×
        </button>
      </div>
      <div className={`text-[11px] font-black ${status.className}`}>{status.label}</div>
    </div>
  );
}

export default function RoomManagementPanel({
  handleCreateRoom = () => {},
  newRoomName = '',
  setNewRoomName = () => {},
  roomMode = 'ko',
  setRoomMode = () => {},
  roomDuration = '300',
  setRoomDuration = () => {},
  classes = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  classRooms = [],
  guestRooms = [],
  currentTime = Date.now(),
  viewingRoomId = '',
  setViewingRoomId = () => {},
  handleDeleteRoom = () => {},
}) {
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);

  return (
    <div className="glass-box p-6 rounded-3xl col-span-1 h-fit space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">📊 점수판 선택</h2>
        <p className="text-xs text-gray-400 font-bold">학급을 고르고, 그 학급에서 진행한 게임을 선택하세요.</p>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-black text-teal-800">1. 학급 선택</div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
          {classes.map((classItem) => (
            <button
              key={classItem.id}
              type="button"
              onClick={() => {
                setSelectedClassId(classItem.id);
                setViewingRoomId('');
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                selectedClassId === classItem.id
                  ? 'bg-pink-50 border-pink-300 text-pink-700'
                  : 'bg-white border-gray-100 hover:bg-pink-50 text-gray-600'
              }`}
            >
              <div className="font-black">{classItem.name || `${classItem.grade || 1}학년 ${classItem.classNumber || ''}반`}</div>
            </button>
          ))}
          {classes.length === 0 && (
            <div className="text-center text-gray-400 py-6 bg-white rounded-2xl border border-pink-100 font-bold">
              등록된 학급이 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-black text-teal-800">2. 학급 게임 선택</div>
          {selectedClass && <div className="text-xs font-bold text-gray-400">{selectedClass.name}</div>}
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
          {selectedClass && classRooms.map((room) => (
            <RoomChoice
              key={room.id}
              room={room}
              currentTime={currentTime}
              viewingRoomId={viewingRoomId}
              setViewingRoomId={setViewingRoomId}
              handleDeleteRoom={handleDeleteRoom}
            />
          ))}
          {selectedClass && classRooms.length === 0 && (
            <div className="text-center text-gray-400 py-6 bg-white rounded-2xl border border-pink-100 font-bold">
              이 학급에서 진행한 게임이 없습니다.
            </div>
          )}
          {!selectedClass && (
            <div className="text-center text-gray-400 py-6 bg-white rounded-2xl border border-pink-100 font-bold">
              먼저 학급을 선택하세요.
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-pink-100 pt-6 space-y-4">
        <div>
          <h3 className="text-sm font-black text-gray-700">게스트 PIN 게임</h3>
          <p className="text-xs text-gray-400 font-bold mt-1">등록하지 않은 반은 기존 PIN 방식으로 사용할 수 있습니다.</p>
        </div>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <input
            type="text"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="예: 1학년 3반 게스트"
            className="w-full px-4 py-3 border border-pink-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-400"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select value={roomMode} onChange={(e) => setRoomMode(e.target.value)} className="w-full px-3 py-3 border border-pink-200 rounded-xl outline-none bg-white font-medium text-gray-700">
              <option value="ko">한글 전용</option>
              <option value="en">영어 전용</option>
              <option value="mixed">한영 혼합</option>
            </select>
            <select value={roomDuration} onChange={(e) => setRoomDuration(e.target.value)} className="w-full px-3 py-3 border border-pink-200 rounded-xl outline-none bg-white">
              <option value="60">1분</option>
              <option value="120">2분</option>
              <option value="180">3분</option>
              <option value="240">4분</option>
              <option value="300">5분</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 py-3 rounded-xl font-bold text-white shadow-md">
            게스트 PIN 방 만들기
          </button>
        </form>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
          {guestRooms.map((room) => (
            <RoomChoice
              key={room.id}
              room={room}
              currentTime={currentTime}
              viewingRoomId={viewingRoomId}
              setViewingRoomId={setViewingRoomId}
              handleDeleteRoom={handleDeleteRoom}
              showRoomCode
            />
          ))}
          {guestRooms.length === 0 && (
            <div className="text-center text-gray-400 py-6 bg-white rounded-2xl border border-pink-100 font-bold">
              게스트 PIN 방이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

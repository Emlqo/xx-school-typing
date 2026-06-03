import RoomList from './RoomList.jsx';

export default function RoomManagementPanel({
  handleCreateRoom = () => {},
  newRoomName = '',
  setNewRoomName = () => {},
  roomMode = 'ko',
  setRoomMode = () => {},
  roomDuration = '300',
  setRoomDuration = () => {},
  rooms = [],
  currentTime = Date.now(),
  viewingRoomId = '',
  setViewingRoomId = () => {},
  handleDeleteRoom = () => {},
}) {
  return (
    <div className="glass-box p-6 rounded-3xl col-span-1 h-fit">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📝 학급(반) 관리</h2>
      <form onSubmit={handleCreateRoom} className="space-y-4 mb-6 border-b border-pink-100 pb-6">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="예: 1학년 3반"
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
        <button type="submit" className="w-full bg-pink-500 hover:bg-pink-600 py-3 rounded-xl font-bold text-white shadow-md">반 만들기</button>
      </form>

      <RoomList
        rooms={rooms}
        currentTime={currentTime}
        viewingRoomId={viewingRoomId}
        setViewingRoomId={setViewingRoomId}
        handleDeleteRoom={handleDeleteRoom}
      />
    </div>
  );
}

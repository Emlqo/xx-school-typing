export default function ClassManagementPanel({
  classes = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  classGrade = '1',
  setClassGrade = () => {},
  classNumber = '1',
  setClassNumber = () => {},
  classRoomMode = 'ko',
  setClassRoomMode = () => {},
  classRoomDuration = '300',
  setClassRoomDuration = () => {},
  handleCreateClass = () => {},
  handleDeleteClass = () => {},
  openClassRoom = () => {},
  classRooms = [],
  selectedClassRoomId = '',
  selectClassRoomSession = () => {},
  deleteClassRoomSession = () => {},
  classEntryCount = 0,
}) {
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);

  return (
    <div className="glass-box p-6 rounded-3xl border border-sky-100">
      <h2 className="text-lg font-bold text-sky-800 mb-4 flex items-center gap-2">🏫 상설 학급 관리</h2>
      <form onSubmit={handleCreateClass} className="space-y-4 mb-6 border-b border-sky-100 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <select
            value={classGrade}
            onChange={(event) => setClassGrade(event.target.value)}
            className="w-full px-3 py-3 border border-sky-200 rounded-xl outline-none bg-white font-bold text-gray-700"
          >
            <option value="1">1학년</option>
          </select>
          <select
            value={classNumber}
            onChange={(event) => setClassNumber(event.target.value)}
            className="w-full px-3 py-3 border border-sky-200 rounded-xl outline-none bg-white font-bold text-gray-700"
          >
            {Array.from({ length: 11 }, (_, index) => String(index + 1)).map((number) => (
              <option key={number} value={number}>{number}반</option>
            ))}
          </select>
        </div>
        <button type="submit" className="w-full bg-sky-500 hover:bg-sky-600 py-3 rounded-xl font-bold text-white shadow-md transition-colors">
          학급 만들기
        </button>
      </form>

      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2 mb-6">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            onClick={() => setSelectedClassId(classItem.id)}
            className={`p-3 rounded-xl cursor-pointer transition-all border flex justify-between items-center ${selectedClassId === classItem.id ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-white border-gray-100 hover:bg-sky-50 text-gray-600'}`}
          >
            <div>
              <div className="font-black">{classItem.name || `${classItem.grade || 1}학년 ${classItem.classNumber || ''}반`}</div>
              <div className="text-xs text-gray-400 font-bold mt-1">
                입장 {selectedClassId === classItem.id ? classEntryCount : 0}명
              </div>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteClass(classItem.id, classItem.name);
              }}
              className="text-red-300 hover:text-red-500 px-2 text-lg transition-colors"
              title="학급 삭제"
            >
              ✖
            </button>
          </div>
        ))}
        {classes.length === 0 && (
          <div className="text-center text-gray-400 py-8 bg-white rounded-2xl border border-sky-100">
            생성된 학급이 없습니다.
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-sky-100 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-gray-400 font-bold">선택 학급</div>
            <div className="font-black text-sky-800">{selectedClass?.name || '학급을 선택하세요'}</div>
          </div>
          <div className="text-xs font-bold px-3 py-1 rounded-full bg-pink-50 text-pink-600">
            입장 {classEntryCount}명
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={classRoomMode}
            onChange={(event) => setClassRoomMode(event.target.value)}
            className="w-full px-3 py-3 border border-sky-200 rounded-xl outline-none bg-white font-medium text-gray-700"
          >
            <option value="ko">한글 전용</option>
            <option value="en">영어 전용</option>
            <option value="mixed">한영 혼합</option>
          </select>
          <select
            value={classRoomDuration}
            onChange={(event) => setClassRoomDuration(event.target.value)}
            className="w-full px-3 py-3 border border-sky-200 rounded-xl outline-none bg-white"
          >
            <option value="60">1분</option>
            <option value="120">2분</option>
            <option value="180">3분</option>
            <option value="240">4분</option>
            <option value="300">5분</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => openClassRoom(selectedClass)}
          disabled={!selectedClass}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed py-3 rounded-xl font-bold text-white shadow-md transition-colors"
        >
          선택한 학급 방 열기
        </button>
        <div className="space-y-2 pt-2">
          {classRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => selectClassRoomSession(room.id)}
              className={`flex items-center justify-between gap-3 border rounded-xl px-3 py-2 cursor-pointer transition-colors ${selectedClassRoomId === room.id ? 'bg-pink-50 border-pink-300' : 'bg-sky-50 border-sky-100 hover:border-sky-300'}`}
            >
              <div className="min-w-0">
                <div className="text-sm font-black text-sky-800 truncate">{room.name}</div>
                <div className="text-xs font-bold text-gray-400">
                  {room.status === 'playing' ? '진행 중' : '입장 가능'} · {room.duration || 300}초
                </div>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteClassRoomSession(room.id, room.name);
                }}
                className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg shrink-0"
              >
                닫기
              </button>
            </div>
          ))}
          {selectedClass && classRooms.length === 0 && (
            <div className="text-xs text-center text-gray-400 bg-gray-50 border border-gray-100 rounded-xl py-3 font-bold">
              아직 열린 학급 방이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

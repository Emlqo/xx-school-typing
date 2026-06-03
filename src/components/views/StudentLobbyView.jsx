import { useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function StudentLobbyView({
  nickname = '',
  setNickname = () => {},
  roomCodeInput = '',
  setRoomCodeInput = () => {},
  openClassRooms = [],
  selectedOpenClassRoomId = '',
  setSelectedOpenClassRoomId = () => {},
  classStudents = [],
  enteredStudentIds = [],
  onJoinClassStudent = () => {},
  onBack = () => {},
  onJoinRoom = () => {},
  onPracticeStart = () => {},
}) {
  const [activeTab, setActiveTab] = useState('class');
  const selectedRoom = openClassRooms.find((room) => room.id === selectedOpenClassRoomId);

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <div className="glass-box rounded-3xl p-6 md:p-10 max-w-5xl w-full z-10 relative shadow-xl">
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 font-medium">← 뒤로</button>
        <div className="text-center mb-8 mt-4">
          <div className="text-5xl mb-2 animate-bounce">🎒</div>
          <h1 className="text-2xl font-bold text-gray-800">선수 입장</h1>
          <p className="text-gray-500 text-sm mt-1">학급을 선택하거나 게스트 코드로 입장하세요.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/70 border border-pink-100 rounded-2xl p-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={`py-3 rounded-xl font-black transition-colors ${activeTab === 'class' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-pink-50'}`}
          >
            학급 입장
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guest')}
            className={`py-3 rounded-xl font-black transition-colors ${activeTab === 'guest' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-pink-50'}`}
          >
            게스트 입장
          </button>
        </div>

        {activeTab === 'class' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
            <div className="bg-white rounded-2xl border border-pink-100 p-4">
              <div className="text-sm font-black text-gray-700 mb-3">열린 학급</div>
              <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                {openClassRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedOpenClassRoomId(room.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedOpenClassRoomId === room.id ? 'bg-pink-50 border-pink-300 text-pink-700' : 'border-gray-100 hover:bg-pink-50 text-gray-600'}`}
                  >
                    <div className="font-black">{room.className || room.name}</div>
                    <div className="text-xs font-bold text-gray-400 mt-1">
                      {room.status === 'playing' ? '진행 중' : '입장 가능'} · {room.duration || 300}초
                    </div>
                  </button>
                ))}
                {openClassRooms.length === 0 && (
                  <div className="text-center text-gray-400 py-10 bg-pink-50/50 rounded-xl border border-pink-100 font-bold">
                    선생님이 연 학급 방이 없습니다.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-pink-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-black text-gray-700">내 이름 선택</div>
                  <div className="text-xs font-bold text-gray-400 mt-1">
                    {selectedRoom ? `${selectedRoom.className || selectedRoom.name} 명단` : '먼저 학급을 선택하세요'}
                  </div>
                </div>
                {selectedRoom && (
                  <span className="text-xs px-3 py-1 rounded-full bg-pink-50 text-pink-600 font-black">
                    입장 {enteredStudentIds.length}명
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                {classStudents.map((student) => {
                  const entered = enteredStudentIds.includes(student.id);
                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => onJoinClassStudent(student)}
                      className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${entered ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-100 hover:border-pink-300 text-gray-700'}`}
                    >
                      <div className="font-black truncate">{student.name}</div>
                      <div className={`text-xs font-bold mt-2 ${entered ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {entered ? '입장함 · 다시 입장 가능' : '클릭해서 입장'}
                      </div>
                    </button>
                  );
                })}
                {selectedRoom && classStudents.length === 0 && (
                  <div className="col-span-full text-center text-gray-400 py-12 bg-pink-50/50 rounded-xl border border-pink-100 font-bold">
                    등록된 학생 명단이 없습니다.
                  </div>
                )}
                {!selectedRoom && (
                  <div className="col-span-full text-center text-gray-400 py-12 bg-pink-50/50 rounded-xl border border-pink-100 font-bold">
                    왼쪽에서 학급을 선택하면 학생 명단이 표시됩니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">내 닉네임 (이름)</label>
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-4 py-4 bg-white border border-pink-200 outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 rounded-2xl"
                maxLength="10"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">입장 코드 (4자리 숫자)</label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(event) => setRoomCodeInput(event.target.value.replace(/[^0-9]/g, ''))}
                placeholder="예: 1234"
                className="w-full px-4 py-4 bg-white border border-pink-200 outline-none focus:ring-2 focus:ring-pink-400 text-gray-800 rounded-2xl text-center text-2xl tracking-[0.5em] font-black"
                maxLength="4"
              />
            </div>

            <button onClick={onJoinRoom} disabled={!nickname || roomCodeInput.length !== 4} className="w-full py-4 mt-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-lg shadow-md transition-colors">
              게스트 게임 입장하기
            </button>

            <button onClick={onPracticeStart} disabled={!nickname} className="w-full py-4 bg-white border-2 border-pink-300 text-pink-600 hover:bg-pink-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 rounded-2xl font-bold text-lg shadow-sm transition-colors">
              자유 연습하기 (기록 미저장)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

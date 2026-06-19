import { useEffect, useMemo, useRef, useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { COSMETIC_ITEMS } from '../../constants/cosmetics.js';
import { safeToLocaleNumber } from '../../utils/format.js';

function StudentShopPanel({
  student = null,
  isVerified = false,
  pinInput = '',
  setPinInput = () => {},
  newPin = '',
  setNewPin = () => {},
  newPinConfirm = '',
  setNewPinConfirm = () => {},
  pinError = '',
  onVerifyPin = () => {},
  onSetInitialPin = () => {},
  onJoinClassStudent = () => {},
  onBuyCosmetic = () => {},
  onEquipCosmetic = () => {},
  shopItems = [],
  onBuyStockItem = () => {},
}) {
  if (!student) {
    return (
      <div className="bg-white rounded-2xl border border-pink-100 p-5 text-center text-gray-400 font-bold">
        이름을 선택하면 내 포인트와 상점이 표시됩니다.
      </div>
    );
  }

  const ownedCosmetics = Array.isArray(student.ownedCosmetics) ? student.ownedCosmetics : [];
  const hasStudentPin = Boolean(student.hasPin || student.studentPin);

  return (
    <div className="bg-white rounded-2xl border border-cyan-100 p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black text-teal-600 tracking-widest">내 상점</div>
          <div className="text-2xl font-black text-gray-800">{student.name}</div>
          <div className="text-xs text-gray-400 font-bold mt-1">최고 기록 {safeToLocaleNumber(student.bestScore || 0)}점</div>
        </div>
        <div className="text-right bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
          <div className="text-xs font-black text-emerald-600">보유 포인트</div>
          <div className="text-3xl font-black text-emerald-700">
            {isVerified ? `${safeToLocaleNumber(student.totalPoints || 0)}P` : 'LOCK'}
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${isVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-cyan-50/70 border-cyan-100'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="text-xs font-black text-teal-600 tracking-widest">개인 PIN 인증</div>
            <div className={`text-sm font-black ${isVerified ? 'text-emerald-700' : 'text-gray-700'}`}>
              {isVerified ? '인증 완료' : hasStudentPin ? '선생님이 알려준 개인 PIN을 입력하세요.' : '새 개인 PIN을 직접 설정하세요.'}
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-black ${isVerified ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 border border-cyan-100'}`}>
            {isVerified ? 'OK' : 'LOCK'}
          </span>
        </div>

        {hasStudentPin && !isVerified && (
          <form onSubmit={onVerifyPin} className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={(event) => setPinInput(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="4자리"
              className="min-w-0 flex-1 px-4 py-3 bg-white border border-cyan-100 outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 rounded-xl text-center text-lg tracking-[0.35em] font-black"
              maxLength="4"
            />
            <button
              type="submit"
              disabled={pinInput.length !== 4}
              className="px-4 py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-black transition-colors"
            >
              확인
            </button>
          </form>
        )}

        {!hasStudentPin && !isVerified && (
          <form onSubmit={onSetInitialPin} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(event) => setNewPin(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="새 PIN"
                className="w-full px-4 py-3 bg-white border border-cyan-100 outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 rounded-xl text-center text-lg tracking-[0.35em] font-black"
                maxLength="4"
              />
              <input
                type="password"
                inputMode="numeric"
                value={newPinConfirm}
                onChange={(event) => setNewPinConfirm(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="PIN 확인"
                className="w-full px-4 py-3 bg-white border border-cyan-100 outline-none focus:ring-2 focus:ring-teal-400 text-gray-800 rounded-xl text-center text-lg tracking-[0.35em] font-black"
                maxLength="4"
              />
            </div>
            <button
              type="submit"
              disabled={newPin.length !== 4 || newPinConfirm.length !== 4}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-black transition-colors"
            >
              개인 PIN 설정
            </button>
          </form>
        )}

        {pinError && <div className="text-xs text-red-500 font-bold mt-2">{pinError}</div>}
      </div>

      <button
        type="button"
        onClick={() => onJoinClassStudent(student)}
        disabled={!isVerified}
        className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg shadow-md transition-colors"
      >
        이 이름으로 입장하기
      </button>

      <details className="group rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <div className="text-sm font-black text-gray-700">장식 아이템</div>
          <div className="text-xs font-bold text-teal-600 group-open:hidden">상점 열기</div>
          <div className="hidden text-xs font-bold text-teal-600 group-open:block">상점 닫기</div>
        </summary>
        <div className="text-xs font-bold text-gray-400 mt-2">클릭 시 포인트가 반영됩니다</div>

        <div className="mt-4">
          <div className="text-sm font-black text-amber-700 mb-2">반별 한정 상품</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shopItems.filter((item) => item.itemType !== 'cosmetic' && item.active !== false).map((item) => {
              const stock = Math.max(0, Number(item.stock || 0));
              const canAfford = Number(student.totalPoints || 0) >= Number(item.price || 0);
              const soldOut = stock <= 0;

              return (
                <div key={item.id} className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-gray-800 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500 font-bold mt-1">{item.description || '한정 상품'}</div>
                    </div>
                    <div className="text-sm font-black text-amber-700">{safeToLocaleNumber(item.price || 0)}P</div>
                  </div>
                  <div className={`text-xs font-black mt-3 ${soldOut ? 'text-red-500' : 'text-amber-600'}`}>
                    {soldOut ? '품절' : `남은 수량 ${stock}개`}
                  </div>
                  <button
                    type="button"
                    onClick={() => onBuyStockItem(student, item)}
                    disabled={!isVerified || soldOut || !canAfford}
                    className="w-full mt-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-amber-950 font-black"
                  >
                    {soldOut ? '품절' : canAfford ? '즉시 구매' : '포인트 부족'}
                  </button>
                </div>
              );
            })}
            {shopItems.filter((item) => item.itemType !== 'cosmetic' && item.active !== false).length === 0 && (
              <div className="md:col-span-2 text-center text-gray-400 py-6 rounded-xl border border-dashed border-amber-200 font-bold">
                현재 판매 중인 한정 상품이 없습니다.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-cyan-100 mt-5 pt-4">
          <div className="text-sm font-black text-gray-700 mb-3">장식 아이템</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {COSMETIC_ITEMS.map((item) => {
            const owned = ownedCosmetics.includes(item.id);
            const equipped = student.equippedCosmetic === item.id;
            const shopItem = shopItems.find(
              (candidate) => candidate.itemType === 'cosmetic' && candidate.cosmeticId === item.id,
            );
            const price = Number(shopItem?.price ?? item.price);
            const stock = Math.max(0, Number(shopItem?.stock || 0));
            const isConfigured = Boolean(shopItem?.id);
            const isAvailable = isConfigured && shopItem.active !== false && stock > 0;
            const canAfford = Number(student.totalPoints || 0) >= price;

            return (
              <div key={item.id} className={`rounded-2xl border p-4 ${item.previewClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black text-gray-800 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1 leading-relaxed">{item.description}</div>
                  </div>
                  <div className="text-sm font-black text-emerald-700 bg-white/80 border border-white rounded-xl px-2 py-1 shrink-0">
                    {price}P
                  </div>
                </div>
                {!owned && (
                  <div className={`text-xs font-black mt-3 ${isAvailable ? 'text-cyan-700' : 'text-red-500'}`}>
                    {!isConfigured ? '판매 준비 중' : stock > 0 ? `남은 수량 ${stock}개` : '품절'}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  {owned ? (
                    <button
                      type="button"
                      onClick={() => onEquipCosmetic(student, item.id)}
                      disabled={equipped || !isVerified}
                      className={`flex-1 py-2 rounded-xl font-black text-sm ${
                        equipped
                          ? 'bg-emerald-500 text-white'
                          : !isVerified
                            ? 'bg-gray-200/80 text-gray-400'
                          : 'bg-white/80 text-gray-600 hover:bg-white border border-white'
                      }`}
                    >
                      {equipped ? '장착 중' : '장착하기'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onBuyCosmetic(student, item.id, shopItem)}
                      disabled={!isVerified || !canAfford || !isAvailable}
                      className={`flex-1 py-2 rounded-xl font-black text-sm ${
                        isVerified && canAfford && isAvailable
                          ? 'bg-white/80 text-teal-700 hover:bg-white border border-white'
                          : 'bg-gray-200/80 text-gray-400'
                      }`}
                    >
                      {!isAvailable ? (stock <= 0 && isConfigured ? '품절' : '판매 준비 중') : canAfford ? '구매' : '포인트 부족'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </details>
    </div>
  );
}

export default function StudentLobbyView({
  nickname = '',
  setNickname = () => {},
  roomCodeInput = '',
  setRoomCodeInput = () => {},
  openClassRooms = [],
  selectedOpenClassRoomId = '',
  setSelectedOpenClassRoomId = () => {},
  classStudents = [],
  shopItems = [],
  enteredStudentIds = [],
  onJoinClassStudent = () => {},
  onBuyCosmetic = () => {},
  onEquipCosmetic = () => {},
  onBuyStockItem = () => {},
  onSetStudentPin = async () => false,
  onVerifyStudentPin = async () => false,
  onBack = () => {},
  onJoinRoom = () => {},
  onPracticeStart = () => {},
  initialTab = 'class',
  guestOnly = false,
}) {
  const [activeTab, setActiveTab] = useState(guestOnly ? 'guest' : initialTab);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifiedStudentId, setVerifiedStudentId] = useState('');
  const [verifiedProfile, setVerifiedProfile] = useState(null);
  const previousStudentPinRef = useRef({ studentId: '', pin: '' });
  const selectedRoom = openClassRooms.find((room) => room.id === selectedOpenClassRoomId);
  const selectedStudent = useMemo(
    () => classStudents.find((student) => student.id === selectedStudentId) || null,
    [classStudents, selectedStudentId],
  );
  const isSelectedStudentVerified = Boolean(selectedStudent && verifiedStudentId === selectedStudent.id);
  const effectiveStudent = isSelectedStudentVerified && verifiedProfile
    ? { ...selectedStudent, ...verifiedProfile }
    : selectedStudent;

  const resetPinAuth = () => {
    setPinInput('');
    setNewPin('');
    setNewPinConfirm('');
    setPinError('');
    setVerifiedStudentId('');
    setVerifiedProfile(null);
  };

  useEffect(() => {
    if (!selectedStudent) {
      previousStudentPinRef.current = { studentId: '', pin: '' };
      return;
    }

    const nextPin = selectedStudent.hasPin || selectedStudent.studentPin ? 'set' : '';
    const previousPinState = previousStudentPinRef.current;

    if (
      previousPinState.studentId === selectedStudent.id
      && previousPinState.pin
      && previousPinState.pin !== nextPin
    ) {
      resetPinAuth();
    }

    previousStudentPinRef.current = {
      studentId: selectedStudent.id,
      pin: nextPin,
    };
  }, [selectedStudent]);

  const selectRoom = (roomId) => {
    setSelectedOpenClassRoomId(roomId);
    setSelectedStudentId('');
    resetPinAuth();
  };

  const selectStudent = (studentId) => {
    if (studentId !== selectedStudentId) {
      resetPinAuth();
    }
    setSelectedStudentId(studentId);
  };

  const changeTab = (nextTab) => {
    setActiveTab(nextTab);
    if (nextTab === 'guest') {
      setSelectedStudentId('');
      resetPinAuth();
    }
  };

  const handleVerifyPin = async (event) => {
    event.preventDefault();

    if (!selectedStudent) return;
    if (!selectedStudent.hasPin && !selectedStudent.studentPin) {
      setPinError('선생님에게 PIN 발급을 요청하세요.');
      return;
    }

    try {
      const result = await onVerifyStudentPin(selectedStudent.id, pinInput.trim());
      if (!result?.profile) throw new Error('INVALID_PROFILE');
      setVerifiedProfile(result.profile);
      setVerifiedStudentId(selectedStudent.id);
      setPinError('');
      return;
    } catch (error) {
      console.error(error);
    }

    setVerifiedStudentId('');
    setPinError('개인 PIN이 일치하지 않습니다.');
  };

  const handleSetInitialPin = async (event) => {
    event.preventDefault();

    if (!selectedStudent?.id) return;
    if (selectedStudent.hasPin || selectedStudent.studentPin) {
      setPinError('이미 PIN이 설정된 학생입니다.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('새 PIN은 숫자 4자리로 입력하세요.');
      return;
    }
    if (newPin !== newPinConfirm) {
      setPinError('새 PIN과 확인 PIN이 일치하지 않습니다.');
      return;
    }

    const saved = await onSetStudentPin(selectedStudent.id, newPin);

    if (saved === false) {
      setPinError('PIN 저장 중 오류가 발생했습니다. 다시 시도하세요.');
      return;
    }

    setVerifiedProfile(saved.profile || { ...selectedStudent, hasPin: true });
    setVerifiedStudentId(selectedStudent.id);
    setPinInput(newPin);
    setNewPin('');
    setNewPinConfirm('');
    setPinError('');
  };

  const requireVerifiedStudent = (student) => {
    if (!student?.id || verifiedStudentId !== student.id) {
      setPinError('개인 PIN 인증을 먼저 완료하세요.');
      return false;
    }

    return true;
  };

  const handleVerifiedJoinClassStudent = (student) => {
    if (!requireVerifiedStudent(student)) return;
    onJoinClassStudent(effectiveStudent);
  };

  const handleVerifiedBuyCosmetic = async (student, cosmeticId, shopItem) => {
    if (!requireVerifiedStudent(student)) return;
    const result = await onBuyCosmetic(effectiveStudent, cosmeticId, shopItem);
    if (result?.profile) setVerifiedProfile(result.profile);
  };

  const handleVerifiedEquipCosmetic = async (student, cosmeticId) => {
    if (!requireVerifiedStudent(student)) return;
    const result = await onEquipCosmetic(effectiveStudent, cosmeticId);
    if (result?.profile) setVerifiedProfile(result.profile);
  };

  const handleVerifiedBuyStockItem = async (student, item) => {
    if (!requireVerifiedStudent(student)) return;
    const result = await onBuyStockItem(effectiveStudent, item);
    if (result?.profile) setVerifiedProfile(result.profile);
  };

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <div className="glass-box rounded-3xl p-6 md:p-10 max-w-6xl w-full z-10 relative shadow-xl">
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 font-medium">← 뒤로</button>
        <div className="text-center mb-8 mt-4">
          <div className="text-5xl mb-2 animate-bounce">🎮</div>
          <h1 className="text-2xl font-bold text-gray-800">선수 입장</h1>
          <p className="text-gray-500 text-sm mt-1">학급을 선택하거나 게스트 코드로 입장하세요.</p>
        </div>

        {!guestOnly && <div className="grid grid-cols-2 gap-2 bg-white/70 border border-pink-100 rounded-2xl p-2 mb-6">
          <button
            type="button"
            onClick={() => changeTab('class')}
            className={`py-3 rounded-xl font-black transition-colors ${activeTab === 'class' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-pink-50'}`}
          >
            학급 입장
          </button>
          <button
            type="button"
            onClick={() => changeTab('guest')}
            className={`py-3 rounded-xl font-black transition-colors ${activeTab === 'guest' ? 'bg-pink-500 text-white shadow-md' : 'text-gray-500 hover:bg-pink-50'}`}
          >
            게스트 입장
          </button>
        </div>}

        {!guestOnly && activeTab === 'class' && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              ['1', '학급 선택', Boolean(selectedRoom)],
              ['2', '이름 선택', Boolean(selectedStudent)],
              ['3', 'PIN 인증', isSelectedStudentVerified],
            ].map(([step, label, done]) => (
              <div
                key={step}
                className={`rounded-2xl border px-3 py-3 text-center ${
                  done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white/80 border-cyan-100 text-gray-400'
                }`}
              >
                <div className="text-xs font-black">{step}</div>
                <div className="text-sm font-black truncate">{label}</div>
              </div>
            ))}
          </div>
        )}

        {!guestOnly && activeTab === 'class' ? (
          <div className="space-y-5">
            <div className={`${selectedRoom ? 'hidden' : ''} bg-white rounded-2xl border border-pink-100 p-5`}>
              <div className="text-sm font-black text-gray-700 mb-3">열린 학급</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                {openClassRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => selectRoom(room.id)}
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

            <div className={`${selectedRoom ? 'grid' : 'hidden'} grid-cols-1 gap-5`}>
              <div className={`${selectedStudent ? 'hidden' : ''} bg-white rounded-2xl border border-pink-100 p-5`}>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <div className="text-sm font-black text-gray-700">내 이름 선택</div>
                    <div className="text-xs font-bold text-gray-400 mt-1">
                      {selectedRoom ? `${selectedRoom.className || selectedRoom.name} 명단` : '먼저 학급을 선택하세요.'}
                    </div>
                  </div>
                  {selectedRoom && (
                    <span className="text-xs px-3 py-1 rounded-full bg-pink-50 text-pink-600 font-black">
                      입장 {enteredStudentIds.length}명
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => selectRoom('')}
                  className="mb-4 text-xs px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-teal-700 border border-cyan-100 font-black transition-colors"
                >
                  ← 학급 다시 선택
                </button>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                  {classStudents.map((student) => {
                    const entered = enteredStudentIds.includes(student.id);
                    const selected = selectedStudentId === student.id;

                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => selectStudent(student.id)}
                        className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                          selected
                            ? 'bg-pink-50 border-pink-300 text-pink-700 shadow-sm'
                            : entered
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-white border-gray-100 hover:border-pink-300 text-gray-700'
                        }`}
                      >
                        <div className="font-black truncate">{student.name}</div>
                        <div className="text-xs font-bold mt-2 text-gray-400">
                          PIN 인증 후 포인트 확인
                        </div>
                        <div className={`text-xs font-bold mt-1 ${entered ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {entered ? '입장 완료 · 재입장 가능' : '선택해서 상점 보기'}
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

              <div className={`${selectedStudent ? 'block' : 'hidden'} space-y-4`}>
                <button
                  type="button"
                  onClick={() => selectStudent('')}
                  className="text-xs px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-teal-700 border border-cyan-100 font-black transition-colors"
                >
                  ← 이름 다시 선택
                </button>
                <StudentShopPanel
                  student={effectiveStudent}
                  isVerified={isSelectedStudentVerified}
                  pinInput={pinInput}
                  setPinInput={setPinInput}
                  newPin={newPin}
                  setNewPin={setNewPin}
                  newPinConfirm={newPinConfirm}
                  setNewPinConfirm={setNewPinConfirm}
                  pinError={pinError}
                  onVerifyPin={handleVerifyPin}
                  onSetInitialPin={handleSetInitialPin}
                  onJoinClassStudent={handleVerifiedJoinClassStudent}
                  onBuyCosmetic={handleVerifiedBuyCosmetic}
                  onEquipCosmetic={handleVerifiedEquipCosmetic}
                  shopItems={shopItems}
                  onBuyStockItem={handleVerifiedBuyStockItem}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">닉네임(이름)</label>
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

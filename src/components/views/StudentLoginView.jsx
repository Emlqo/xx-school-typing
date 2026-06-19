import { useEffect, useMemo, useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function StudentLoginView({
  classes = [],
  classStudents = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  onVerifyPin = async () => null,
  onSetInitialPin = async () => null,
  onBack = () => {},
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const selectedStudent = useMemo(
    () => classStudents.find((student) => student.id === selectedStudentId) || null,
    [classStudents, selectedStudentId],
  );

  useEffect(() => {
    setSelectedStudentId('');
    setPin('');
    setPinConfirm('');
    setError('');
  }, [selectedClassId]);

  const selectStudent = (studentId) => {
    setSelectedStudentId(studentId);
    setPin('');
    setPinConfirm('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selectedStudent || !/^\d{4}$/.test(pin)) return;
    if (!selectedStudent.hasPin && pin !== pinConfirm) {
      setError('새 PIN과 확인 PIN이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = selectedStudent.hasPin
        ? await onVerifyPin(selectedStudent.id, pin)
        : await onSetInitialPin(selectedStudent.id, pin);
      if (!result?.profile) throw new Error('INVALID_PROFILE');
    } catch (submitError) {
      console.error(submitError);
      setError(submitError?.code === 'api/permission-denied'
        ? '개인 PIN이 일치하지 않습니다.'
        : '로그인할 수 없습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <main className="glass-box rounded-3xl p-6 md:p-9 max-w-4xl w-full z-10 relative shadow-2xl border-2 border-cyan-100">
        <button type="button" onClick={onBack} className="text-sm font-black text-gray-500 hover:text-teal-700 mb-5">← 처음으로</button>
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">🔐</div>
          <h1 className="text-3xl font-black text-gray-800">학생 로그인</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">학급과 내 이름을 선택하고 개인 PIN을 입력하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <section className="bg-white/90 rounded-2xl border border-cyan-100 p-4">
            <h2 className="font-black text-gray-700 mb-3">1. 학급 선택</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {classes.map((classItem) => (
                <button
                  key={classItem.id}
                  type="button"
                  onClick={() => setSelectedClassId(classItem.id)}
                  className={`w-full p-3 rounded-xl border text-left font-black transition-colors ${selectedClassId === classItem.id ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-100 hover:bg-cyan-50 text-gray-600'}`}
                >
                  {classItem.name}
                </button>
              ))}
              {classes.length === 0 && <p className="text-center text-gray-400 font-bold py-8">등록된 학급이 없습니다.</p>}
            </div>
          </section>

          <section className="bg-white/90 rounded-2xl border border-cyan-100 p-4">
            <h2 className="font-black text-gray-700 mb-3">2. 이름 선택</h2>
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {classStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => selectStudent(student.id)}
                  className={`p-3 rounded-xl border text-left font-black truncate transition-colors ${selectedStudentId === student.id ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-100 hover:bg-cyan-50 text-gray-600'}`}
                >
                  {student.name}
                </button>
              ))}
              {selectedClassId && classStudents.length === 0 && <p className="col-span-2 text-center text-gray-400 font-bold py-8">등록된 학생이 없습니다.</p>}
              {!selectedClassId && <p className="col-span-2 text-center text-gray-400 font-bold py-8">학급을 먼저 선택하세요.</p>}
            </div>
          </section>

          <section className="bg-white/90 rounded-2xl border border-cyan-100 p-4">
            <h2 className="font-black text-gray-700 mb-3">3. PIN 인증</h2>
            {!selectedStudent ? (
              <p className="text-center text-gray-400 font-bold py-8">내 이름을 선택하세요.</p>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div className="rounded-xl bg-cyan-50 border border-cyan-100 p-3">
                  <div className="text-xs font-black text-teal-600">선택한 학생</div>
                  <div className="text-xl font-black text-gray-800">{selectedStudent.name}</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">
                    {selectedStudent.hasPin ? '기존 개인 PIN을 입력하세요.' : '처음 사용할 개인 PIN을 설정하세요.'}
                  </div>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder={selectedStudent.hasPin ? '개인 PIN 4자리' : '새 PIN 4자리'}
                  className="w-full px-4 py-3 rounded-xl border border-cyan-100 text-center text-xl tracking-[0.3em] font-black outline-none focus:ring-2 focus:ring-teal-400"
                />
                {!selectedStudent.hasPin && (
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pinConfirm}
                    onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="새 PIN 다시 입력"
                    className="w-full px-4 py-3 rounded-xl border border-cyan-100 text-center text-xl tracking-[0.3em] font-black outline-none focus:ring-2 focus:ring-teal-400"
                  />
                )}
                {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || pin.length !== 4 || (!selectedStudent.hasPin && pinConfirm.length !== 4)}
                  className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-black transition-colors"
                >
                  {loading ? '확인 중...' : selectedStudent.hasPin ? '로그인' : 'PIN 설정하고 로그인'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

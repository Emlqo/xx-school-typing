import { useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';

export default function StudentLoginView({
  classes = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  onVerifyPin = async () => null,
  onSetInitialPin = async () => null,
  onBack = () => {},
}) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [settingPin, setSettingPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearPin = () => {
    setPin('');
    setPinConfirm('');
    setSettingPin(false);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    const studentName = name.trim();
    if (loading || !selectedClassId || !studentName || !/^\d{4}$/.test(pin)) return;
    if (settingPin && pin !== pinConfirm) {
      setError('새 PIN과 확인 PIN이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = settingPin
        ? await onSetInitialPin(selectedClassId, studentName, pin)
        : await onVerifyPin(selectedClassId, studentName, pin);
      if (!result?.profile) throw new Error('INVALID_PROFILE');
    } catch (submitError) {
      if (submitError?.code === 'api/pin-not-set') {
        setSettingPin(true);
      } else if (submitError?.code === 'api/already-exists') {
        clearPin();
        setError('이미 PIN이 설정됐어요. 기존 PIN으로 로그인하세요.');
      } else {
        setError(submitError?.code === 'api/permission-denied'
          ? '학급과 이름, 개인 PIN을 확인해 주세요.'
          : '로그인할 수 없습니다. 잠시 후 다시 시도하세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4">
      <CherryBlossomBackground />
      <main className="glass-box rounded-3xl p-6 md:p-9 max-w-3xl w-full z-10 relative shadow-2xl border-2 border-cyan-100">
        <button type="button" disabled={loading} onClick={onBack} className="text-sm font-black text-gray-500 hover:text-teal-700 mb-5">← 처음으로</button>
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">🔐</div>
          <h1 className="text-3xl font-black text-gray-800">학생 로그인</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">학급을 고른 뒤 본인 이름과 개인 PIN을 입력하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <section className="bg-white/90 rounded-2xl border border-cyan-100 p-4">
            <h2 className="font-black text-gray-700 mb-3">학급 선택</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
              {classes.map((classItem) => (
                <button
                  key={classItem.id}
                  type="button"
                  aria-pressed={selectedClassId === classItem.id}
                  disabled={loading}
                  onClick={() => {
                    if (selectedClassId === classItem.id) return;
                    setSelectedClassId(classItem.id);
                    clearPin();
                  }}
                  className={`w-full p-3 rounded-xl border text-left font-black transition-colors ${selectedClassId === classItem.id ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-100 hover:bg-cyan-50 text-gray-600'}`}
                >
                  {classItem.name}
                </button>
              ))}
              {classes.length === 0 && <p className="text-center text-gray-400 font-bold py-8">등록된 학급이 없습니다.</p>}
            </div>
          </section>

          <section className="bg-white/90 rounded-2xl border border-cyan-100 p-4">
            <form onSubmit={submit} aria-busy={loading} className="space-y-3">
              <label className="block font-black text-gray-700">
                본인 이름
                <input
                  type="text"
                  autoComplete="username"
                  maxLength={100}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    clearPin();
                  }}
                  disabled={loading}
                  required
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-cyan-100 outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>
              <label className="block font-black text-gray-700">
                {settingPin ? '새 PIN 4자리' : '개인 PIN 4자리'}
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete={settingPin ? 'new-password' : 'current-password'}
                  maxLength={4}
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={loading}
                  required
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-cyan-100 text-center text-xl tracking-[0.3em] font-black outline-none focus:ring-2 focus:ring-teal-400"
                />
              </label>
              {settingPin && (
                <label className="block font-black text-gray-700">
                  처음 사용할 PIN 다시 입력
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    value={pinConfirm}
                    onChange={(event) => setPinConfirm(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    disabled={loading}
                    required
                    className="mt-2 w-full px-4 py-3 rounded-xl border border-cyan-100 text-center text-xl tracking-[0.3em] font-black outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </label>
              )}
              {error && <p role="alert" className="text-xs text-red-500 font-bold">{error}</p>}
              <button
                type="submit"
                disabled={loading || !selectedClassId || !name.trim() || pin.length !== 4 || (settingPin && pinConfirm.length !== 4)}
                className="w-full py-3 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-black transition-colors"
              >
                {loading ? '확인 중...' : settingPin ? 'PIN 설정하고 로그인' : '로그인'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

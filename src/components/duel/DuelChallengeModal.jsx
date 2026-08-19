import { useEffect, useState } from 'react';

function remainingSeconds(challenge) {
  const expiresAt = challenge?.expiresAt?.toMillis?.()
    || Number(challenge?.expiresAt || 0);
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export default function DuelChallengeModal({
  challenge = null,
  isProcessing = false,
  canAccept = true,
  disabledReason = '',
  onAccept = () => {},
  onReject = () => {},
}) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(challenge));

  useEffect(() => {
    setSeconds(remainingSeconds(challenge));
    const timer = window.setInterval(() => setSeconds(remainingSeconds(challenge)), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  if (!challenge || challenge.status !== 'pending' || seconds <= 0) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass-box duel-modal-enter w-full max-w-md rounded-3xl border-2 border-rose-200 p-7 text-center shadow-2xl">
        <div className="text-6xl mb-3">⚔️</div>
        <div className="text-xs font-black tracking-widest text-rose-500">1:1 결투 신청서</div>
        <h2 className="text-3xl font-black text-gray-800 mt-2">{challenge.challengerName}</h2>
        <p className="text-sm font-bold text-gray-500 mt-1">
          {challenge.challengerClassName || '학급 미지정'} 학생이 결투를 신청했습니다.
        </p>

        <div className="grid grid-cols-3 gap-2 my-6">
          <div className="bg-white rounded-2xl p-3 border border-rose-100">
            <div className="text-xs font-bold text-gray-400">시간</div>
            <div className="font-black text-gray-800">3분</div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-rose-100">
            <div className="text-xs font-bold text-gray-400">모드</div>
            <div className="font-black text-gray-800">혼합</div>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-rose-100">
            <div className="text-xs font-bold text-gray-400">승부</div>
            <div className="font-black text-rose-500">5P</div>
          </div>
        </div>

        <div className="text-sm font-black text-rose-500 mb-4">응답까지 {seconds}초</div>
        {!canAccept && disabledReason && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-black text-amber-700">
            {disabledReason}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onReject}
            disabled={isProcessing}
            className="py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-black disabled:opacity-50"
          >
            거절
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={isProcessing || !canAccept}
            className="py-4 bg-gradient-to-r from-rose-500 to-orange-400 text-white rounded-2xl font-black shadow-lg disabled:opacity-50"
          >
            {isProcessing ? '준비 중...' : '수락하고 결투'}
          </button>
        </div>
      </div>
    </div>
  );
}

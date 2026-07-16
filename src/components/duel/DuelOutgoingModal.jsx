import { useEffect, useState } from 'react';

function getRemaining(challenge) {
  const expiresAt = challenge?.expiresAt?.toMillis?.() || Number(challenge?.expiresAt || 0);
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export default function DuelOutgoingModal({ challenge = null, onClose = () => {} }) {
  const [seconds, setSeconds] = useState(() => getRemaining(challenge));

  useEffect(() => {
    setSeconds(getRemaining(challenge));
    const timer = window.setInterval(() => setSeconds(getRemaining(challenge)), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  if (!challenge) return null;
  const pending = challenge.status === 'pending' && seconds > 0;
  const rejected = challenge.status === 'rejected';

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4 z-40">
      <div className="glass-box w-full max-w-sm rounded-3xl border border-cyan-100 p-7 text-center shadow-2xl">
        <div className={`text-6xl mb-3 ${pending ? 'animate-pulse' : ''}`}>{pending ? '📨' : rejected ? '🛡️' : '⌛'}</div>
        <h2 className="text-2xl font-black text-gray-800">
          {pending ? '결투 신청 전달 완료' : rejected ? '결투 신청 거절' : '신청 시간 만료'}
        </h2>
        <p className="text-gray-500 font-bold mt-2">
          {pending
            ? `${challenge.targetName} 학생의 응답을 기다리고 있습니다.`
            : '다음 기회에 다시 도전해 보세요.'}
        </p>
        {pending ? (
          <div className="mt-5 text-3xl font-black text-teal-600">{seconds}초</div>
        ) : (
          <button type="button" onClick={onClose} className="w-full mt-6 py-3 bg-gray-800 text-white rounded-2xl font-black">
            확인
          </button>
        )}
      </div>
    </div>
  );
}

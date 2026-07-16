import { useEffect, useRef, useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { toDuelMillis } from '../../utils/duel.js';

function getCount(startsAt) {
  return Math.max(0, Math.ceil((toDuelMillis(startsAt) - Date.now()) / 1000));
}

export default function DuelCountdownView({ duel = null, studentId = '', onReady = () => {} }) {
  const [count, setCount] = useState(() => getCount(duel?.startsAt));
  const startedRef = useRef(false);
  const isChallenger = duel?.challengerStudentId === studentId;
  const myName = isChallenger ? duel?.challengerName : duel?.targetName;
  const opponentName = isChallenger ? duel?.targetName : duel?.challengerName;

  useEffect(() => {
    const update = () => {
      const nextCount = getCount(duel?.startsAt);
      setCount(nextCount);
      if (nextCount === 0 && !startedRef.current) {
        startedRef.current = true;
        onReady();
      }
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [duel?.startsAt, onReady]);

  return (
    <div className="min-h-screen spring-bg flex items-center justify-center p-4 relative overflow-hidden">
      <CherryBlossomBackground />
      <div className="relative z-10 text-center w-full max-w-2xl">
        <div className="glass-box rounded-3xl border-2 border-rose-200 p-8 md:p-12 shadow-2xl">
          <div className="text-xs font-black tracking-[0.3em] text-rose-500">KEYBOARD DUEL</div>
          <div className="flex items-center justify-center gap-4 md:gap-8 my-8">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-400">나</div>
              <div className="text-2xl md:text-3xl font-black text-teal-600 truncate">{myName}</div>
            </div>
            <div className="text-5xl">⚔️</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-gray-400">상대</div>
              <div className="text-2xl md:text-3xl font-black text-rose-500 truncate">{opponentName}</div>
            </div>
          </div>
          <div key={count} className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-rose-500 to-orange-400 animate-success-pop">
            {count > 0 ? count : '시작!'}
          </div>
          <p className="mt-6 font-bold text-gray-500">5분 혼합 타자 · 동일 단어와 동일 퀴즈 · 승부 포인트 5P</p>
        </div>
      </div>
    </div>
  );
}

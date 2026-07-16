import { safeToLocaleNumber } from '../../utils/format.js';

export default function DuelScoreboard({ myName = '', myScore = 0, opponentName = '', opponentScore = 0 }) {
  const leading = myScore === opponentScore ? 'draw' : myScore > opponentScore ? 'me' : 'opponent';

  return (
    <div className="max-w-3xl w-full mx-auto mb-4 relative z-10">
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 rounded-2xl bg-slate-900/90 border border-white/20 p-2 shadow-xl text-white">
        <div className={`rounded-xl p-3 text-center ${leading === 'me' ? 'bg-teal-500/30 ring-2 ring-teal-300' : 'bg-white/10'}`}>
          <div className="text-xs font-bold text-white/60">나 · {myName}</div>
          <div className="text-2xl font-black text-teal-300">{safeToLocaleNumber(myScore)}</div>
        </div>
        <div className="flex flex-col items-center justify-center px-2">
          <div className="text-2xl">⚔️</div>
          <div className="text-[10px] font-black text-amber-300">LIVE</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${leading === 'opponent' ? 'bg-rose-500/30 ring-2 ring-rose-300' : 'bg-white/10'}`}>
          <div className="text-xs font-bold text-white/60">상대 · {opponentName}</div>
          <div className="text-2xl font-black text-rose-300">{safeToLocaleNumber(opponentScore)}</div>
        </div>
      </div>
    </div>
  );
}

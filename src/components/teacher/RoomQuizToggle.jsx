import { roomQuizzesEnabled } from '../../utils/roomQuizzes.js';

export default function RoomQuizToggle({ mode, enabled = true, onChange = () => {} }) {
  if (!roomQuizzesEnabled({ mode })) return null;
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3 font-bold text-cyan-950">
      <span className="flex items-center gap-3">
        <input type="checkbox" className="h-4 w-4 accent-teal-700" checked={enabled}
          onChange={(event) => onChange(event.target.checked)} />
        경기 중 돌발 퀴즈
      </span>
      <span aria-hidden="true" className={enabled ? 'text-teal-800' : 'text-slate-600'}>{enabled ? 'ON' : 'OFF'}</span>
    </label>
  );
}

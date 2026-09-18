import { LINE_4, subwayRoute } from '../../utils/subway.js';

export default function SubwaySettings({ value, onChange }) {
  return <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
    <label className="block text-xs font-bold text-gray-600">진행 방식
      <select className="mt-1 w-full rounded-lg border border-sky-200 bg-white p-2" value={value.practice || 'copy'} onChange={(e) => onChange({ ...value, practice: e.target.value })}>
        <option value="copy">따라 치기</option><option value="memory">순서 외우기</option><option value="recall">역 이름 많이 맞히기 · 4호선 전체</option>
      </select>
    </label>
    {value.practice === 'memory' && <label className="block text-xs font-bold text-gray-600">암기 시간 (초)
      <input type="number" min="5" max="300" step="1" required className="mt-1 w-full rounded-lg border border-sky-200 bg-white p-2" value={value.previewSeconds ?? 15}
        onChange={(e) => onChange({ ...value, previewSeconds: e.target.value === '' ? '' : Number(e.target.value) })}
        onBlur={() => onChange({ ...value, previewSeconds: Math.min(300, Math.max(5, Math.floor(Number(value.previewSeconds) || 15))) })} />
    </label>}
    <div className="font-black text-sky-700">4호선 · {subwayRoute(value).length}개 정거장</div>
    {value.practice !== 'recall' && <div className="grid grid-cols-2 gap-2">
      {['from', 'to'].map((field) => <label key={field} className="text-xs font-bold text-gray-600">
        {field === 'from' ? '출발' : '도착'}
        <select className="mt-1 w-full rounded-lg border border-sky-200 bg-white p-2" value={value[field]} onChange={(e) => onChange({ ...value, [field]: e.target.value })}>
          {LINE_4.map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>)}
    </div>}
  </div>;
}

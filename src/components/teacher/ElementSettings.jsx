import { DEFAULT_ELEMENT_CONFIG, ELEMENTS } from '../../constants/elements.js';
import { elementRange } from '../../utils/memoryGame.js';

export default function ElementSettings({ value = DEFAULT_ELEMENT_CONFIG, onChange }) {
  const range = elementRange(value);
  return <div className="space-y-3 rounded-lg border border-teal-200 bg-teal-50 p-3">
    <label className="block text-sm font-bold text-teal-900">진행 방식
      <select className="mt-1 w-full rounded-lg border border-teal-200 bg-white p-2" value={value.practice} onChange={event => onChange({ ...value, practice: event.target.value })}>
        <option value="memory">원자번호 순서대로 외우기</option><option value="recall">순서 없이 많이 맞히기</option>
      </select>
    </label>
    <div className="grid grid-cols-2 gap-2">{['fromNumber', 'toNumber'].map(field => <label className="text-sm font-bold text-teal-900" key={field}>{field === 'fromNumber' ? '시작 원자번호' : '끝 원자번호'}
      <select className="mt-1 w-full min-w-0 rounded-lg border border-teal-200 bg-white p-2" value={value[field]} onChange={event => onChange({ ...value, [field]: Number(event.target.value) })}>
        {ELEMENTS.map(item => <option value={item.number} key={item.number}>{item.number}. {item.name}</option>)}
      </select>
    </label>)}</div>
    <p className={`text-sm font-bold ${range.length ? 'text-teal-800' : 'text-rose-700'}`} role="status">{range.length ? `${range[0].number}번 ${range[0].name} ~ ${range.at(-1).number}번 ${range.at(-1).name} · ${range.length}개 원소` : '시작 번호는 끝 번호보다 크지 않아야 합니다.'}</p>
    <label className="block text-sm font-bold text-teal-900">암기 시간 (초)
      <input type="number" min="5" max="300" step="1" required className="mt-1 w-full rounded-lg border border-teal-200 bg-white p-2" value={value.previewSeconds} onChange={event => onChange({ ...value, previewSeconds: event.target.value === '' ? '' : Number(event.target.value) })} />
    </label>
    <p className="text-xs font-bold text-teal-700">한글 이름 입력{value.practice === 'memory' ? ' · 힌트: 원소기호 → 정답 이름' : ' · 중복 없이 도전'}</p>
  </div>;
}

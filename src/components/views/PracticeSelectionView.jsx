import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { SubwayTrain } from './SubwayGameView.jsx';

export default function PracticeSelectionView({ nickname, setNickname, onTyping, onSubway, onBack }) {
  return <main className="min-h-screen spring-bg flex items-center justify-center p-4">
    <CherryBlossomBackground />
    <section className="relative z-10 glass-box w-full max-w-3xl rounded-lg p-6 md:p-8">
      <div className="flex justify-between items-center gap-4"><h1 className="text-2xl font-black text-teal-900">자유연습</h1><button onClick={onBack} className="px-4 py-2 rounded-lg border border-teal-200 bg-white font-bold">뒤로</button></div>
      <label className="block mt-5 font-bold text-gray-700">닉네임<input aria-label="연습 닉네임" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={30} className="block w-full mt-2 p-3 rounded-lg border border-teal-200 bg-white" /></label>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <button onClick={onTyping} className="rounded-lg border-2 border-teal-200 bg-white/90 p-6 text-left hover:border-teal-500">
          <div aria-hidden="true" className="grid grid-cols-3 gap-2 max-w-48 mb-6">{['가','나','다','A','B','C'].map(letter => <span key={letter} className="text-center py-3 bg-teal-50 border-b-4 border-teal-200 rounded font-black text-teal-700">{letter}</span>)}</div>
          <h2 className="text-xl font-black text-teal-900">일반 타자연습</h2><p className="mt-2 text-gray-600">5분 · 한글 / 영어 혼합</p>
        </button>
        <button onClick={onSubway} className="rounded-lg border-2 border-sky-200 bg-white/90 p-6 text-left hover:border-sky-500">
          <div className="relative h-28 mb-6 overflow-hidden [&_.metro-train]:!relative [&_.metro-train]:!inset-auto [&_.metro-train]:!w-full [&_.metro-train]:!transform-none"><SubwayTrain /></div>
          <h2 className="text-xl font-black text-sky-800">지하철 외우기</h2><p className="mt-2 text-gray-600">4호선 진접 → 오이도</p><p className="text-sm mt-1 text-gray-500">암기 15초 · 순서 맞히기 2분 · 기록 미저장</p>
        </button>
      </div>
    </section>
  </main>;
}

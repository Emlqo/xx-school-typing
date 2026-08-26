import { useCallback, useEffect, useState } from 'react';
import { listActiveAssessments } from '../../services/studentSecurityApi.js';

export default function StudentAssessmentBoard({ onOpenAssessment = () => {} }) {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await listActiveAssessments();
      setAssessments(result?.assessments || []);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || '형성평가를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <section className="bg-gradient-to-br from-sky-50 via-white to-emerald-50 border-2 border-teal-200 rounded-3xl p-5 shadow-md">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-black text-teal-600 tracking-widest">오늘의 학습</div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">📝 형성평가</h2>
          <p className="text-xs font-bold text-gray-500 mt-1">100점이 될 때까지 다시 도전할 수 있어요.</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isLoading}
          className="px-3 py-2 rounded-xl bg-white border border-cyan-100 text-teal-700 text-xs font-black disabled:opacity-50"
        >
          새로고침
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs font-bold text-red-600 mb-3">{error}</p>}

      <div className="space-y-3">
        {assessments.map((assessment) => (
          <article key={assessment.id} className="bg-white/95 border border-cyan-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-gray-800">{assessment.title}</h3>
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black">{assessment.questionCount}문항</span>
              </div>
              {assessment.description && <p className="text-sm font-bold text-gray-500 mt-1 whitespace-pre-wrap">{assessment.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onOpenAssessment(assessment.id)}
              className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black shadow-md hover:from-teal-600 hover:to-emerald-600 transition-colors"
            >
              참여하기
            </button>
          </article>
        ))}
        {isLoading && <div className="text-center py-6 text-sm font-bold text-gray-400">진행 중인 평가를 확인하고 있어요...</div>}
        {!isLoading && assessments.length === 0 && !error && (
          <div className="text-center py-6 rounded-2xl border border-dashed border-cyan-200 bg-white/60">
            <div className="text-3xl mb-1">🌿</div>
            <p className="text-sm font-bold text-gray-400">현재 진행 중인 형성평가가 없습니다.</p>
          </div>
        )}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import { startAssessment, submitAssessment } from '../../services/studentSecurityApi.js';

export default function AssessmentView({
  assessmentId = '',
  studentProfile = null,
  onHome = () => {},
}) {
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const begin = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setResult(null);
    setAnswers({});
    try {
      const response = await startAssessment(assessmentId);
      if (!response?.assessment) throw new Error('형성평가를 찾을 수 없습니다.');
      setAssessment(response.assessment);
    } catch (startError) {
      console.error(startError);
      setError(startError.message || '형성평가를 시작하지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    begin();
  }, [begin]);

  const answeredCount = Object.keys(answers).length;
  const questions = assessment?.questions || [];
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const incorrectText = useMemo(
    () => result?.incorrectQuestionNumbers?.join(', ') || '',
    [result],
  );

  const submit = async () => {
    if (!allAnswered || isSubmitting) return;
    if (!window.confirm('답안을 제출할까요? 제출 후 점수를 바로 확인할 수 있습니다.')) return;
    setIsSubmitting(true);
    setError('');
    try {
      const submittedAnswers = questions.map((question) => ({
        id: question.id,
        answer: answers[question.id],
      }));
      const response = await submitAssessment(assessmentId, submittedAnswers);
      setResult(response);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || '답안을 제출하지 못했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen spring-bg flex items-center justify-center p-4">
        <CherryBlossomBackground />
        <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full z-10 relative shadow-xl">
          <div className="text-5xl mb-3 animate-bounce">📝</div>
          <p className="font-black text-gray-700">형성평가를 준비하고 있어요...</p>
        </div>
      </div>
    );
  }

  if (!assessment || error) {
    return (
      <div className="min-h-screen spring-bg flex items-center justify-center p-4">
        <CherryBlossomBackground />
        <div className="glass-box rounded-3xl p-8 text-center max-w-md w-full z-10 relative shadow-xl">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="font-black text-red-600 mb-5">{error || '형성평가를 불러오지 못했습니다.'}</p>
          <button type="button" onClick={onHome} className="w-full py-3 rounded-xl bg-teal-500 text-white font-black">학생 홈으로</button>
        </div>
      </div>
    );
  }

  if (result) {
    const perfect = result.score === 100;
    return (
      <div className="min-h-screen spring-bg flex items-center justify-center p-4">
        <CherryBlossomBackground />
        <main className={`glass-box rounded-3xl p-7 md:p-10 max-w-2xl w-full z-10 relative text-center shadow-2xl border-2 ${perfect ? 'border-yellow-300' : 'border-cyan-100'}`}>
          <div className={`text-7xl mb-3 ${perfect ? 'animate-success-pop' : ''}`}>{perfect ? '🏆' : '🌱'}</div>
          <div className="text-xs font-black text-teal-600 tracking-widest">형성평가 결과</div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-800 mt-1">{assessment.title}</h1>
          <div className={`text-7xl font-black my-6 ${perfect ? 'text-amber-500' : 'text-teal-600'}`}>{result.score}점</div>
          <p className="font-black text-gray-600">{result.totalQuestions}문항 중 {result.correctCount}문항을 맞혔습니다.</p>
          {perfect ? (
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-100 border border-yellow-200 p-5">
              <div className="text-xl font-black text-amber-700">완벽해요! 100점 달성!</div>
              <p className="text-sm font-bold text-amber-600 mt-1">꼼꼼하게 다시 확인한 노력이 멋집니다.</p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-cyan-50 border border-cyan-100 p-5">
              <div className="text-sm font-black text-teal-700">다시 생각해 볼 문항</div>
              <div className="text-2xl font-black text-gray-800 mt-1">{incorrectText}번</div>
              <p className="text-xs font-bold text-gray-500 mt-2">정답은 공개되지 않아요. 문제를 천천히 읽고 다시 도전하세요.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <button type="button" onClick={onHome} className="py-3 rounded-xl bg-white border-2 border-cyan-100 text-teal-700 font-black">학생 홈으로</button>
            <button type="button" onClick={begin} className="py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black shadow-md">다시 응시하기</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen spring-bg p-4 md:p-8">
      <CherryBlossomBackground />
      <main className="max-w-4xl mx-auto z-10 relative space-y-5">
        <header className="glass-box rounded-3xl p-5 md:p-7 border-2 border-cyan-100 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black text-teal-600 tracking-widest">{studentProfile?.className} {studentProfile?.name}</div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-800 mt-1">{assessment.title}</h1>
              {assessment.description && <p className="text-sm font-bold text-gray-500 mt-2 whitespace-pre-wrap">{assessment.description}</p>}
            </div>
            <button type="button" onClick={() => { if (window.confirm('평가를 나가면 입력한 답안이 초기화됩니다. 나갈까요?')) onHome(); }} className="px-4 py-2 rounded-xl bg-white border border-cyan-100 text-gray-500 font-black">나가기</button>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs font-black text-gray-500 mb-2"><span>응답 진행률</span><span>{answeredCount} / {questions.length}</span></div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </header>

        {questions.map((question, questionIndex) => (
          <section key={question.id} className="glass-box rounded-3xl p-5 md:p-7 border border-cyan-100 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-black shrink-0">{questionIndex + 1}</div>
              <h2 className="text-lg md:text-xl font-black text-gray-800 leading-relaxed pt-1">{question.text}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              {question.options.map((option, optionIndex) => {
                const selected = answers[question.id] === optionIndex;
                return (
                  <button
                    key={`${question.id}-${optionIndex}`}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                    className={`min-h-14 rounded-2xl border-2 px-4 py-3 text-left font-bold transition-all ${selected ? 'bg-teal-50 border-teal-400 text-teal-800 shadow-md' : 'bg-white/90 border-gray-100 text-gray-700 hover:border-cyan-200 hover:bg-cyan-50'}`}
                  >
                    <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center mr-2 text-sm font-black ${selected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{optionIndex + 1}</span>
                    {option}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {error && <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
        <div className="glass-box rounded-3xl p-5 border border-cyan-100 shadow-xl sticky bottom-4">
          <button type="button" onClick={submit} disabled={!allAnswered || isSubmitting} className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-lg font-black shadow-lg disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none">
            {isSubmitting ? '채점하고 있어요...' : allAnswered ? '답안 제출하기' : `아직 ${questions.length - answeredCount}문항이 남았어요`}
          </button>
        </div>
      </main>
    </div>
  );
}

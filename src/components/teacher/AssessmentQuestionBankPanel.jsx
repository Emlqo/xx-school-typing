import { useMemo, useState } from 'react';
import { ASSESSMENT_LIMITS } from '../../constants/assessments.js';
import { parseBulkAssessmentQuestions } from '../../utils/assessments.js';

function QuestionEditor({ question, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => ({
    ...question,
    options: [...question.options],
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const updateOption = (index, value) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => (
        optionIndex === index ? value : option
      )),
    }));
  };

  const save = async () => {
    setIsSaving(true);
    setError('');
    try {
      await onSave(draft);
    } catch (saveError) {
      setError(saveError.message || '문항을 수정하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        value={draft.text}
        onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
        maxLength={500}
        className="w-full rounded-xl border border-teal-100 px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-teal-400"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {draft.options.map((option, optionIndex) => (
          <label key={`${draft.id}-${optionIndex}`} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${draft.answer === optionIndex ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}>
            <input
              type="radio"
              name={`bank-answer-${draft.id}`}
              checked={draft.answer === optionIndex}
              onChange={() => setDraft((current) => ({ ...current, answer: optionIndex }))}
              className="accent-emerald-500"
            />
            <span className="text-xs font-black text-gray-400">{optionIndex + 1}</span>
            <input
              value={option}
              onChange={(event) => updateOption(optionIndex, event.target.value)}
              maxLength={200}
              className="min-w-0 flex-1 bg-transparent font-bold outline-none"
            />
          </label>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-black text-gray-600">취소</button>
        <button type="button" onClick={save} disabled={isSaving} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">
          {isSaving ? '저장 중...' : '수정 저장'}
        </button>
      </div>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </div>
  );
}

export default function AssessmentQuestionBankPanel({
  questions = [],
  selectedQuestionIds = [],
  isLoading = false,
  onRefresh,
  onCreateQuestions,
  onUpdateQuestion,
  onDeleteQuestion,
  onDeleteAllQuestions,
  onToggleQuestion,
  onSelectAllQuestions,
  onClearAllQuestions,
}) {
  const [bulkText, setBulkText] = useState('');
  const [bulkErrors, setBulkErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const selectedSet = useMemo(() => new Set(selectedQuestionIds), [selectedQuestionIds]);
  const visibleQuestions = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('ko-KR');
    if (!keyword) return questions;
    return questions.filter((question) => (
      question.text.toLocaleLowerCase('ko-KR').includes(keyword)
      || question.options.some((option) => option.toLocaleLowerCase('ko-KR').includes(keyword))
    ));
  }, [questions, search]);
  const selectableQuestionIds = useMemo(
    () => questions.slice(0, ASSESSMENT_LIMITS.maxQuestions).map((question) => question.id),
    [questions],
  );
  const allQuestionsSelected = selectableQuestionIds.length > 0
    && selectableQuestionIds.every((questionId) => selectedSet.has(questionId));
  const hasSelectedBankQuestions = questions.some((question) => selectedSet.has(question.id));

  const createQuestions = async () => {
    setBulkErrors([]);
    setMessage('');
    const parsed = parseBulkAssessmentQuestions(bulkText, `bank-${Date.now()}`);
    if (parsed.errors.length > 0) {
      setBulkErrors(parsed.errors);
      return;
    }
    if (parsed.questions.length === 0) {
      setBulkErrors(['등록할 문항을 입력하세요.']);
      return;
    }
    if (parsed.questions.length > ASSESSMENT_LIMITS.maxQuestions) {
      setBulkErrors([`한 번에 최대 ${ASSESSMENT_LIMITS.maxQuestions}문항까지 등록할 수 있습니다.`]);
      return;
    }

    setIsCreating(true);
    try {
      await onCreateQuestions(parsed.questions);
      setBulkText('');
      setMessage(`${parsed.questions.length}개 문항을 문제은행에 등록했습니다.`);
    } catch (error) {
      setBulkErrors([error.message || '문항을 등록하지 못했습니다.']);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteAllQuestions = async () => {
    if (questions.length === 0) return;
    const confirmed = window.confirm(
      `문제은행의 문항 ${questions.length}개를 모두 삭제할까요?\n이미 저장된 형성평가는 기존 문항을 유지하지만, 삭제한 문항은 새 평가에서 다시 선택할 수 없습니다.`,
    );
    if (!confirmed) return;

    setBulkErrors([]);
    setMessage('');
    setIsDeletingAll(true);
    try {
      const result = await onDeleteAllQuestions(questions);
      setMessage(`${result?.deletedCount || questions.length}개 문항을 문제은행에서 삭제했습니다.`);
      setSearch('');
      setEditingId('');
    } catch (error) {
      setBulkErrors([error.message || '문제은행 문항을 전체 삭제하지 못했습니다.']);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <section className="glass-box rounded-3xl p-5 md:p-7 border-2 border-teal-100 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black tracking-widest text-teal-600">QUESTION BANK</div>
          <h2 className="text-2xl font-black text-gray-800">형성평가 문제은행</h2>
          <p className="mt-1 text-sm font-bold text-gray-500">문제는 한 번 등록하고, 아래 평가에서 필요한 문항만 선택해 재사용합니다.</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={isLoading} className="rounded-xl border border-teal-100 bg-white px-4 py-2 text-sm font-black text-teal-700 disabled:opacity-50">
          {isLoading ? '불러오는 중...' : '문제은행 새로고침'}
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
        <h3 className="font-black text-teal-800">문항 일괄등록</h3>
        <p className="mt-1 text-xs font-bold text-teal-600">문제 | 보기1 | 보기2 | 보기3 | 보기4 | 정답번호 형식 또는 엑셀 6개 열을 붙여넣으세요.</p>
        <textarea
          value={bulkText}
          onChange={(event) => {
            setBulkText(event.target.value);
            setBulkErrors([]);
            setMessage('');
          }}
          rows={6}
          placeholder={'컴퓨터의 두뇌 역할을 하는 장치는? | CPU | RAM | 키보드 | 모니터 | 1\n정보를 임시 저장하는 장치는? | CPU | RAM | 마우스 | 프린터 | 2'}
          className="mt-3 w-full resize-y rounded-xl border border-teal-100 bg-white px-4 py-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button type="button" onClick={createQuestions} disabled={isCreating} className="mt-3 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50">
          {isCreating ? '등록 중...' : '문제은행에 일괄등록'}
        </button>
        {message && <p className="mt-3 text-sm font-black text-emerald-700">{message}</p>}
        {bulkErrors.length > 0 && (
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {bulkErrors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="문제 또는 보기 검색"
          className="min-w-0 flex-1 rounded-xl border border-teal-100 bg-white px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button
          type="button"
          onClick={() => onSelectAllQuestions(selectableQuestionIds)}
          disabled={questions.length === 0 || allQuestionsSelected}
          className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
          {questions.length > ASSESSMENT_LIMITS.maxQuestions ? `최대 ${ASSESSMENT_LIMITS.maxQuestions}개 선택` : '전체 선택'}
        </button>
        <button
          type="button"
          onClick={() => onClearAllQuestions(questions.map((question) => question.id))}
          disabled={!hasSelectedBankQuestions}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-600 disabled:bg-gray-50 disabled:text-gray-300"
        >
          전체 해제
        </button>
        <button
          type="button"
          onClick={deleteAllQuestions}
          disabled={questions.length === 0 || isDeletingAll}
          className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
        >
          {isDeletingAll ? '전체 삭제 중...' : '문제은행 전체 삭제'}
        </button>
        <span className="rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">전체 {questions.length}개 · 평가 선택 {selectedQuestionIds.length}개</span>
      </div>

      <div className="mt-4 max-h-[680px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {visibleQuestions.map((question, index) => (
          <article key={question.id} className={`rounded-2xl border p-4 ${selectedSet.has(question.id) ? 'border-emerald-300 bg-emerald-50/80' : 'border-cyan-100 bg-white/90'}`}>
            {editingId === question.id ? (
              <QuestionEditor
                question={question}
                onCancel={() => setEditingId('')}
                onSave={async (updatedQuestion) => {
                  await onUpdateQuestion(updatedQuestion);
                  setEditingId('');
                }}
              />
            ) : (
              <div className="flex items-start gap-3">
                <label className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-2 py-1 text-xs font-black text-emerald-700">
                  <input
                    type="checkbox"
                    checked={selectedSet.has(question.id)}
                    onChange={() => onToggleQuestion(question.id)}
                    className="accent-emerald-500"
                  />
                  평가에 사용
                </label>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-gray-800">{index + 1}. {question.text}</div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-xs font-bold text-gray-500 sm:grid-cols-2">
                    {question.options.map((option, optionIndex) => (
                      <span key={`${question.id}-${optionIndex}`} className={question.answer === optionIndex ? 'font-black text-emerald-700' : ''}>
                        {optionIndex + 1}. {option}{question.answer === optionIndex ? ' (정답)' : ''}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => setEditingId(question.id)} className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">수정</button>
                  <button type="button" onClick={() => onDeleteQuestion(question.id)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600">삭제</button>
                </div>
              </div>
            )}
          </article>
        ))}
        {!isLoading && visibleQuestions.length === 0 && (
          <p className="py-10 text-center font-bold text-gray-400">{questions.length === 0 ? '문제은행이 비어 있습니다.' : '검색 결과가 없습니다.'}</p>
        )}
      </div>
    </section>
  );
}

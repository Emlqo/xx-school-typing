import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ASSESSMENT_LIMITS,
  ASSESSMENT_STATUS,
  createEmptyAssessmentQuestion,
} from '../../constants/assessments.js';
import { parseBulkAssessmentQuestions } from '../../utils/assessments.js';
import {
  deleteTeacherAssessment,
  getTeacherAssessment,
  getTeacherAssessmentStatus,
  listTeacherAssessments,
  resetTeacherAssessmentSubmission,
  saveTeacherAssessment,
  updateTeacherAssessmentStatus,
} from '../../services/studentSecurityApi.js';

function createEmptyForm() {
  return {
    id: '',
    title: '',
    description: '',
    targetClassIds: [],
    questions: [createEmptyAssessmentQuestion(0)],
  };
}

function statusLabel(status) {
  if (status === ASSESSMENT_STATUS.active) return '공개 중';
  if (status === ASSESSMENT_STATUS.closed) return '종료';
  return '초안';
}

function statusClass(status) {
  if (status === ASSESSMENT_STATUS.active) return 'bg-emerald-100 text-emerald-700';
  if (status === ASSESSMENT_STATUS.closed) return 'bg-gray-100 text-gray-600';
  return 'bg-amber-100 text-amber-700';
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AssessmentManagementPanel({ classes = [] }) {
  const [assessments, setAssessments] = useState([]);
  const [form, setForm] = useState(createEmptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [statusAssessmentId, setStatusAssessmentId] = useState('');
  const [statusClassId, setStatusClassId] = useState('');
  const [statusRows, setStatusRows] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusLoadedAt, setStatusLoadedAt] = useState(0);

  const loadAssessments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await listTeacherAssessments();
      const next = result?.assessments || [];
      setAssessments(next);
      setStatusAssessmentId((current) => current || next[0]?.id || '');
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || '형성평가 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const classNameMap = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem.name])),
    [classes],
  );
  const statusAssessment = assessments.find((item) => item.id === statusAssessmentId) || null;

  useEffect(() => {
    const availableClassIds = statusAssessment?.targetClassIds || [];
    if (!availableClassIds.includes(statusClassId)) {
      setStatusClassId(availableClassIds[0] || '');
      setStatusRows([]);
    }
  }, [statusAssessment, statusClassId]);

  const completedCount = statusRows.filter((row) => row.submission?.status === 'completed').length;
  const inProgressCount = statusRows.filter((row) => row.submission?.status === 'in_progress').length;

  const resetForm = () => {
    setForm(createEmptyForm());
    setError('');
    setBulkText('');
    setBulkErrors([]);
    setBulkMessage('');
  };

  const toggleTargetClass = (classId) => {
    setForm((current) => ({
      ...current,
      targetClassIds: current.targetClassIds.includes(classId)
        ? current.targetClassIds.filter((id) => id !== classId)
        : [...current.targetClassIds, classId],
    }));
  };

  const updateQuestion = (questionIndex, patch) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex ? { ...question, ...patch } : question
      )),
    }));
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) => (
        index === questionIndex
          ? {
            ...question,
            options: question.options.map((option, currentOptionIndex) => (
              currentOptionIndex === optionIndex ? value : option
            )),
          }
          : question
      )),
    }));
  };

  const addQuestion = () => {
    setForm((current) => ({
      ...current,
      questions: [...current.questions, createEmptyAssessmentQuestion(current.questions.length)],
    }));
  };

  const removeQuestion = (questionIndex) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.length === 1
        ? current.questions
        : current.questions.filter((_, index) => index !== questionIndex),
    }));
  };

  const applyBulkQuestions = (mode) => {
    setBulkErrors([]);
    setBulkMessage('');
    const parsed = parseBulkAssessmentQuestions(bulkText, `bulk-${Date.now()}`);
    if (parsed.errors.length > 0) {
      setBulkErrors(parsed.errors);
      return;
    }
    if (parsed.questions.length === 0) {
      setBulkErrors(['등록할 문항을 입력하세요.']);
      return;
    }

    const currentQuestions = form.questions.length === 1
      && !form.questions[0].text.trim()
      && form.questions[0].options.every((option) => !option.trim())
      ? []
      : form.questions;
    const nextQuestions = mode === 'replace'
      ? parsed.questions
      : [...currentQuestions, ...parsed.questions];
    if (nextQuestions.length > ASSESSMENT_LIMITS.maxQuestions) {
      setBulkErrors([`형성평가는 최대 ${ASSESSMENT_LIMITS.maxQuestions}문항까지 등록할 수 있습니다.`]);
      return;
    }

    setForm((current) => ({ ...current, questions: nextQuestions }));
    setBulkText('');
    setBulkMessage(`${parsed.questions.length}개 문항을 ${mode === 'replace' ? '교체' : '추가'}했습니다. 저장 버튼을 눌러야 DB에 반영됩니다.`);
  };

  const save = async (status) => {
    setIsSaving(true);
    setError('');
    try {
      await saveTeacherAssessment({ ...form, status });
      resetForm();
      await loadAssessments();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.message || '형성평가를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const edit = async (assessmentId) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await getTeacherAssessment(assessmentId);
      if (!result?.assessment) throw new Error('형성평가를 찾을 수 없습니다.');
      setForm(result.assessment);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (editError) {
      console.error(editError);
      setError(editError.message || '형성평가를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const changeStatus = async (assessmentId, status) => {
    setError('');
    try {
      await updateTeacherAssessmentStatus(assessmentId, status);
      await loadAssessments();
    } catch (statusError) {
      console.error(statusError);
      setError(statusError.message || '평가 상태를 변경하지 못했습니다.');
    }
  };

  const remove = async (assessmentId) => {
    if (!window.confirm('이 형성평가를 삭제할까요? 기존 제출 기록은 읽지 않으며 DB에 보존됩니다.')) return;
    setError('');
    try {
      await deleteTeacherAssessment(assessmentId);
      if (form.id === assessmentId) resetForm();
      if (statusAssessmentId === assessmentId) {
        setStatusAssessmentId('');
        setStatusRows([]);
      }
      await loadAssessments();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.message || '형성평가를 삭제하지 못했습니다.');
    }
  };

  const refreshStatus = async () => {
    if (!statusAssessmentId || !statusClassId) return;
    setStatusLoading(true);
    setError('');
    try {
      const result = await getTeacherAssessmentStatus(statusAssessmentId, statusClassId);
      setStatusRows(result?.rows || []);
      setStatusLoadedAt(Date.now());
    } catch (statusError) {
      console.error(statusError);
      setError(statusError.message || '응시 현황을 불러오지 못했습니다.');
    } finally {
      setStatusLoading(false);
    }
  };

  const resetSubmission = async (studentId) => {
    if (!window.confirm('이 학생의 형성평가 기록을 초기화할까요?')) return;
    try {
      await resetTeacherAssessmentSubmission(statusAssessmentId, studentId);
      await refreshStatus();
    } catch (resetError) {
      console.error(resetError);
      setError(resetError.message || '제출 기록을 초기화하지 못했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-box rounded-3xl p-5 md:p-7 border-2 border-cyan-100 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <div className="text-xs font-black text-teal-600 tracking-widest">FORMATIVE ASSESSMENT</div>
            <h2 className="text-2xl font-black text-gray-800">형성평가 만들기</h2>
            <p className="text-sm font-bold text-gray-500 mt-1">정답은 학생 화면에 전송되지 않고 서버에서만 채점됩니다.</p>
          </div>
          {form.id && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-white border border-cyan-100 text-teal-700 font-black">
              새 평가 작성
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] gap-5">
          <div className="space-y-4">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="평가 제목"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-cyan-100 bg-white/90 font-bold outline-none focus:ring-2 focus:ring-teal-400"
            />
            <textarea
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="학생에게 보여줄 안내"
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-cyan-100 bg-white/90 font-bold outline-none focus:ring-2 focus:ring-teal-400 resize-y"
            />
          </div>

          <div className="bg-white/80 border border-cyan-100 rounded-2xl p-4">
            <div className="font-black text-gray-700 mb-3">대상 학급</div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
              {classes.map((classItem) => (
                <label key={classItem.id} className="flex items-center gap-2 rounded-xl border border-cyan-50 bg-cyan-50/60 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.targetClassIds.includes(classItem.id)}
                    onChange={() => toggleTargetClass(classItem.id)}
                    className="accent-teal-500"
                  />
                  <span className="text-sm font-black text-gray-700 truncate">{classItem.name}</span>
                </label>
              ))}
              {classes.length === 0 && <p className="col-span-2 text-sm font-bold text-gray-400">등록된 학급이 없습니다.</p>}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/60 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-teal-800">문항 일괄등록</h3>
              <p className="mt-1 text-xs font-bold text-teal-600">한 줄에 문제 | 보기1 | 보기2 | 보기3 | 보기4 | 정답번호 형식으로 입력하세요. 엑셀 6개 열을 그대로 붙여넣어도 됩니다.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-teal-700">최대 {ASSESSMENT_LIMITS.maxQuestions}문항</span>
          </div>
          <textarea
            value={bulkText}
            onChange={(event) => {
              setBulkText(event.target.value);
              setBulkErrors([]);
              setBulkMessage('');
            }}
            rows={7}
            placeholder={'컴퓨터의 두뇌 역할을 하는 장치는? | CPU | RAM | 키보드 | 모니터 | 1\n정보를 임시 저장하는 장치는? | CPU | RAM | 마우스 | 프린터 | 2'}
            className="mt-4 w-full resize-y rounded-xl border border-teal-100 bg-white/95 px-4 py-3 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-teal-400"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => applyBulkQuestions('replace')} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-black text-white shadow-sm">
              현재 문항 교체
            </button>
            <button type="button" onClick={() => applyBulkQuestions('append')} className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-black text-teal-700">
              기존 문항 뒤에 추가
            </button>
          </div>
          {bulkMessage && <p className="mt-3 text-sm font-black text-emerald-700">{bulkMessage}</p>}
          {bulkErrors.length > 0 && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {bulkErrors.map((bulkError) => <p key={bulkError}>{bulkError}</p>)}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {form.questions.map((question, questionIndex) => (
            <div key={question.id} className="bg-white/90 border border-cyan-100 rounded-2xl p-4 md:p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="font-black text-teal-700">문항 {questionIndex + 1}</div>
                <button
                  type="button"
                  onClick={() => removeQuestion(questionIndex)}
                  disabled={form.questions.length === 1}
                  className="text-xs font-black text-red-500 disabled:text-gray-300"
                >
                  문항 삭제
                </button>
              </div>
              <input
                value={question.text}
                onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
                placeholder="문제를 입력하세요."
                maxLength={500}
                className="w-full px-4 py-3 rounded-xl border border-gray-100 font-bold outline-none focus:ring-2 focus:ring-teal-400"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {question.options.map((option, optionIndex) => (
                  <label key={`${question.id}-${optionIndex}`} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${question.answer === optionIndex ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-gray-50/70'}`}>
                    <input
                      type="radio"
                      name={`answer-${question.id}`}
                      checked={question.answer === optionIndex}
                      onChange={() => updateQuestion(questionIndex, { answer: optionIndex })}
                      className="accent-emerald-500 shrink-0"
                    />
                    <span className="text-xs font-black text-gray-400 shrink-0">{optionIndex + 1}</span>
                    <input
                      value={option}
                      onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)}
                      placeholder={`보기 ${optionIndex + 1}`}
                      maxLength={200}
                      className="min-w-0 flex-1 bg-transparent font-bold text-gray-700 outline-none"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs font-bold text-emerald-600 mt-2">선택된 정답: {question.answer + 1}번</p>
            </div>
          ))}
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3 mt-5">
          <button type="button" onClick={addQuestion} className="px-5 py-3 rounded-xl bg-cyan-50 border border-cyan-100 text-teal-700 font-black">
            + 문항 추가
          </button>
          <div className="flex-1" />
          <button type="button" onClick={() => save(ASSESSMENT_STATUS.draft)} disabled={isSaving} className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-black disabled:opacity-50">
            초안 저장
          </button>
          <button type="button" onClick={() => save(ASSESSMENT_STATUS.active)} disabled={isSaving} className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black shadow-lg disabled:opacity-50">
            {isSaving ? '저장 중...' : '학생에게 공개'}
          </button>
        </div>
      </section>

      <section className="glass-box rounded-3xl p-5 md:p-7 border-2 border-cyan-100 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-black text-gray-800">등록된 형성평가</h2>
            <p className="text-xs font-bold text-gray-400">목록은 이 화면을 열거나 새로고침 버튼을 누를 때만 조회합니다.</p>
          </div>
          <button type="button" onClick={loadAssessments} disabled={isLoading} className="px-4 py-2 rounded-xl bg-cyan-50 text-teal-700 font-black border border-cyan-100 disabled:opacity-50">
            {isLoading ? '불러오는 중...' : '목록 새로고침'}
          </button>
        </div>
        <div className="space-y-3">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="bg-white/90 border border-cyan-100 rounded-2xl p-4 flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-gray-800 truncate">{assessment.title}</span>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${statusClass(assessment.status)}`}>{statusLabel(assessment.status)}</span>
                </div>
                <div className="text-xs font-bold text-gray-400 mt-1">
                  {assessment.questionCount}문항 · {assessment.targetClassIds.map((id) => classNameMap.get(id) || '삭제된 학급').join(', ')} · {formatDate(assessment.updatedAt || assessment.createdAt)}
                </div>
              </div>
              <button type="button" onClick={() => edit(assessment.id)} className="px-3 py-2 rounded-lg bg-sky-50 text-sky-700 font-black text-sm">수정</button>
              {assessment.status !== ASSESSMENT_STATUS.active ? (
                <button type="button" onClick={() => changeStatus(assessment.id, ASSESSMENT_STATUS.active)} className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-black text-sm">공개</button>
              ) : (
                <button type="button" onClick={() => changeStatus(assessment.id, ASSESSMENT_STATUS.closed)} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 font-black text-sm">종료</button>
              )}
              <button type="button" onClick={() => remove(assessment.id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 font-black text-sm">삭제</button>
            </div>
          ))}
          {!isLoading && assessments.length === 0 && <p className="text-center py-10 text-gray-400 font-bold">등록된 형성평가가 없습니다.</p>}
        </div>
      </section>

      <section className="glass-box rounded-3xl p-5 md:p-7 border-2 border-cyan-100 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl font-black text-gray-800">학급별 응시 현황</h2>
            <p className="text-xs font-bold text-gray-400 mt-1">실시간 구독 없이 현황 새로고침을 누를 때만 DB를 읽습니다.</p>
          </div>
          {statusLoadedAt > 0 && <span className="text-xs font-bold text-gray-400">최근 조회 {formatDate(statusLoadedAt)}</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mb-5">
          <select value={statusAssessmentId} onChange={(event) => { setStatusAssessmentId(event.target.value); setStatusClassId(''); setStatusRows([]); }} className="px-4 py-3 rounded-xl border border-cyan-100 bg-white font-bold">
            <option value="">평가 선택</option>
            {assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}
          </select>
          <select value={statusClassId} onChange={(event) => { setStatusClassId(event.target.value); setStatusRows([]); }} className="px-4 py-3 rounded-xl border border-cyan-100 bg-white font-bold">
            <option value="">학급 선택</option>
            {classes
              .filter((classItem) => !statusAssessment || statusAssessment.targetClassIds.includes(classItem.id))
              .map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
          </select>
          <button type="button" onClick={refreshStatus} disabled={statusLoading || !statusAssessmentId || !statusClassId} className="px-6 py-3 rounded-xl bg-teal-500 text-white font-black disabled:bg-gray-300">
            {statusLoading ? '조회 중...' : '현황 새로고침'}
          </button>
        </div>

        {statusRows.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3 text-center"><div className="text-2xl font-black text-gray-700">{statusRows.length}</div><div className="text-xs font-bold text-gray-400">전체</div></div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-center"><div className="text-2xl font-black text-amber-600">{inProgressCount}</div><div className="text-xs font-bold text-amber-500">응시 중</div></div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center"><div className="text-2xl font-black text-emerald-600">{completedCount}</div><div className="text-xs font-bold text-emerald-500">제출 완료</div></div>
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-cyan-100 bg-white/90">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-cyan-50 text-teal-800">
              <tr><th className="text-left px-4 py-3">학생</th><th className="px-4 py-3">상태</th><th className="px-4 py-3">최근 점수</th><th className="px-4 py-3">최고 점수</th><th className="px-4 py-3">응시 횟수</th><th className="px-4 py-3">관리</th></tr>
            </thead>
            <tbody>
              {statusRows.map((row) => {
                const submission = row.submission;
                const stateText = !submission ? '미응시' : submission.status === 'completed' ? '제출 완료' : '응시 중';
                return (
                  <tr key={row.studentId} className="border-t border-cyan-50">
                    <td className="px-4 py-3 font-black text-gray-700">{row.name}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-full text-xs font-black ${!submission ? 'bg-gray-100 text-gray-500' : submission.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{stateText}</span></td>
                    <td className="px-4 py-3 text-center font-black text-sky-600">{submission?.status === 'completed' ? `${submission.latestScore}점` : '-'}</td>
                    <td className="px-4 py-3 text-center font-black text-emerald-600">{submission?.attemptCount ? `${submission.bestScore}점` : '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-500">{submission?.attemptCount || 0}회</td>
                    <td className="px-4 py-3 text-center"><button type="button" onClick={() => resetSubmission(row.studentId)} disabled={!submission} className="text-xs font-black text-red-500 disabled:text-gray-300">기록 초기화</button></td>
                  </tr>
                );
              })}
              {!statusLoading && statusRows.length === 0 && <tr><td colSpan="6" className="text-center py-12 text-gray-400 font-bold">평가와 학급을 선택하고 현황을 새로고침하세요.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

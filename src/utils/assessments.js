export function calculateAssessmentResult(questions = [], answerKey = [], submittedAnswers = []) {
  const answerMap = new Map(
    answerKey.map((item) => [String(item?.id || ''), Number(item?.answer)]),
  );
  const submittedMap = new Map(
    submittedAnswers.map((item) => [String(item?.id || ''), Number(item?.answer)]),
  );
  const incorrectQuestionNumbers = [];
  let correctCount = 0;

  questions.forEach((question, index) => {
    const questionId = String(question?.id || '');
    if (answerMap.has(questionId) && submittedMap.get(questionId) === answerMap.get(questionId)) {
      correctCount += 1;
    } else {
      incorrectQuestionNumbers.push(index + 1);
    }
  });

  const totalQuestions = questions.length;
  return {
    correctCount,
    totalQuestions,
    score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
    incorrectQuestionNumbers,
  };
}

export function createAssessmentSubmissionId(assessmentId, studentId) {
  return `${String(assessmentId || '').trim()}_${String(studentId || '').trim()}`;
}

export function parseBulkAssessmentQuestions(text, idPrefix = 'bulk-question') {
  const rows = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const questions = [];
  const errors = [];

  rows.forEach((line, rowIndex) => {
    const delimiter = line.includes('\t') ? '\t' : '|';
    const cells = line.split(delimiter).map((cell) => cell.trim());
    const isHeader = rowIndex === 0
      && /문제|question/i.test(cells[0] || '')
      && /정답|answer/i.test(cells.at(-1) || '');
    if (isHeader) return;
    if (cells.length !== 6) {
      errors.push(`${rowIndex + 1}행: 문제, 보기 4개, 정답 번호까지 6칸이 필요합니다.`);
      return;
    }
    const [questionText, ...rest] = cells;
    const options = rest.slice(0, 4);
    const answerMatch = rest[4].match(/^([1-4])(?:번)?$/);
    if (!questionText || options.some((option) => !option) || !answerMatch) {
      errors.push(`${rowIndex + 1}행: 빈 내용이 있거나 정답 번호가 1~4가 아닙니다.`);
      return;
    }
    questions.push({
      id: `${idPrefix}-${rowIndex + 1}`,
      text: questionText,
      options,
      answer: Number(answerMatch[1]) - 1,
    });
  });

  return { questions, errors };
}

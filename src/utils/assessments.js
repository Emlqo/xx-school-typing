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

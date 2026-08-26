export const ASSESSMENT_STATUS = {
  draft: 'draft',
  active: 'active',
  closed: 'closed',
};

export const ASSESSMENT_LIMITS = {
  maxAssessments: 50,
  maxQuestions: 50,
  maxTitleLength: 100,
  maxDescriptionLength: 500,
  maxQuestionLength: 500,
  maxOptionLength: 200,
};

export function createEmptyAssessmentQuestion(index = 0) {
  return {
    id: `question-${Date.now()}-${index}`,
    text: '',
    options: ['', '', '', ''],
    answer: 0,
  };
}

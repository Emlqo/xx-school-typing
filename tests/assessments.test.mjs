import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAssessmentResult,
  createAssessmentSubmissionId,
} from '../src/utils/assessments.js';

const questions = [
  { id: 'q1', text: '첫 번째 문제' },
  { id: 'q2', text: '두 번째 문제' },
  { id: 'q3', text: '세 번째 문제' },
];
const answerKey = [
  { id: 'q1', answer: 0 },
  { id: 'q2', answer: 2 },
  { id: 'q3', answer: 1 },
];

test('형성평가 점수를 100점 기준으로 계산한다', () => {
  const result = calculateAssessmentResult(questions, answerKey, [
    { id: 'q1', answer: 0 },
    { id: 'q2', answer: 2 },
    { id: 'q3', answer: 1 },
  ]);
  assert.equal(result.score, 100);
  assert.equal(result.correctCount, 3);
  assert.deepEqual(result.incorrectQuestionNumbers, []);
});

test('정답은 공개하지 않고 틀린 문항 번호만 반환한다', () => {
  const result = calculateAssessmentResult(questions, answerKey, [
    { id: 'q1', answer: 1 },
    { id: 'q2', answer: 2 },
    { id: 'q3', answer: 0 },
  ]);
  assert.equal(result.score, 33);
  assert.equal(result.correctCount, 1);
  assert.deepEqual(result.incorrectQuestionNumbers, [1, 3]);
  assert.equal('answers' in result, false);
});

test('학생별 평가 제출 문서 ID가 재응시해도 동일하다', () => {
  assert.equal(createAssessmentSubmissionId('assessment-1', 'student-1'), 'assessment-1_student-1');
});

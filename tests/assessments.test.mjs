import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAssessmentResult,
  createAssessmentSubmissionId,
  parseBulkAssessmentQuestions,
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

test('구분자 형식 문제를 여러 개 일괄 변환한다', () => {
  const result = parseBulkAssessmentQuestions([
    '컴퓨터의 두뇌 역할을 하는 장치는? | CPU | RAM | 키보드 | 모니터 | 1',
    '정보를 임시 저장하는 장치는? | CPU | RAM | 마우스 | 프린터 | 2번',
  ].join('\n'), 'test');
  assert.equal(result.errors.length, 0);
  assert.equal(result.questions.length, 2);
  assert.equal(result.questions[0].answer, 0);
  assert.equal(result.questions[1].answer, 1);
});

test('엑셀 탭 형식의 머리글을 제외하고 잘못된 행을 보고한다', () => {
  const result = parseBulkAssessmentQuestions([
    '문제\t보기1\t보기2\t보기3\t보기4\t정답',
    '정상 문제\t하나\t둘\t셋\t넷\t4',
    '칸이 부족한 문제\t하나\t둘',
  ].join('\n'), 'test');
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].answer, 3);
  assert.equal(result.errors.length, 1);
});

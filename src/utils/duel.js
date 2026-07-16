import { ENGLISH_WORDS, KOREAN_WORDS } from '../constants/words.js';

const DUEL_WORDS = [...KOREAN_WORDS, ...ENGLISH_WORDS];

function seededIndex(seed, index, length) {
  if (!length) return 0;
  let value = (Number(seed) || 1) + Math.imul(index + 1, 0x9e3779b1);
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) % length;
}

export function getDuelWord(seed, index) {
  if (!DUEL_WORDS.length) return '풍양중학교';
  const safeIndex = seededIndex(seed, index, DUEL_WORDS.length);
  return DUEL_WORDS[safeIndex] || '풍양중학교';
}

export function createDuelQuizSequence(quizzes = []) {
  return [...quizzes]
    .filter((quiz) => (
      quiz?.question
      && Array.isArray(quiz.options)
      && quiz.options.length === 4
    ))
    .sort(() => Math.random() - 0.5)
    .map((quiz) => ({
      id: quiz.id,
      question: quiz.question,
      options: quiz.options,
      answer: Number(quiz.answer || 0),
    }));
}

export function toDuelMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}

export function getDuelRemainingSeconds(duel, now = Date.now()) {
  const endsAt = toDuelMillis(duel?.endsAt);
  return endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
}

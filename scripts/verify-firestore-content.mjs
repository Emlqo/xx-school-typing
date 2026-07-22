import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialPath) throw new Error('GOOGLE_APPLICATION_CREDENTIALS가 필요합니다.');

const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const basePath = 'artifacts/xx-school-typing-app/public/data';
const [wordsSnapshot, quizzesSnapshot] = await Promise.all([
  db.collection(`${basePath}/typing_words`).get(),
  db.collection(`${basePath}/typing_quizzes`).get(),
]);
const quizzes = quizzesSnapshot.docs.map((document) => document.data());
const categories = quizzes.reduce((result, quiz) => ({
  ...result,
  [quiz.category]: (result[quiz.category] || 0) + 1,
}), {});
const answerPositions = [0, 1, 2, 3].map(
  (answer) => quizzes.filter((quiz) => quiz.answer === answer).length,
);
const validQuizCount = quizzes.filter(
  (quiz) => quiz.question
    && Array.isArray(quiz.options)
    && quiz.options.length === 4
    && Number.isInteger(quiz.answer)
    && quiz.answer >= 0
    && quiz.answer < 4,
).length;

console.log(JSON.stringify({
  words: wordsSnapshot.size,
  quizzes: quizzesSnapshot.size,
  validQuizCount,
  categories,
  answerPositions,
}, null, 2));

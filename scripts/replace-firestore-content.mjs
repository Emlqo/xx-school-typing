import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';

const APP_ID = 'xx-school-typing-app';
const PUBLIC_DATA_PATH = `artifacts/${APP_ID}/public/data`;
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!credentialPath) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS 환경변수에 서비스 계정 JSON 경로를 지정해주세요.');
}

const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const quizzes = JSON.parse(readFileSync('content-drafts/quizzes.json', 'utf8'));
const wordsRef = db.collection(`${PUBLIC_DATA_PATH}/typing_words`);
const quizzesRef = db.collection(`${PUBLIC_DATA_PATH}/typing_quizzes`);

const serializeFirestoreValue = (value) => {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serializeFirestoreValue(item)]));
  }
  return value;
};

const snapshotCollection = async (collectionRef) => {
  const snapshot = await collectionRef.get();
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...serializeFirestoreValue(document.data()),
  }));
};

const oldWords = await snapshotCollection(wordsRef);
const oldQuizzes = await snapshotCollection(quizzesRef);
const backupStamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const backupDirectory = join('content-backups', backupStamp);
mkdirSync(backupDirectory, { recursive: true });
writeFileSync(join(backupDirectory, 'typing_words.json'), JSON.stringify(oldWords, null, 2), 'utf8');
writeFileSync(join(backupDirectory, 'typing_quizzes.json'), JSON.stringify(oldQuizzes, null, 2), 'utf8');

const deleteWriter = db.bulkWriter();
for (const word of oldWords) deleteWriter.delete(wordsRef.doc(word.id));
for (const quiz of oldQuizzes) deleteWriter.delete(quizzesRef.doc(quiz.id));
await deleteWriter.close();

const createWriter = db.bulkWriter();
quizzes.forEach((quiz, index) => {
  const documentId = `quiz-${String(index + 1).padStart(3, '0')}`;
  createWriter.set(quizzesRef.doc(documentId), {
    question: quiz.question,
    options: quiz.options,
    answer: quiz.answer,
    category: quiz.category,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
});

await createWriter.close();

const [newWords, newQuizzes] = await Promise.all([
  wordsRef.get(),
  quizzesRef.get(),
]);

console.log(JSON.stringify({
  projectId: serviceAccount.project_id,
  credentialFile: basename(credentialPath),
  backupDirectory,
  previousWords: oldWords.length,
  previousQuizzes: oldQuizzes.length,
  currentWords: newWords.size,
  currentQuizzes: newQuizzes.size,
}, null, 2));

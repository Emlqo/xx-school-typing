import { readFileSync, writeFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const formatExport = (name, value) => `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;

const korean = readJson('content-drafts/korean-content.json');
const english = readJson('content-drafts/english-content.json');
const quizzes = readJson('content-drafts/quizzes.json');

writeFileSync(
  'src/constants/words.js',
  `${formatExport('KOREAN_WORDS', [...korean.words, ...korean.sentences])}\n${formatExport('ENGLISH_WORDS', [...english.words, ...english.sentences])}`,
  'utf8',
);

writeFileSync('src/constants/quizzes.js', formatExport('LOCAL_QUIZZES', quizzes), 'utf8');


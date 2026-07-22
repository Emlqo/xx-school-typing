import { readFileSync, writeFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const koreanPath = 'content-drafts/korean-content.json';
const englishPath = 'content-drafts/english-content.json';
const quizzesPath = 'content-drafts/quizzes.json';

const korean = readJson(koreanPath);
const english = readJson(englishPath);
const quizzes = readJson(quizzesPath);

korean.words = [
  '교실', '계획', '발표', '독서', '탐구', '과제', '수업', '습관', '시간', '목표',
  '점검', '진로', '공동체', '의견', '모둠', '자료', '평가', '일지', '토론', '관찰',
  '실험', '질문', '핵심', '복습', '예습', '전략', '교과', '성찰', '논리', '창의',
  '비판', '협력', '갈등', '경청', '책임', '존중', '조율', '판단', '분석', '해결',
  '근거', '대안', '예측', '과정', '주도', '집중', '실천', '도전', '결정', '정보',
  '관점', '설계', '생각', '표현', '능력', '동기', '성장', '실수', '달성', '노력',
  '디지털', '접근', '계정', '보호', '보안', '윤리', '예절', '인증', '암호', '접속',
  '경고', '의심', '악성', '위조', '노출', '권한', '로그인', '백업', '기기', '업데이트',
  '출처', '사실', '공유', '공개', '동의', '저작물', '인용', '책임감', '폭력', '신고',
  '데이터', '시각화', '조건', '반복', '오류', '코드', '입력', '출력', '저장', '처리',
  '통신', '무선', '명령', '변수', '함수', '제어', '실행', '개발', '연결', '검색',
  '정렬', '파일', '폴더', '확장자', '화면', '사용자', '접근성', '메시지', '장치', '기술',
  '인공지능', '학습', '자동화', '음성', '영상', '추천', '모형', '편향', '번역', '생성',
  '검토', '기준', '중심', '도구', '활용', '정확도', '훈련', '수집', '정제', '특징',
  '분류', '가능성', '영향', '공정성', '투명성', '설명', '기후', '생물', '자원', '친환경',
  '에너지', '환경', '탄소', '재생', '해양', '대기', '우주', '과학', '측정', '가설',
  '연구', '생태', '기상', '절약', '지속성', '문화', '세계', '사회', '평화', '인권',
  '다양성', '참여', '지역', '세대', '교류', '배려', '신뢰', '용기', '끈기', '미래',
];

const englishWordReplacements = new Map([
  ['schoolroom', 'classroom'],
  ['termwork', 'coursework'],
  ['advancement', 'progress'],
  ['bravery', 'courage'],
  ['iteration', 'loop'],
  ['convention', 'protocol'],
  ['navigator', 'browser'],
  ['precision', 'accuracy'],
]);
english.words = english.words.map((word) => englishWordReplacements.get(word) || word);
english.sentences = english.sentences.map((sentence) => {
  if (sentence === 'repeated commands can be simplified by using an iteration') {
    return 'repeated commands can be simplified by using a loop';
  }
  if (sentence === 'long term observations can reveal changes in the climate') {
    return 'observations made over many years can reveal changes in the climate';
  }
  return sentence;
});

quizzes[1] = {
  ...quizzes[1],
  question: '처리 중인 자료를 빠르게 읽고 쓰기 위해 사용하는 임시 기억장치는 무엇인가',
  options: ['프린터', '램', '스캐너', '마이크'],
  answer: 1,
};
quizzes[10] = {
  ...quizzes[10],
  options: ['광고주', '판매자', '사용자', '제조사'],
};

writeJson(koreanPath, korean);
writeJson(englishPath, english);
writeJson(quizzesPath, quizzes);

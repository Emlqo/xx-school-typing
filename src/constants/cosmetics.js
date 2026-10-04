export const COSMETIC_ITEMS = [
  ...[
    ['neon_glitch', '네온 글리치', 80, '청록과 분홍 잔상이 테두리를 스칩니다.'],
    ['lightning_core', '번개 코어', 100, '푸른 전류가 테두리를 따라 흐릅니다.'],
    ['stellar_orbit', '별빛 궤도', 120, '금빛 별들이 이름 주변을 공전합니다.'],
    ['autumn_vortex', '단풍 회오리', 150, '단풍잎이 가장자리를 따라 흩날립니다.'],
  ].map(([id, name, price, description]) => ({
    id, name, price, season: 'autumn', boosterBonusSeconds: 5,
    description: `${description} 장착 후 새로 참여하는 학급 일반 타자 경기에서 부스터 +5초 (중첩 불가).`,
    previewClass: `cosmetic-preview cosmetic-season cosmetic-season-${id}`,
    leaderboardClass: `cosmetic-row cosmetic-season-row cosmetic-season-${id}`,
    badgeClass: `cosmetic-badge cosmetic-season-badge cosmetic-season-${id}`,
    effectClass: `cosmetic-effect-season cosmetic-effect-${id}`,
  })),
  {
    id: 'glow_teal',
    retired: true,
    name: '청록빛 오라',
    description: '점수판에서 이름 주변에 시원한 청록빛이 은은하게 빛납니다.',
    price: 80,
    previewClass: 'cosmetic-preview cosmetic-preview-teal',
    leaderboardClass: 'cosmetic-row cosmetic-row-teal',
    badgeClass: 'cosmetic-badge cosmetic-badge-teal',
    effectClass: 'cosmetic-effect-aura',
  },
  {
    id: 'border_forest',
    retired: true,
    name: '숲속 테두리',
    description: '초록 숲길처럼 차분한 테두리로 기록을 강조합니다.',
    price: 100,
    previewClass: 'cosmetic-preview cosmetic-preview-forest',
    leaderboardClass: 'cosmetic-row cosmetic-row-forest',
    badgeClass: 'cosmetic-badge cosmetic-badge-forest',
    effectClass: 'cosmetic-effect-forest',
  },
  {
    id: 'badge_summer',
    retired: true,
    name: '여름 별 배지',
    description: '닉네임 옆에 여름 별처럼 반짝이는 배지 느낌을 더합니다.',
    price: 120,
    previewClass: 'cosmetic-preview cosmetic-preview-summer',
    leaderboardClass: 'cosmetic-row cosmetic-row-summer',
    badgeClass: 'cosmetic-badge cosmetic-badge-summer',
    effectClass: 'cosmetic-effect-sun',
  },
  {
    id: 'shine_wave',
    retired: true,
    name: '파도 반짝임',
    description: '파도처럼 푸른빛이 흐르는 시원한 강조 효과입니다.',
    price: 150,
    previewClass: 'cosmetic-preview cosmetic-preview-wave',
    leaderboardClass: 'cosmetic-row cosmetic-row-wave',
    badgeClass: 'cosmetic-badge cosmetic-badge-wave',
    effectClass: 'cosmetic-effect-wave',
  },
  {
    id: 'title_mvp',
    name: 'MVP 왕관',
    description: '이달의 MVP에게 어울리는 황금 왕관 칭호입니다. 점수판에서 가장 화려하게 빛납니다.',
    price: 9999,
    category: 'title',
    previewClass: 'cosmetic-preview cosmetic-preview-title-mvp',
    leaderboardClass: 'cosmetic-row cosmetic-row-title-mvp',
    badgeClass: 'cosmetic-badge cosmetic-badge-title-mvp',
    effectClass: 'cosmetic-effect-title-mvp',
  },
  {
    id: 'title_quiz_king',
    name: '퀴즈왕',
    description: '한 게임에서 퀴즈를 가장 많이 맞힌 학생에게 주는 번뜩이는 지식의 칭호입니다.',
    price: 9999,
    category: 'title',
    previewClass: 'cosmetic-preview cosmetic-preview-title-quiz',
    leaderboardClass: 'cosmetic-row cosmetic-row-title-quiz',
    badgeClass: 'cosmetic-badge cosmetic-badge-title-quiz',
    effectClass: 'cosmetic-effect-title-quiz',
  },
  {
    id: 'title_practice_king',
    name: '꾸준왕',
    description: '로그인 자유연습을 성실하게 이어간 학생에게 주는 성장의 칭호입니다.',
    price: 9999,
    category: 'title',
    previewClass: 'cosmetic-preview cosmetic-preview-title-practice',
    leaderboardClass: 'cosmetic-row cosmetic-row-title-practice',
    badgeClass: 'cosmetic-badge cosmetic-badge-title-practice',
    effectClass: 'cosmetic-effect-title-practice',
  },
  {
    id: 'title_speed_king',
    name: '속도왕',
    description: '가장 빠른 CPM을 보여준 학생에게 주는 전광석화 칭호입니다.',
    price: 9999,
    category: 'title',
    previewClass: 'cosmetic-preview cosmetic-preview-title-speed',
    leaderboardClass: 'cosmetic-row cosmetic-row-title-speed',
    badgeClass: 'cosmetic-badge cosmetic-badge-title-speed',
    effectClass: 'cosmetic-effect-title-speed',
  },
];

export const HALL_OF_FAME_TITLE_IDS = {
  mvp: 'title_mvp',
  quizKing: 'title_quiz_king',
  participationKing: 'title_practice_king',
  speedKing: 'title_speed_king',
};

export const HALL_OF_FAME_TITLE_ID_LIST = Object.values(HALL_OF_FAME_TITLE_IDS);

export function getCosmeticById(cosmeticId) {
  return COSMETIC_ITEMS.find((item) => item.id === cosmeticId) || null;
}

export function isCosmeticForSale(id) {
  const item = getCosmeticById(id);
  return Boolean(item && !item.retired && item.category !== 'title');
}

export function getEquippedBoosterBonus(student) {
  if (!Array.isArray(student?.ownedCosmetics) || !student.ownedCosmetics.includes(student.equippedCosmetic)) return 0;
  return getCosmeticById(student.equippedCosmetic)?.boosterBonusSeconds === 5 ? 5 : 0;
}

export function getScoreBoosterBonus(score, practice = false) {
  return !practice && score?.entryType === 'class' && score.gameType === 'typing' && score.boosterBonusSeconds === 5 ? 5 : 0;
}

export const COSMETIC_ITEMS = [
  {
    id: 'glow_teal',
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
    name: '파도 반짝임',
    description: '파도처럼 푸른빛이 흐르는 시원한 강조 효과입니다.',
    price: 150,
    previewClass: 'cosmetic-preview cosmetic-preview-wave',
    leaderboardClass: 'cosmetic-row cosmetic-row-wave',
    badgeClass: 'cosmetic-badge cosmetic-badge-wave',
    effectClass: 'cosmetic-effect-wave',
  },
];

export function getCosmeticById(cosmeticId) {
  return COSMETIC_ITEMS.find((item) => item.id === cosmeticId) || null;
}

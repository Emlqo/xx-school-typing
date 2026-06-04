import { REWARD_RULES } from '../constants/rewards.js';

export function getDefaultRewardState() {
  return {
    totalEarned: 0,
    gameCompletePoints: 0,
    quizPoints: 0,
    bestScoreBonus: 0,
    growthBonus: 0,
    isNewBestScore: false,
    isGrowthAchieved: false,
    nextBestScore: 0,
  };
}

export function calculateRewardPoints({
  score = 0,
  quizCorrectCount = 0,
  previousBestScore = 0,
} = {}) {
  const currentScore = Math.max(0, Number(score) || 0);
  const correctQuizCount = Math.max(0, Number(quizCorrectCount) || 0);
  const bestScore = Math.max(0, Number(previousBestScore) || 0);

  const gameCompletePoints = REWARD_RULES.gameCompletePoints;
  const quizPoints = correctQuizCount * REWARD_RULES.quizCorrectPoints;
  const isNewBestScore = currentScore > bestScore;
  const growthRate = bestScore > 0 ? (currentScore - bestScore) / bestScore : 0;
  const isGrowthAchieved = isNewBestScore && growthRate >= REWARD_RULES.growthRateThreshold;
  const bestScoreBonus = isNewBestScore ? REWARD_RULES.bestScoreBonus : 0;
  const growthBonus = isGrowthAchieved ? REWARD_RULES.growthBonus : 0;
  const totalEarned = gameCompletePoints + quizPoints + bestScoreBonus + growthBonus;

  return {
    totalEarned,
    gameCompletePoints,
    quizPoints,
    bestScoreBonus,
    growthBonus,
    isNewBestScore,
    isGrowthAchieved,
    nextBestScore: isNewBestScore ? currentScore : bestScore,
  };
}

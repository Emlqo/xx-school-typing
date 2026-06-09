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
  includeGameComplete = true,
} = {}) {
  const currentScore = Math.max(0, Number(score) || 0);
  const correctQuizCount = Math.max(0, Number(quizCorrectCount) || 0);
  const bestScore = Math.max(0, Number(previousBestScore) || 0);

  const gameCompletePoints = includeGameComplete ? REWARD_RULES.gameCompletePoints : 0;
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

export function calculateRankRewards(scores = []) {
  const rankedScores = [...scores]
    .filter((score) => score?.entryType === 'class' && score.studentId)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const topThirtyCutoff = Math.ceil(rankedScores.length * 0.3);

  return rankedScores.map((score, index) => {
    let points = REWARD_RULES.rankPoints.completion;

    if (index === 0) points = REWARD_RULES.rankPoints.first;
    else if (index === 1) points = REWARD_RULES.rankPoints.second;
    else if (index === 2) points = REWARD_RULES.rankPoints.third;
    else if (index < topThirtyCutoff) points = REWARD_RULES.rankPoints.topThirtyPercent;

    return {
      scoreId: score.id,
      studentId: score.studentId,
      nickname: score.nickname || '',
      rank: index + 1,
      points,
    };
  });
}

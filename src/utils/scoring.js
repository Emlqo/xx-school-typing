import { GAME_RULES } from '../constants/gameRules.js';

export function calculateTypingScore({ word, combo, pointWeight, boosterActive }) {
  const baseScore = word.length * GAME_RULES.baseCharScore;
  const effectiveCombo = Math.min(combo, GAME_RULES.maxComboBonus);
  const comboBonus = effectiveCombo * word.length * GAME_RULES.comboBonusPerChar;
  const lengthBonus = word.includes(' ')
    ? GAME_RULES.sentenceLengthBonus
    : word.length > GAME_RULES.longWordThreshold
      ? GAME_RULES.longWordLengthBonus
      : 0;
  let earnedScore = (baseScore + comboBonus + lengthBonus) * (pointWeight || 1.0);

  if (boosterActive) {
    earnedScore *= GAME_RULES.boosterMultiplier;
  }

  return Math.floor(earnedScore);
}

export function calculateQuizScore({ pointWeight, boosterActive }) {
  let earnedScore = GAME_RULES.quizCorrectBaseScore * (pointWeight || 1.0);

  if (boosterActive) {
    earnedScore *= GAME_RULES.boosterMultiplier;
  }

  return Math.floor(earnedScore);
}

export function getQuizWrongPenalty() {
  return GAME_RULES.quizWrongPenalty;
}

export function calculateCpm({ chars, seconds }) {
  const minutes = seconds / 60;
  return minutes > 0 ? Math.round(chars / minutes) : 0;
}

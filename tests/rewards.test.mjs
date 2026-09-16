import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateRewardPoints, calculateRankRewards } from '../src/utils/rewards.js';

test('reduced quiz and record rewards preserve eligibility and best score', () => {
  const reward = calculateRewardPoints({ score: 1200, previousBestScore: 1000, quizCorrectCount: 5, includeGameComplete: false });
  assert.equal(reward.quizPoints, 10);
  assert.equal(reward.bestScoreBonus, 6);
  assert.equal(reward.growthBonus, 6);
  assert.equal(reward.totalEarned, 22);
  assert.equal(reward.nextBestScore, 1200);
  const unchanged = calculateRewardPoints({ score: 900, previousBestScore: 1000, includeGameComplete: false });
  assert.equal(unchanged.totalEarned, 0);
  assert.equal(unchanged.nextBestScore, 1000);
  assert.equal(calculateRewardPoints({ score: 1090, previousBestScore: 1000 }).growthBonus, 0);
  assert.equal(calculateRewardPoints({ score: 1100, previousBestScore: 1000 }).growthBonus, 6);
});

test('rank tiers are reduced while minimum completion reward remains one', () => {
  const scores = Array.from({ length: 20 }, (_, i) => ({ id: String(i), studentId: String(i), entryType: 'class', score: 200 - i }));
  assert.deepEqual(calculateRankRewards(scores).map(x => x.points), [6, 5, 3, 2, 2, 2, ...Array(14).fill(1)]);
  assert.deepEqual(calculateRankRewards([{ entryType: 'guest' }, { entryType: 'class', studentId: 'a', gameType: 'subway' }]), []);
});

test('server uses shared reward constants rather than separate payout values', () => {
  const api = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
  assert.match(api, /import \{ REWARD_RULES \} from '\.\.\/src\/constants\/rewards.js'/);
  assert.doesNotMatch(api, /const REWARD_RULES\s*=/);
});

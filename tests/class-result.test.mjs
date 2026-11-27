import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { REWARD_RULES } from '../src/constants/rewards.js';
import { calculateRankRewards } from '../src/utils/rewards.js';
import { CLASS_SCOREBOARD_SETTLE_MS, getClassScoreboardEnd, selectLeaderboardScores } from '../src/utils/classScoreboard.js';
import {
  clearStudentDirectoryCache,
  getCachedStudentDirectory,
  STUDENT_HOME_CACHE_AGE_MS,
  updateCachedStudentDirectory,
} from '../src/services/studentDirectoryCache.js';

const source = readFileSync(new URL('../api/student-security.js', import.meta.url), 'utf8');
const handler = source.slice(
  source.indexOf('function classScoreboardRow('),
  source.indexOf('async function recordPracticeCompletion('),
);
const profileHelper = source.slice(
  source.indexOf('function safeProfile('),
  source.indexOf('async function safeLoginProfile('),
);
const finalScore = { score: 1800, cpm: 210, correctChars: 350, quizCorrectCount: 3 };

function fixture(size = 1) {
  const docs = new Map();
  docs.set('rooms/room', {
    classId: 'class', entryType: 'class', status: 'playing', mode: 'ko',
    expiresAt: Date.now() - CLASS_SCOREBOARD_SETTLE_MS - 1000,
  });
  for (let i = 0; i < size; i += 1) {
    docs.set(`scores/score-${i}`, {
      userId: `user-${i}`, studentId: `student-${i}`, classId: 'class',
      className: '1학년 7반', entryType: 'class', gameType: 'typing', roomId: 'room',
      score: 1000, quizCorrectCount: 1, typeforgeGear: { type: 'gpu', level: 20 },
    });
    docs.set(`sessions/user-${i}`, { studentId: `student-${i}`, classId: 'class', expiresAt: Date.now() + 60000 });
    docs.set(`students/student-${i}`, { classId: 'class', name: `학생 ${i}`, active: true, bestScore: 1000, totalPoints: 50, studentPin: '1234' });
  }

  const reads = [];
  const writes = [];
  const snapshot = (ref) => ({
    ref, id: ref.split('/').at(-1), exists: docs.has(ref),
    data: () => docs.has(ref) ? structuredClone(docs.get(ref)) : undefined,
  });
  const collection = (path, filters = []) => ({
    path, filters,
    doc: (id) => `${path}/${id}`,
    where: (field, op, value) => {
      assert.equal(op, '==');
      return collection(path, [...filters, [field, value]]);
    },
  });
  const context = {
    REWARD_RULES, CLASS_SCOREBOARD_SETTLE_MS, getClassScoreboardEnd, selectLeaderboardScores, calculateRankRewards,
    getKoreanDateKey: () => '2026-11-25',
    getDuelDailyWinPoints: () => 0,
    ApiError: class extends Error {
      constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
      }
    },
    requireString: (value) => value,
    requireTeacher: (uid) => { if (uid !== 'teacher') throw new Error('teacher only'); },
    toMillis: (value) => Number(value || 0),
    FieldValue: { serverTimestamp: () => Date.now(), increment: (increment) => ({ increment }) },
    PATHS: { rooms: 'rooms', scores: 'scores', classScoreboards: 'scoreboards', studentSessions: 'sessions', classStudents: 'students' },
    publicCollection: collection,
    database: () => ({
      runTransaction: async (callback) => {
        const effects = [];
        const response = await callback({
          async get(path) {
            assert.equal(effects.length, 0, 'Firestore transaction reads precede writes');
            if (typeof path === 'string') {
              reads.push(path);
              return snapshot(path);
            }
            const found = [...docs.entries()].filter(([ref, data]) => (
              ref.startsWith(`${path.path}/`) && path.filters.every(([field, value]) => data[field] === value)
            ));
            if (found.length) reads.push(...found.map(([ref]) => ref));
            else reads.push(path.path);
            return { docs: found.map(([ref]) => snapshot(ref)) };
          },
          update(path, values) {
            effects.push([path, () => {
              const previous = docs.get(path);
              assert.ok(previous, `update requires an existing document: ${path}`);
              for (const [field, value] of Object.entries(values)) {
                previous[field] = typeof value?.increment === 'number' ? Number(previous[field] || 0) + value.increment : value;
              }
            }]);
          },
          set(path, values) { effects.push([path, () => docs.set(path, values)]); },
          delete(path) { effects.push([path, () => docs.delete(path)]); },
        });
        for (const [path, apply] of effects) {
          writes.push(path);
          apply();
        }
        return response;
      },
    }),
  };
  runInNewContext(`${profileHelper}\n${handler}`, context);
  const finish = (i, payload, owner = `user-${i}`) => (
    context.finalizeStudentReward(owner, { scoreId: `score-${i}`, finalScore: payload })
  );
  const loadScoreboard = (uid = 'teacher') => context.getFinishedClassScoreboard(uid, { roomId: 'room' });
  const rankRewards = () => context.finalizeFinishedClassRankRewards('teacher', { roomId: 'room' });
  const removeRoom = () => context.removeClassRoomScoreboard('teacher', { roomId: 'room', excludeScores: true });
  return { docs, reads, writes, finish, loadScoreboard, rankRewards, removeRoom };
}

test('30 simultaneous class results check for an archive and save in 120 reads and 60 writes', async () => {
  const f = fixture(30);
  const expectedPoints = 3 * REWARD_RULES.quizCorrectPoints + REWARD_RULES.bestScoreBonus + REWARD_RULES.growthBonus;
  const results = await Promise.all(Array.from({ length: 30 }, (_, i) => (
    f.finish(i, { ...finalScore, classId: 'ignored', rewardGranted: false })
  )));
  assert.equal(f.reads.length, 120);
  assert.equal(f.writes.length, 60);
  for (const [i, { profile, reward }] of results.entries()) {
    assert.equal(reward.totalEarned, expectedPoints);
    assert.equal(profile.totalPoints, 50 + expectedPoints);
    assert.equal(profile.bestScore, 1800);
    assert.equal(profile.className, '1학년 7반');
    assert.equal(profile.studentPin, undefined);
    const storedScore = f.docs.get(`scores/score-${i}`);
    assert.equal(storedScore.score, 1800);
    assert.equal(storedScore.quizCorrectCount, 3);
    assert.equal(storedScore.rewardGranted, true);
    assert.equal(storedScore.classId, 'class');
    assert.equal(storedScore.typeforgeGear.level, 20);
  }

  const retried = await f.finish(0, { ...finalScore, score: 10000 });
  assert.equal(retried.reward.totalEarned, expectedPoints);
  assert.equal(retried.profile.totalPoints, 50 + expectedPoints);
  assert.equal(f.docs.get('scores/score-0').score, 1800);
  assert.equal(f.writes.length, 60);
});

test('a finished classroom and attendance are archived once and 30 scores reopen in one document read', async () => {
  const f = fixture(30);
  const room = f.docs.get('rooms/room');
  const endsAt = room.expiresAt;
  room.expiresAt = Date.now() + 2000;
  await assert.rejects(f.loadScoreboard('user-0'), /teacher only/);
  assert.equal(f.reads.length, 0);
  await assert.rejects(f.loadScoreboard(), { code: 'api/scoreboard-pending' });
  assert.deepEqual(f.writes, []);
  room.expiresAt = endsAt;

  f.reads.length = 0;
  const archived = await f.loadScoreboard();
  assert.equal(archived.scores.length, 30);
  assert.equal(archived.students.length, 30);
  assert.equal(archived.scores[0].typeforgeGear.level, 20);
  assert.equal(archived.students[0].studentPin, undefined);
  assert.equal(f.reads.length, 62);
  assert.deepEqual(f.writes, ['scoreboards/room']);

  f.reads.length = 0;
  const reopened = await f.loadScoreboard();
  assert.equal(reopened.scores.length, 30);
  assert.deepEqual(f.reads, ['scoreboards/room']);
  assert.deepEqual(f.writes, ['scoreboards/room']);
});

test('late submissions update the archive and rank rewards use the refreshed results without rereading score rows', async () => {
  const f = fixture(2);
  await f.loadScoreboard();
  await f.finish(1, finalScore);
  const updated = await f.loadScoreboard();
  assert.equal(updated.scores.find((score) => score.studentId === 'student-1').score, 1800);
  assert.equal(updated.scores.length, 2);
  f.reads.length = 0;
  const { rewarded } = await f.rankRewards();
  assert.equal(rewarded, 2);
  assert.equal(f.docs.get('scores/score-1').rank, 1);
  assert.deepEqual(f.reads, ['rooms/room', 'scoreboards/room']);
  await assert.rejects(f.rankRewards(), { code: 'api/already-exists' });
  await f.finish(0, finalScore);
  const score = f.docs.get('scores/score-0');
  assert.equal(score.rewardEarned, score.rankRewardPoints + score.rewardBreakdown.totalEarned);

  await f.removeRoom();
  assert.equal(f.docs.has('scoreboards/room'), false);
  assert.equal(f.docs.get('scores/score-0').excludedFromHallOfFame, true);
  await assert.rejects(f.loadScoreboard(), { code: 'api/not-found' });
});

test('older clients can finalize a saved score and a zero-reward result does not rewrite the profile', async () => {
  const legacy = fixture();
  const response = await legacy.finish(0);
  assert.equal(response.reward.totalEarned, REWARD_RULES.quizCorrectPoints);
  assert.equal(legacy.docs.get('scores/score-0').score, 1000);

  const zero = fixture();
  const noReward = await zero.finish(0, { ...finalScore, score: -200, quizCorrectCount: 0 });
  assert.equal(noReward.reward.totalEarned, 0);
  assert.equal(noReward.profile.bestScore, 1000);
  assert.equal(zero.docs.get('scores/score-0').score, -200);
  assert.deepEqual(zero.writes, ['scores/score-0']);
});

test('invalid, expired, disqualified, and cross-class requests never save a result', async () => {
  const f = fixture();
  await assert.rejects(f.finish(0, { ...finalScore, cpm: -1 }), { status: 400 });
  assert.equal(f.reads.length, 0);
  await assert.rejects(f.finish(0, finalScore, 'other'), { status: 403 });

  const score = f.docs.get('scores/score-0');
  const session = f.docs.get('sessions/user-0');
  score.screenExitDetected = true;
  await assert.rejects(f.finish(0, finalScore), { status: 403 });
  score.screenExitDetected = false;
  session.classId = 'different';
  await assert.rejects(f.finish(0, finalScore), { status: 403 });
  session.classId = 'class';
  session.expiresAt = 0;
  await assert.rejects(f.finish(0, finalScore), { status: 403 });
  assert.deepEqual(f.writes, []);
});

test('quiz OFF stores zero quiz answers and pays no quiz reward without reading the room', async () => {
  const f = fixture();
  const record = f.docs.get('scores/score-0');
  record.quizEnabled = false;
  await f.loadScoreboard();
  f.reads.length = 0;
  const { reward } = await f.finish(0, finalScore);
  assert.equal(reward.quizPoints, 0);
  assert.equal(reward.bestScoreBonus, REWARD_RULES.bestScoreBonus);
  assert.equal(record.quizCorrectCount, 0);
  assert.equal(f.docs.get('scoreboards/room').scores[0].quizCorrectCount, 0);
  assert.equal(f.reads.length, 4);
});

test('returning home reuses student-scoped data and an explicit refresh coalesces pending reads', async () => {
  const key = 'user:home:student:gear';
  const options = { maxAge: STUDENT_HOME_CACHE_AGE_MS };
  let requests = 0;
  const load = async () => ++requests;
  const first = getCachedStudentDirectory(key, load, options);
  assert.equal(getCachedStudentDirectory(key, load, options), first);
  assert.equal(await first, 1);
  assert.equal(await getCachedStudentDirectory(key, load, options), 1);
  updateCachedStudentDirectory(key, () => 9);
  assert.equal(await getCachedStudentDirectory(key, load, options), 9);

  const refresh = getCachedStudentDirectory(key, load, { ...options, refresh: true });
  assert.equal(getCachedStudentDirectory(key, load, options), refresh);
  assert.equal(await refresh, 2);
  assert.equal(await getCachedStudentDirectory(key, load, { maxAge: 0 }), 3);

  const pending = getCachedStudentDirectory(key, load, { ...options, refresh: true });
  clearStudentDirectoryCache('user');
  assert.equal(await pending, 4);
  assert.equal(await getCachedStudentDirectory(key, load, options), 5);
  clearStudentDirectoryCache();
});

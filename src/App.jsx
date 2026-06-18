import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { APP_ID, GAME_RULES } from './constants/gameRules.js';
import { isTeacherUser, TEACHER_IDLE_TIMEOUT_MS, TEACHER_UID } from './constants/admin.js';
import { KOREAN_WORDS, ENGLISH_WORDS } from './constants/words.js';
import { getCosmeticById } from './constants/cosmetics.js';
import { FIRESTORE_PATHS } from './constants/firestorePaths.js';
import { db, signInTeacherWithGoogle, signOutFirebaseUser } from './services/firebaseClient.js';
import {
  buyStudentShopItem,
  equipStudentCosmetic,
  finalizeStudentReward,
  joinClassGame,
  joinGuestGame,
  setInitialStudentPin,
  syncPublicClassRoster,
  verifyStudentPin,
} from './services/studentSecurityApi.js';
import { getPublicCollection, getPublicDoc } from './utils/firestoreRefs.js';
import { calculateHallOfFame, getMonthKey } from './utils/hallOfFame.js';
import { calculateCpm, calculateQuizScore, calculateTypingScore, getQuizWrongPenalty } from './utils/scoring.js';
import { formatTime } from './utils/format.js';
import { normalizeClassStudent } from './utils/classStudents.js';
import { calculateRankRewards, getDefaultRewardState } from './utils/rewards.js';
import useAnnouncements from './hooks/useAnnouncements.js';
import useClasses from './hooks/useClasses.js';
import useClassStudents from './hooks/useClassStudents.js';
import useFirebaseAuth from './hooks/useFirebaseAuth.js';
import useMonthlyScores from './hooks/useMonthlyScores.js';
import useOpenClassRooms from './hooks/useOpenClassRooms.js';
import useQuizzes from './hooks/useQuizzes.js';
import useRoomScores from './hooks/useRoomScores.js';
import useScores from './hooks/useScores.js';
import useShopItems from './hooks/useShopItems.js';
import useScoreSyncRequest from './hooks/useScoreSyncRequest.js';
import useStudentRoomWatcher from './hooks/useStudentRoomWatcher.js';
import useTeacherRooms from './hooks/useTeacherRooms.js';
import useWords from './hooks/useWords.js';
import LoginView from './components/views/LoginView.jsx';
import PlayingView from './components/views/PlayingView.jsx';
import ResultView from './components/views/ResultView.jsx';
import StudentLobbyView from './components/views/StudentLobbyView.jsx';
import TeacherDashboardView from './components/views/TeacherDashboardView.jsx';
import TeacherLoginView from './components/views/TeacherLoginView.jsx';
import WaitingView from './components/views/WaitingView.jsx';

export default function App() {
  const [view, setView] = useState('login');
  const [pwdError, setPwdError] = useState('');
  const [teacherLoginLoading, setTeacherLoginLoading] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [currentScoreDocId, setCurrentScoreDocId] = useState(null);
  const [myRoomData, setMyRoomData] = useState(null);
  const [score, setScore] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [gameDuration, setGameDuration] = useState(300);
  const [timeLeft, setTimeLeft] = useState(300);
  const [gameMode, setGameMode] = useState('mixed');
  const [currentWord, setCurrentWord] = useState('풍양중학교');
  const [inputValue, setInputValue] = useState('');
  const [combo, setCombo] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  const [isError, setIsError] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [boosterAvailable, setBoosterAvailable] = useState(true);
  const [boosterActive, setBoosterActive] = useState(false);
  const [boosterTimeLeft, setBoosterTimeLeft] = useState(0);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [newRoomName, setNewRoomName] = useState('');
  const [roomMode, setRoomMode] = useState('ko');
  const [roomDuration, setRoomDuration] = useState('300');
  const [viewingRoomId, setViewingRoomId] = useState('');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annIsAlert, setAnnIsAlert] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [quizQuestion, setQuizQuestion] = useState('');
  const [quizOptions, setQuizOptions] = useState(['', '', '', '']);
  const [quizAnswer, setQuizAnswer] = useState(0);
  const [wordText, setWordText] = useState('');
  const [wordLanguage, setWordLanguage] = useState('ko');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classGrade, setClassGrade] = useState('1');
  const [classNumber, setClassNumber] = useState('1');
  const [classRoomMode, setClassRoomMode] = useState('ko');
  const [classRoomDuration, setClassRoomDuration] = useState('300');
  const [studentBulkText, setStudentBulkText] = useState('');
  const [selectedOpenClassRoomId, setSelectedOpenClassRoomId] = useState('');
  const [hallOfFameMonthKey, setHallOfFameMonthKey] = useState(() => getMonthKey(new Date()));
  const [lastReward, setLastReward] = useState(() => getDefaultRewardState());
  const [localRooms] = useState([]);
  const [localScores, setLocalScores] = useState([]);
  const [localAnnouncements] = useState([]);
  const [localQuizzes] = useState([]);

  const inputRef = useRef(null);
  const audioCtxRef = useRef(null);
  const pendingQuizzesRef = useRef([]);
  const wordCountRef = useRef(0);
  const gameInfoRef = useRef({ elapsed: 0 });
  const latestScoreRef = useRef(0);
  const latestCharsRef = useRef(0);
  const latestQuizCorrectCountRef = useRef(0);
  const lastProcessedSyncRef = useRef(0);
  const lastSyncedScoreRef = useRef(0);
  const isEndingRef = useRef(false);
  const autoAnnouncementShownRef = useRef(false);

  const { user, authReady } = useFirebaseAuth();
  const teacherAuthorized = useMemo(() => isTeacherUser(user), [user]);
  const scopedUser = view === 'teacher' && !teacherAuthorized ? null : user;
  const firestoreReadsEnabled = !(view === 'playing' && isPracticeMode);
  const { announcements: subscribedAnnouncements } = useAnnouncements({ user: scopedUser, enabled: firestoreReadsEnabled });
  const { quizzes: subscribedQuizzes } = useQuizzes({ user: scopedUser, enabled: firestoreReadsEnabled });
  const { rooms: subscribedRooms } = useTeacherRooms({ user: scopedUser, view, enabled: firestoreReadsEnabled });
  const { words } = useWords({ user: scopedUser, view, isPracticeMode, enabled: firestoreReadsEnabled });
  const { classes } = useClasses({ user: scopedUser, view, isPracticeMode, enabled: firestoreReadsEnabled });
  const { openClassRooms } = useOpenClassRooms({ user: scopedUser, view, isPracticeMode, enabled: firestoreReadsEnabled });
  const selectedOpenClassRoom = useMemo(
    () => openClassRooms.find((room) => room.id === selectedOpenClassRoomId) || null,
    [openClassRooms, selectedOpenClassRoomId],
  );
  const { students: classStudents } = useClassStudents({
    user: scopedUser,
    view,
    classId: view === 'studentLobby' ? selectedOpenClassRoom?.classId || '' : selectedClassId,
    isPracticeMode,
    enabled: firestoreReadsEnabled,
  });
  const { roomScores: selectedOpenClassRoomScores } = useRoomScores({
    user: scopedUser,
    view,
    roomId: selectedOpenClassRoomId,
    isPracticeMode,
    enabled: firestoreReadsEnabled,
  });
  const shopClassId = view === 'teacher'
    ? selectedClassId
    : selectedOpenClassRoom?.classId || '';
  const { shopItems } = useShopItems({
    user: scopedUser,
    view,
    classId: shopClassId,
    isPracticeMode,
    enabled: firestoreReadsEnabled,
  });
  const { scores: subscribedScores } = useScores({
    user: scopedUser,
    view,
    viewingRoomId,
    currentScoreDocId,
    enabled: firestoreReadsEnabled || view === 'teacher',
  });
  const {
    monthlyScores,
    savedHallOfFame,
    savedScoreCount,
    lastSavedAt: hallOfFameSavedAt,
    refreshMonthlyScores,
    isLoading: isHallOfFameLoading,
    error: hallOfFameError,
  } = useMonthlyScores({
    user: scopedUser,
    view,
    monthKey: hallOfFameMonthKey,
    isPracticeMode,
    enabled: firestoreReadsEnabled && view === 'teacher',
  });

  const announcements = useMemo(() => [...localAnnouncements, ...subscribedAnnouncements], [localAnnouncements, subscribedAnnouncements]);
  const quizzes = useMemo(() => [...localQuizzes, ...subscribedQuizzes], [localQuizzes, subscribedQuizzes]);
  const rooms = useMemo(() => [...localRooms, ...subscribedRooms], [localRooms, subscribedRooms]);
  const scores = useMemo(() => [...localScores, ...subscribedScores], [localScores, subscribedScores]);
  const enteredClassStudentIds = useMemo(
    () => selectedOpenClassRoomScores
      .filter((scoreItem) => scoreItem.studentId)
      .map((scoreItem) => scoreItem.studentId),
    [selectedOpenClassRoomScores],
  );
  const hallOfFame = useMemo(
    () => savedHallOfFame || calculateHallOfFame(monthlyScores),
    [monthlyScores, savedHallOfFame],
  );
  const customWordPools = useMemo(() => {
    const activeWords = words
      .filter((word) => word.active !== false)
      .map((word) => ({
        text: String(word.text || word.word || word.value || '').trim(),
        language: word.language,
      }))
      .filter((word) => word.text && (word.language === 'ko' || word.language === 'en'));

    return {
      ko: activeWords.filter((word) => word.language === 'ko').map((word) => word.text),
      en: activeWords.filter((word) => word.language === 'en').map((word) => word.text),
    };
  }, [words]);

  const getTimestampMillis = (value) => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
  };

  const getRemainingSeconds = (roomData) => {
    if (roomData.status !== 'playing') return Number(roomData.duration || 300);
    const expiresAt = getTimestampMillis(roomData.expiresAt);
    if (!expiresAt) return Number(roomData.duration || 300);
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  };

  const createRoomCode = () => {
    const usedCodes = new Set(rooms.map((room) => room.roomCode));
    let nextCode = '';

    do {
      nextCode = String(Math.floor(1000 + Math.random() * 9000));
    } while (usedCodes.has(nextCode));

    return nextCode;
  };

  const createStudentPin = () => String(Math.floor(1000 + Math.random() * 9000));

  const createLocalScoreSnapshot = (id, data) => {
    setLocalScores((prevScores) => [
      { id, ...data },
      ...prevScores.filter((item) => item.id !== id),
    ]);
  };

  const playComboSound = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }

      const oscillator = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, audioCtxRef.current.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(990, audioCtxRef.current.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.15);
      oscillator.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      oscillator.start();
      oscillator.stop(audioCtxRef.current.currentTime + 0.15);
    } catch (error) {
      console.warn('콤보 사운드를 재생하지 못했습니다.', error);
    }
  }, []);

  const pickRandomWord = useCallback((mode = gameMode, options = {}) => {
    const practiceMode = options.practiceMode ?? isPracticeMode;

    if (
      pendingQuizzesRef.current.length > 0
      && wordCountRef.current > 0
      && wordCountRef.current >= GAME_RULES.quizIntervalWords
    ) {
      const [nextQuiz, ...restQuizzes] = pendingQuizzesRef.current;
      pendingQuizzesRef.current = restQuizzes;
      setCurrentQuiz(nextQuiz);
      setCurrentWord('');
      wordCountRef.current = 0;
      return;
    }

    const koreanWords = practiceMode ? KOREAN_WORDS : [...KOREAN_WORDS, ...customWordPools.ko];
    const englishWords = practiceMode ? ENGLISH_WORDS : [...ENGLISH_WORDS, ...customWordPools.en];
    const sourceWords = mode === 'en'
      ? englishWords
      : mode === 'mixed'
        ? [...koreanWords, ...englishWords]
        : koreanWords;
    const nextWord = sourceWords[Math.floor(Math.random() * sourceWords.length)] || '풍양중학교';
    setCurrentQuiz(null);
    setCurrentWord(nextWord);
    setInputValue('');
  }, [customWordPools, gameMode, isPracticeMode]);

  const resetPlayingState = useCallback(({ practiceMode, duration = 300, mode = 'mixed' }) => {
    setScore(0);
    setCorrectChars(0);
    setQuizCorrectCount(0);
    setGameDuration(duration);
    setTimeLeft(duration);
    setGameMode(mode);
    setCurrentWord('');
    setInputValue('');
    setCombo(0);
    setShowSuccess(false);
    setLastEarned(0);
    setIsError(false);
    setCurrentQuiz(null);
    setBoosterAvailable(true);
    setBoosterActive(false);
    setBoosterTimeLeft(0);
    setIsPracticeMode(practiceMode);
    setLastReward(getDefaultRewardState());
    pendingQuizzesRef.current = [];
    wordCountRef.current = 0;
    gameInfoRef.current = { elapsed: 0 };
    latestScoreRef.current = 0;
    latestCharsRef.current = 0;
    latestQuizCorrectCountRef.current = 0;
    lastProcessedSyncRef.current = 0;
    lastSyncedScoreRef.current = 0;
    isEndingRef.current = false;
  }, []);

  const restoreScoreState = (scoreData = {}) => {
    const restoredScore = Number(scoreData.score || 0);
    const restoredChars = Number(scoreData.correctChars || 0);
    const restoredQuizCorrectCount = Number(scoreData.quizCorrectCount || 0);

    setScore(restoredScore);
    setCorrectChars(restoredChars);
    setQuizCorrectCount(restoredQuizCorrectCount);
    latestScoreRef.current = restoredScore;
    latestCharsRef.current = restoredChars;
    latestQuizCorrectCountRef.current = restoredQuizCorrectCount;
    lastSyncedScoreRef.current = restoredScore;
  };

  const startPractice = useCallback(() => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    setSelectedRoomId('');
    setCurrentScoreDocId(null);
    setMyRoomData(null);
    resetPlayingState({ practiceMode: true, duration: 300, mode: 'mixed' });
    pendingQuizzesRef.current = [...quizzes].sort(() => Math.random() - 0.5);
    wordCountRef.current = 0;
    pickRandomWord('mixed', { practiceMode: true });
    setView('playing');
  }, [nickname, pickRandomWord, quizzes, resetPlayingState]);

  const handleJoinRoom = useCallback(async () => {
    const studentName = nickname.trim();

    if (!studentName) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    if (roomCodeInput.length !== 4) {
      alert('4자리 입장 코드를 입력해주세요.');
      return;
    }

    if (!user || !db) {
      alert('서버 접속 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      const joined = await joinGuestGame(roomCodeInput, studentName);
      const roomData = joined.room;
      const duration = Number(roomData.duration || 300);
      const remainingSeconds = getRemainingSeconds(roomData);
      const scoreData = joined.score;
      const scoreDocId = scoreData.id;

      const difficulty = scoreData?.difficulty || 'normal';
      const nextGameMode = difficulty === 'hell' ? 'en' : difficulty === 'hard' ? 'mixed' : roomData.mode || 'ko';

      setSelectedRoomId(roomData.id);
      setMyRoomData(roomData);
      setCurrentScoreDocId(scoreDocId);
      resetPlayingState({ practiceMode: false, duration, mode: nextGameMode });
      restoreScoreState(scoreData);
      createLocalScoreSnapshot(scoreDocId, scoreData);

      if (roomData.status === 'playing') {
        setTimeLeft(remainingSeconds);
        gameInfoRef.current.elapsed = Math.max(0, duration - remainingSeconds);
        pendingQuizzesRef.current = [...quizzes].sort(() => Math.random() - 0.5);
        wordCountRef.current = 0;
        pickRandomWord(nextGameMode, { practiceMode: false });
        setView('playing');
        return;
      }

      setView('waiting');
    } catch (error) {
      console.error(error);
      alert('방 입장 중 오류가 발생했습니다.');
    }
  }, [nickname, pickRandomWord, quizzes, resetPlayingState, roomCodeInput, user]);

  const handleJoinClassStudent = useCallback(async (student) => {
    if (!selectedOpenClassRoom?.id || !student?.id) {
      alert('입장할 학급과 이름을 선택해주세요.');
      return;
    }

    if (!user || !db) {
      alert('서버 접속 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      const roomData = selectedOpenClassRoom;
      const remainingSeconds = getRemainingSeconds(roomData);

      if (roomData.status === 'playing' && remainingSeconds <= 0) {
        alert('이미 종료된 게임입니다.');
        return;
      }

      const duration = Number(roomData.duration || 300);
      const joined = await joinClassGame(roomData.id, student.id);
      const normalizedStudent = normalizeClassStudent({ ...student, ...joined.profile });
      const scoreData = joined.score;
      const scoreDocId = scoreData.id;

      const difficulty = scoreData?.difficulty || 'normal';
      const nextGameMode = difficulty === 'hell' ? 'en' : difficulty === 'hard' ? 'mixed' : roomData.mode || 'ko';

      setNickname(student.name);
      setSelectedRoomId(roomData.id);
      setMyRoomData(roomData);
      setCurrentScoreDocId(scoreDocId);
      resetPlayingState({ practiceMode: false, duration, mode: nextGameMode });
      restoreScoreState(scoreData);
      createLocalScoreSnapshot(scoreDocId, scoreData);

      if (roomData.status === 'playing') {
        setTimeLeft(remainingSeconds);
        gameInfoRef.current.elapsed = Math.max(0, duration - remainingSeconds);
        pendingQuizzesRef.current = [...quizzes].sort(() => Math.random() - 0.5);
        wordCountRef.current = 0;
        pickRandomWord(nextGameMode, { practiceMode: false });
        setView('playing');
        return;
      }

      setView('waiting');
    } catch (error) {
      console.error(error);
      alert('학급 입장 중 오류가 발생했습니다.');
    }
  }, [pickRandomWord, quizzes, resetPlayingState, selectedOpenClassRoom, user]);

  const endGame = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setBoosterActive(false);
    setView('result');

    if (isPracticeMode || !currentScoreDocId || !db) return;

    try {
      const elapsedSeconds = gameInfoRef.current.elapsed || gameDuration || 1;
      const finalCpm = calculateCpm({ chars: latestCharsRef.current, seconds: elapsedSeconds });
      const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, currentScoreDocId);
      const currentScoreInfo = scores.find((item) => item.id === currentScoreDocId) || {};

      await updateDoc(scoreRef, {
        score: latestScoreRef.current,
        cpm: finalCpm,
        correctChars: latestCharsRef.current,
        quizCorrectCount: latestQuizCorrectCountRef.current,
        updatedAt: serverTimestamp(),
      });
      lastSyncedScoreRef.current = latestScoreRef.current;

      if (
        currentScoreInfo.entryType === 'class'
        && currentScoreInfo.classId
        && currentScoreInfo.studentId
        && currentScoreInfo.rewardGranted !== true
      ) {
        const { reward } = await finalizeStudentReward(currentScoreDocId);
        setLastReward(reward);
        setLocalScores((prevScores) => prevScores.map((scoreItem) => (
          scoreItem.id === currentScoreDocId
            ? {
              ...scoreItem,
              score: latestScoreRef.current,
              cpm: finalCpm,
              correctChars: latestCharsRef.current,
              quizCorrectCount: latestQuizCorrectCountRef.current,
              rewardGranted: true,
              rewardEarned: reward.totalEarned,
              rewardBreakdown: reward,
            }
            : scoreItem
        )));
      }
    } catch (error) {
      console.error(error);
    }
  }, [currentScoreDocId, gameDuration, isPracticeMode, scores]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Backspace') {
      setCombo(0);
      return;
    }

    const shouldSubmit = event.key === 'Enter' || (event.key === ' ' && !currentWord.includes(' '));
    if (!shouldSubmit || currentQuiz || !currentWord) return;

    event.preventDefault();

    if (inputValue.trim() === currentWord) {
      const myInfo = scores.find((item) => item.id === currentScoreDocId) || {};
      const nextCombo = combo + 1;
      const earned = calculateTypingScore({
        word: currentWord,
        combo: nextCombo,
        pointWeight: myInfo.pointWeight || 1.0,
        boosterActive,
      });

      setScore((prevScore) => prevScore + earned);
      setCorrectChars((prevChars) => prevChars + currentWord.length);
      setCombo(nextCombo);
      setLastEarned(earned);
      setShowSuccess(true);
      setInputValue('');
      setIsError(false);
      playComboSound();
      window.setTimeout(() => setShowSuccess(false), 700);
      wordCountRef.current += 1;
      pickRandomWord(gameMode);
      return;
    }

    setCombo(0);
    setIsError(true);
  }, [boosterActive, combo, currentQuiz, currentScoreDocId, currentWord, gameMode, inputValue, pickRandomWord, playComboSound, scores]);

  const handleQuizAnswer = useCallback((answerIndex) => {
    if (!currentQuiz) return;

    const myInfo = scores.find((item) => item.id === currentScoreDocId) || {};

    if (answerIndex === currentQuiz.answer) {
      const earned = calculateQuizScore({
        pointWeight: myInfo.pointWeight || 1.0,
        boosterActive,
      });
      setScore((prevScore) => prevScore + earned);
      setQuizCorrectCount((prevCount) => prevCount + 1);
      setLastEarned(earned);
      setShowSuccess(true);
      setLocalScores((prevScores) => prevScores.map((item) => (
        item.id === currentScoreDocId
          ? { ...item, quizCorrectCount: (item.quizCorrectCount || 0) + 1 }
          : item
      )));
      window.setTimeout(() => setShowSuccess(false), 700);
    } else {
      const penalty = getQuizWrongPenalty();
      setScore((prevScore) => prevScore + penalty);
      setCombo(0);
      setLastEarned(penalty);
      setIsError(true);
    }

    setCurrentQuiz(null);
    pickRandomWord(gameMode);
  }, [boosterActive, currentQuiz, currentScoreDocId, gameMode, pickRandomWord, scores]);

  const activateBooster = useCallback(() => {
    if (!boosterAvailable || boosterActive) return;

    const myInfo = scores.find((item) => item.id === currentScoreDocId) || {};
    if (myInfo.boosterEnabled === false) {
      alert('선생님이 부스터 사용을 비활성화했습니다.');
      return;
    }

    setBoosterActive(true);
    setBoosterAvailable(false);
    setBoosterTimeLeft(GAME_RULES.boosterDuration);
  }, [boosterActive, boosterAvailable, currentScoreDocId, scores]);

  useStudentRoomWatcher({
    user,
    view,
    selectedRoomId,
    setView,
    setMyRoomData,
    currentScoreDocId,
    scores,
    quizzes,
    pendingQuizzesRef,
    wordCountRef,
    setGameMode,
    pickRandomWord,
    enabled: firestoreReadsEnabled,
  });

  useScoreSyncRequest({
    user,
    view,
    isPracticeMode,
    myRoomData,
    currentScoreDocId,
    score,
    correctChars,
    quizCorrectCount,
    gameDuration,
    gameInfoRef,
    lastProcessedSyncRef,
    lastSyncedScoreRef,
    enabled: true,
  });

  useEffect(() => {
    const clock = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (autoAnnouncementShownRef.current) return;
    if (view !== 'login') return;
    if (!announcements.some((announcement) => announcement.isAlert === true)) return;

    autoAnnouncementShownRef.current = true;
    setShowAnnouncementModal(true);
  }, [announcements, view]);

  useEffect(() => {
    latestScoreRef.current = score;
    latestCharsRef.current = correctChars;
    latestQuizCorrectCountRef.current = quizCorrectCount;
  }, [correctChars, quizCorrectCount, score]);

  useEffect(() => {
    if (view !== 'playing') return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((prevTimeLeft) => {
        const nextTimeLeft = Math.max(prevTimeLeft - 1, 0);
        gameInfoRef.current.elapsed = gameDuration - nextTimeLeft;
        return nextTimeLeft;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [gameDuration, view]);

  useEffect(() => {
    if (view === 'playing' && timeLeft <= 0) {
      endGame();
    }
  }, [endGame, timeLeft, view]);

  useEffect(() => {
    if (!boosterActive) return undefined;

    const timer = window.setInterval(() => {
      setBoosterTimeLeft((prevTimeLeft) => {
        const nextTimeLeft = Math.max(prevTimeLeft - 1, 0);
        if (nextTimeLeft === 0) {
          setBoosterActive(false);
        }
        return nextTimeLeft;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [boosterActive]);

  useEffect(() => {
    if (!selectedOpenClassRoomId) return;
    if (openClassRooms.some((room) => room.id === selectedOpenClassRoomId)) return;
    setSelectedOpenClassRoomId('');
  }, [openClassRooms, selectedOpenClassRoomId]);

  useEffect(() => {
    if (view !== 'teacher' || !teacherAuthorized) return undefined;

    let logoutTimer;
    const resetIdleTimer = () => {
      window.clearTimeout(logoutTimer);
      logoutTimer = window.setTimeout(async () => {
        await signOutFirebaseUser().catch((error) => console.error(error));
        setView('login');
        setPwdError('관리자 세션이 만료되었습니다. 다시 로그인해주세요.');
      }, TEACHER_IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['pointerdown', 'keydown', 'touchstart'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer));
    resetIdleTimer();

    return () => {
      window.clearTimeout(logoutTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, [teacherAuthorized, view]);

  const requireTeacherAccess = useCallback(() => {
    if (teacherAuthorized) return true;
    window.alert('관리자가 아닌데 누구인가요? 관리자 계정으로 다시 로그인해 주세요.');
    setPwdError('관리자 세션이 없거나 만료되었습니다. Google 계정으로 다시 로그인해주세요.');
    setView('teacherLogin');
    return false;
  }, [teacherAuthorized]);

  const handleTeacherSubmit = async () => {
    if (teacherAuthorized) {
      setView('teacher');
      setPwdError('');
      return;
    }

    setTeacherLoginLoading(true);
    setPwdError('');

    try {
      const googleUser = await signInTeacherWithGoogle();

      if (!TEACHER_UID) {
        setPwdError('관리자 UID가 아직 설정되지 않았습니다. 아래 UID를 설정한 뒤 다시 배포해주세요.');
        return;
      }

      if (isTeacherUser(googleUser)) {
        setView('teacher');
        setPwdError('');
        setIsPracticeMode(false);
        return;
      }

      await signOutFirebaseUser();
      setPwdError('등록되지 않은 Google 계정입니다. 관리자 계정으로 다시 로그인해주세요.');
    } catch (error) {
      console.error(error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        setPwdError('Google 로그인 중 오류가 발생했습니다. Firebase 인증 설정을 확인해주세요.');
      }
    } finally {
      setTeacherLoginLoading(false);
    }
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;

    const trimmedName = newRoomName.trim();
    if (!trimmedName) return;

    try {
      const durationSec = Number(roomDuration);
      const roomsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.rooms);
      const roomRef = await addDoc(roomsRef, {
        name: trimmedName,
        mode: roomMode,
        duration: durationSec,
        roomCode: createRoomCode(),
        status: 'waiting',
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      });

      setViewingRoomId(roomRef.id);
      setNewRoomName('');
    } catch (error) {
      console.error(error);
      alert('반 생성 중 오류가 발생했습니다.');
    }
  };

  const startRoomGame = async (roomId) => {
    if (!requireTeacherAccess()) return;
    const room = rooms.find((item) => item.id === roomId);
    const duration = Number(room?.duration || roomDuration || 300);

    try {
      const roomRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, roomId);
      await updateDoc(roomRef, {
        status: 'playing',
        expiresAt: Date.now() + duration * 1000,
      });
    } catch (error) {
      console.error(error);
      alert('게임 시작 중 오류가 발생했습니다.');
    }
  };

  const requestScoreSync = async (roomId) => {
    if (!requireTeacherAccess()) return;
    if (!roomId || roomId === 'all') {
      alert('특정 반을 선택한 뒤 실시간 점수를 가져올 수 있습니다.');
      return;
    }

    try {
      const roomRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, roomId);
      await updateDoc(roomRef, { syncRequestedAt: Date.now() });
    } catch (error) {
      console.error(error);
      alert('점수 수집 요청 중 오류가 발생했습니다.');
    }
  };

  const finalizeRankRewards = async (roomId) => {
    if (!requireTeacherAccess()) return;
    if (!roomId || roomId === 'all') return;

    const room = rooms.find((item) => item.id === roomId);
    if (room?.rewardFinalized === true) {
      alert('이미 순위 보상이 지급된 게임입니다.');
      return;
    }
    if (!window.confirm('현재 점수 순위로 포인트를 확정 지급할까요? 지급 후에는 다시 지급할 수 없습니다.')) return;

    const roomRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, roomId);
    let rewardClaimed = false;

    try {
      const scoresRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores);
      const scoreSnapshot = await getDocs(query(scoresRef, where('roomId', '==', roomId)));
      const roomScores = scoreSnapshot.docs.map((scoreDoc) => ({ id: scoreDoc.id, ...scoreDoc.data() }));
      const rankRewards = calculateRankRewards(roomScores);

      if (rankRewards.length === 0) {
        alert('순위 보상을 지급할 학급 학생 기록이 없습니다.');
        return;
      }

      await runTransaction(db, async (transaction) => {
        const roomSnapshot = await transaction.get(roomRef);
        if (!roomSnapshot.exists()) throw new Error('ROOM_NOT_FOUND');

        const roomData = roomSnapshot.data();
        if (roomData.rewardFinalized === true || roomData.rewardFinalizing === true) {
          throw new Error('REWARD_ALREADY_CLAIMED');
        }

        transaction.update(roomRef, {
          rewardFinalizing: true,
          rewardFinalizingAt: serverTimestamp(),
          rewardFinalizingBy: user?.uid || null,
        });
      });
      rewardClaimed = true;

      const batch = writeBatch(db);
      rankRewards.forEach((reward) => {
        const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, reward.studentId);
        const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, reward.scoreId);
        batch.update(studentRef, {
          totalPoints: increment(reward.points),
          updatedAt: serverTimestamp(),
        });
        batch.update(scoreRef, {
          rank: reward.rank,
          rankRewardPoints: reward.points,
          rankRewardGranted: true,
          rewardEarned: increment(reward.points),
          updatedAt: serverTimestamp(),
        });
      });

      batch.update(roomRef, {
        rewardFinalized: true,
        rewardFinalizing: false,
        rewardFinalizedAt: serverTimestamp(),
        rewardFinalizedBy: user?.uid || null,
      });
      await batch.commit();
      alert('순위 보상 지급이 완료되었습니다.');
    } catch (error) {
      console.error(error);
      if (rewardClaimed) {
        await updateDoc(roomRef, {
          rewardFinalizing: false,
          rewardFinalizingAt: null,
          rewardFinalizingBy: null,
        }).catch((unlockError) => console.error(unlockError));
      }
      alert(error?.message === 'REWARD_ALREADY_CLAIMED'
        ? '이미 다른 화면에서 순위 보상 지급을 처리 중이거나 완료했습니다.'
        : '순위 보상 지급 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm(`[${roomName}] 반을 삭제할까요?`)) return;

    try {
      const scoresRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.scores);
      const roomScoresQuery = query(scoresRef, where('roomId', '==', roomId));
      const roomScoresSnapshot = await getDocs(roomScoresQuery);
      await Promise.all(roomScoresSnapshot.docs.map((scoreDoc) => updateDoc(scoreDoc.ref, {
        excludedFromHallOfFame: true,
        roomDeleted: true,
        updatedAt: serverTimestamp(),
      })));

      const roomRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, roomId);
      await deleteDoc(roomRef);
      setLocalScores((prevScores) => prevScores.map((scoreItem) => (
        scoreItem.roomId === roomId
          ? {
            ...scoreItem,
            excludedFromHallOfFame: true,
            roomDeleted: true,
          }
          : scoreItem
      )));
      setViewingRoomId((prevRoomId) => (prevRoomId === roomId ? '' : prevRoomId));
    } catch (error) {
      console.error(error);
      alert('반 삭제 중 오류가 발생했습니다.');
    }
  };

  const toggleDifficulty = async (scoreId, currentDifficulty = 'normal') => {
    if (!requireTeacherAccess()) return;
    const nextDifficulty = currentDifficulty === 'normal' ? 'hard' : currentDifficulty === 'hard' ? 'hell' : 'normal';

    try {
      const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, scoreId);
      await updateDoc(scoreRef, { difficulty: nextDifficulty });
    } catch (error) {
      console.error(error);
      alert('난이도 변경 중 오류가 발생했습니다.');
    }
  };

  const toggleBoosterPower = async (scoreId, boosterEnabled = true) => {
    if (!requireTeacherAccess()) return;
    try {
      const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, scoreId);
      await updateDoc(scoreRef, { boosterEnabled: boosterEnabled === false });
    } catch (error) {
      console.error(error);
      alert('부스터 설정 변경 중 오류가 발생했습니다.');
    }
  };

  const toggleWeight = async (scoreId, currentWeight = 1.0) => {
    if (!requireTeacherAccess()) return;
    const nextWeight = currentWeight === 1.0 ? 1.5 : currentWeight === 1.5 ? 2.0 : 1.0;

    try {
      const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, scoreId);
      await updateDoc(scoreRef, { pointWeight: nextWeight });
    } catch (error) {
      console.error(error);
      alert('점수 배율 변경 중 오류가 발생했습니다.');
    }
  };

  const clearAnnouncementForm = () => {
    setEditingAnnId(null);
    setAnnTitle('');
    setAnnContent('');
    setAnnIsAlert(false);
  };

  const handleSaveAnnouncement = async (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;

    const trimmedTitle = annTitle.trim();
    const trimmedContent = annContent.trim();
    if (!trimmedTitle || !trimmedContent) return;

    try {
      if (editingAnnId) {
        const announcementRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.announcements, editingAnnId);
        await updateDoc(announcementRef, {
          title: trimmedTitle,
          content: trimmedContent,
          isAlert: annIsAlert,
          updatedAt: serverTimestamp(),
        });
        clearAnnouncementForm();
        return;
      }

      const announcementsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.announcements);
      await addDoc(announcementsRef, {
        title: trimmedTitle,
        content: trimmedContent,
        isAlert: annIsAlert,
        createdAt: serverTimestamp(),
      });
      clearAnnouncementForm();
    } catch (error) {
      console.error(error);
      alert('공지 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm('공지사항을 삭제할까요?')) return;

    try {
      const announcementRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.announcements, announcementId);
      await deleteDoc(announcementRef);
      if (editingAnnId === announcementId) clearAnnouncementForm();
    } catch (error) {
      console.error(error);
      alert('공지 삭제 중 오류가 발생했습니다.');
    }
  };

  const editAnnouncement = (announcement) => {
    setEditingAnnId(announcement.id);
    setAnnTitle(announcement.title);
    setAnnContent(announcement.content);
    setAnnIsAlert(Boolean(announcement.isAlert));
  };

  const cancelEditAnnouncement = () => {
    clearAnnouncementForm();
  };

  const handleSaveQuiz = async (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;

    const trimmedQuestion = quizQuestion.trim();
    const trimmedOptions = quizOptions.map((option) => option.trim());
    if (!trimmedQuestion || trimmedOptions.some((option) => !option)) {
      alert('퀴즈 문제와 4개의 보기를 모두 입력해주세요.');
      return;
    }

    try {
      const quizzesRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.quizzes);
      await addDoc(quizzesRef, {
        question: trimmedQuestion,
        options: trimmedOptions,
        answer: quizAnswer,
        createdAt: serverTimestamp(),
      });
      setQuizQuestion('');
      setQuizOptions(['', '', '', '']);
      setQuizAnswer(0);
    } catch (error) {
      console.error(error);
      alert('퀴즈 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm('퀴즈를 삭제할까요?')) return;

    try {
      const quizRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.quizzes, quizId);
      await deleteDoc(quizRef);
    } catch (error) {
      console.error(error);
      alert('퀴즈 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSaveWord = async (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;

    const trimmedText = wordText.trim();
    if (!trimmedText) return;

    try {
      const wordsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.words);
      await addDoc(wordsRef, {
        text: trimmedText,
        language: wordLanguage,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setWordText('');
    } catch (error) {
      console.error(error);
      alert('단어 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteWord = async (wordId) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm('단어를 삭제할까요?')) return;

    try {
      const wordRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.words, wordId);
      await deleteDoc(wordRef);
    } catch (error) {
      console.error(error);
      alert('단어 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCreateClass = async (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;

    const grade = Number(classGrade);
    const classNo = Number(classNumber);
    const className = `${grade}학년 ${classNo}반`;

    try {
      const classesRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classes);
      const classDoc = await addDoc(classesRef, {
        grade,
        classNumber: classNo,
        name: className,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSelectedClassId(classDoc.id);
    } catch (error) {
      console.error(error);
      alert('학급 생성 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm(`[${className || '선택한 학급'}] 학급을 삭제할까요?`)) return;

    try {
      const classRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classes, classId);
      await deleteDoc(classRef);
      setSelectedClassId((prevClassId) => (prevClassId === classId ? '' : prevClassId));
    } catch (error) {
      console.error(error);
      alert('학급 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBulkAddStudents = async (event) => {
    event.preventDefault();
    if (!requireTeacherAccess()) return;

    if (!selectedClassId) {
      alert('학생을 등록할 학급을 먼저 선택해주세요.');
      return;
    }

    const studentNames = [...new Set(
      studentBulkText
        .split(/\s+/)
        .map((name) => name.trim())
        .filter(Boolean),
    )];

    if (studentNames.length === 0) return;

    try {
      const studentsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classStudents);
      const rosterRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classRoster);
      const batch = writeBatch(db);
      studentNames.forEach((name) => {
        const studentRef = doc(studentsRef);
        batch.set(studentRef, {
          classId: selectedClassId,
          name,
          studentPin: '',
          active: true,
          totalPoints: 0,
          bestScore: 0,
          ownedCosmetics: [],
          equippedCosmetic: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(rosterRef, studentRef.id), {
          classId: selectedClassId,
          name,
          active: true,
          hasPin: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setStudentBulkText('');
    } catch (error) {
      console.error(error);
      alert('학생 등록 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm(`[${studentName || '선택한 학생'}] 학생을 삭제할까요?`)) return;

    try {
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, studentId);
      const rosterRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classRoster, studentId);
      const batch = writeBatch(db);
      batch.delete(studentRef);
      batch.delete(rosterRef);
      await batch.commit();
    } catch (error) {
      console.error(error);
      alert('학생 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleRegenerateStudentPin = async (studentId) => {
    if (!requireTeacherAccess()) return;
    if (!studentId) return;

    try {
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, studentId);
      const rosterRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classRoster, studentId);
      const batch = writeBatch(db);
      batch.update(studentRef, {
        studentPin: createStudentPin(),
        updatedAt: serverTimestamp(),
      });
      batch.set(rosterRef, { hasPin: true, updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
    } catch (error) {
      console.error(error);
      alert('학생 개인 PIN 재생성 중 오류가 발생했습니다.');
    }
  };

  const handleResetStudentPin = async (studentId) => {
    if (!requireTeacherAccess()) return;
    if (!studentId) return;

    try {
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, studentId);
      const rosterRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classRoster, studentId);
      const batch = writeBatch(db);
      batch.update(studentRef, {
        studentPin: '',
        updatedAt: serverTimestamp(),
      });
      batch.set(rosterRef, { hasPin: false, updatedAt: serverTimestamp() }, { merge: true });
      await batch.commit();
    } catch (error) {
      console.error(error);
      alert('학생 개인 PIN 초기화 중 오류가 발생했습니다.');
    }
  };

  const handleSetStudentPin = async (studentId, newPin) => {
    if (!studentId || !/^\d{4}$/.test(String(newPin))) return false;

    try {
      if (!selectedOpenClassRoom?.id) return false;
      return await setInitialStudentPin(selectedOpenClassRoom.id, studentId, String(newPin));
    } catch (error) {
      console.error(error);
      alert('학생 개인 PIN 설정 중 오류가 발생했습니다.');
      return false;
    }
  };

  const handleVerifyStudentPin = async (studentId, pin) => {
    if (!selectedOpenClassRoom?.id) return false;
    return verifyStudentPin(selectedOpenClassRoom.id, studentId, pin);
  };

  const handleSyncPublicRoster = async () => {
    if (!requireTeacherAccess()) return;
    try {
      const result = await syncPublicClassRoster();
      alert(`보안용 공개 명단 ${result.synced || 0}명이 동기화되었습니다.`);
    } catch (error) {
      console.error(error);
      alert('공개 명단 동기화 중 오류가 발생했습니다.');
    }
  };

  const handleBuyCosmetic = async (student, cosmeticId, shopItem) => {
    const normalizedStudent = normalizeClassStudent(student);
    const cosmetic = getCosmeticById(cosmeticId);

    if (!normalizedStudent.id || !cosmetic || !shopItem?.id) {
      alert('선생님이 아직 이 장식의 가격과 수량을 설정하지 않았습니다.');
      return;
    }
    if (normalizedStudent.ownedCosmetics.includes(cosmetic.id)) {
      alert('이미 보유한 아이템입니다.');
      return;
    }

    try {
      return await buyStudentShopItem(normalizedStudent.id, shopItem.id);
    } catch (error) {
      console.error(error);
      const messages = {
        'api/already-exists': '이미 보유한 아이템입니다.',
        'api/resource-exhausted': '장식 아이템이 품절되었습니다.',
        'api/failed-precondition': '포인트가 부족하거나 현재 판매하지 않는 장식입니다.',
        'api/permission-denied': '학생 PIN 인증이 만료되었습니다. 다시 인증해주세요.',
      };
      alert(messages[error.code] || '아이템 구매 중 오류가 발생했습니다.');
      return null;
    }
  };

  const handleSaveShopItem = async (itemData, editingItemId = null) => {
    if (!requireTeacherAccess()) return false;
    if (!selectedClassId) {
      alert('상품을 등록할 학급을 선택해주세요.');
      return false;
    }

    const normalizedItem = {
      classId: selectedClassId,
      name: String(itemData.name || '').trim(),
      description: String(itemData.description || '').trim(),
      price: Math.max(0, Math.floor(Number(itemData.price) || 0)),
      stock: Math.max(0, Math.floor(Number(itemData.stock) || 0)),
      active: itemData.active !== false,
      itemType: itemData.itemType === 'cosmetic' ? 'cosmetic' : 'stock',
      cosmeticId: itemData.itemType === 'cosmetic' ? String(itemData.cosmeticId || '') : null,
      updatedAt: serverTimestamp(),
    };

    if (!normalizedItem.name || normalizedItem.price <= 0) {
      alert('상품명과 1P 이상의 가격을 입력해주세요.');
      return false;
    }

    try {
      if (editingItemId) {
        const itemRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.shopItems, editingItemId);
        await updateDoc(itemRef, normalizedItem);
      } else {
        const itemsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.shopItems);
        await addDoc(itemsRef, {
          ...normalizedItem,
          createdAt: serverTimestamp(),
          createdBy: user?.uid || null,
        });
      }
      return true;
    } catch (error) {
      console.error(error);
      alert('상품 저장 중 오류가 발생했습니다.');
      return false;
    }
  };

  const handleDeleteShopItem = async (itemId, itemName) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm(`[${itemName || '상품'}]을 삭제할까요?`)) return;

    try {
      const itemRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.shopItems, itemId);
      await deleteDoc(itemRef);
    } catch (error) {
      console.error(error);
      alert('상품 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBuyStockItem = async (student, item) => {
    const normalizedStudent = normalizeClassStudent(student);
    if (!normalizedStudent.id || !item?.id || item.classId !== normalizedStudent.classId) return;

    try {
      const result = await buyStudentShopItem(normalizedStudent.id, item.id);
      alert(`${item.name} 구매가 완료되었습니다.`);
      return result;
    } catch (error) {
      console.error(error);
      const messages = {
        'api/resource-exhausted': '상품이 품절되었습니다.',
        'api/failed-precondition': '포인트가 부족하거나 현재 판매하지 않는 상품입니다.',
        'api/permission-denied': '학생 PIN 인증이 만료되었습니다. 다시 인증해주세요.',
      };
      alert(messages[error.code] || '상품 구매 중 오류가 발생했습니다.');
      return null;
    }
  };

  const handleEquipCosmetic = async (student, cosmeticId) => {
    const normalizedStudent = normalizeClassStudent(student);
    const cosmetic = getCosmeticById(cosmeticId);

    if (!normalizedStudent.id || !cosmetic) return;
    if (!normalizedStudent.ownedCosmetics.includes(cosmetic.id)) {
      alert('보유한 아이템만 장착할 수 있습니다.');
      return;
    }

    try {
      return await equipStudentCosmetic(normalizedStudent.id, cosmetic.id);
    } catch (error) {
      console.error(error);
      alert(error.code === 'api/permission-denied'
        ? '학생 PIN 인증이 만료되었습니다. 다시 인증해주세요.'
        : '아이템 장착 중 오류가 발생했습니다.');
      return null;
    }
  };

  const normalizePoints = (value) => Math.max(0, Math.floor(Number(value) || 0));

  const handleSetStudentPoints = async (studentId, nextPoints) => {
    if (!requireTeacherAccess()) return;
    if (!studentId) return;

    try {
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, studentId);
      await updateDoc(studentRef, {
        totalPoints: normalizePoints(nextPoints),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert('학생 포인트 수정 중 오류가 발생했습니다.');
    }
  };

  const handleAdjustStudentPoints = async (studentId, currentPoints, delta) => {
    await handleSetStudentPoints(studentId, normalizePoints(currentPoints) + Number(delta || 0));
  };

  const handleGrantStudentCosmetic = async (student, cosmeticId) => {
    if (!requireTeacherAccess()) return;
    const normalizedStudent = normalizeClassStudent(student);
    const cosmetic = getCosmeticById(cosmeticId);

    if (!normalizedStudent.id || !cosmetic) return;
    if (normalizedStudent.ownedCosmetics.includes(cosmetic.id)) return;

    try {
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, normalizedStudent.id);
      await updateDoc(studentRef, {
        ownedCosmetics: [...normalizedStudent.ownedCosmetics, cosmetic.id],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert('학생 아이템 지급 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveStudentCosmetic = async (student, cosmeticId) => {
    if (!requireTeacherAccess()) return;
    const normalizedStudent = normalizeClassStudent(student);
    const cosmetic = getCosmeticById(cosmeticId);

    if (!normalizedStudent.id || !cosmetic) return;

    try {
      const nextOwnedCosmetics = normalizedStudent.ownedCosmetics.filter((itemId) => itemId !== cosmetic.id);
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, normalizedStudent.id);
      await updateDoc(studentRef, {
        ownedCosmetics: nextOwnedCosmetics,
        equippedCosmetic: normalizedStudent.equippedCosmetic === cosmetic.id ? null : normalizedStudent.equippedCosmetic,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert('학생 아이템 회수 중 오류가 발생했습니다.');
    }
  };

  const handleResetStudentCosmetics = async (studentId) => {
    if (!requireTeacherAccess()) return;
    if (!studentId) return;
    if (!window.confirm('이 학생의 보유 장식과 장착 장식을 모두 초기화할까요?')) return;

    try {
      const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, studentId);
      await updateDoc(studentRef, {
        ownedCosmetics: [],
        equippedCosmetic: null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert('학생 장식 초기화 중 오류가 발생했습니다.');
    }
  };

  const openClassRoom = async (classItem) => {
    if (!requireTeacherAccess()) return;
    if (!classItem?.id) {
      alert('방을 열 학급을 먼저 선택해주세요.');
      return;
    }

    try {
      const durationSec = Number(classRoomDuration);
      const roomsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.rooms);
      const roomRef = await addDoc(roomsRef, {
        name: classItem.name || `${classItem.grade || 1}학년 ${classItem.classNumber || ''}반`,
        mode: classRoomMode,
        duration: durationSec,
        roomCode: createRoomCode(),
        status: 'waiting',
        classId: classItem.id,
        className: classItem.name || `${classItem.grade || 1}학년 ${classItem.classNumber || ''}반`,
        entryType: 'class',
        createdBy: user?.uid || null,
        createdAt: serverTimestamp(),
      });
      setViewingRoomId(roomRef.id);
    } catch (error) {
      console.error(error);
      alert('학급 방 열기 중 오류가 발생했습니다.');
    }
  };

  const deleteClassRoomSession = async (roomId, roomName) => {
    if (!requireTeacherAccess()) return;
    if (!window.confirm(`[${roomName || '선택한 학급 방'}] 방을 닫을까요?`)) return;

    try {
      const roomRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.rooms, roomId);
      await deleteDoc(roomRef);
      setViewingRoomId((prevRoomId) => (prevRoomId === roomId ? '' : prevRoomId));
    } catch (error) {
      console.error(error);
      alert('학급 방 닫기 중 오류가 발생했습니다.');
    }
  };

  const getLeaderboard = () => {
    const filteredScores = viewingRoomId === 'all'
      ? scores
      : viewingRoomId
        ? scores.filter((scoreItem) => scoreItem.roomId === viewingRoomId)
        : [];

    const latestByNickname = new Map();

    filteredScores.forEach((scoreItem) => {
      const nicknameKey = scoreItem.nickname || scoreItem.userId || scoreItem.id;
      const previous = latestByNickname.get(nicknameKey);
      const currentCreatedAt = getTimestampMillis(scoreItem.createdAt);
      const previousCreatedAt = getTimestampMillis(previous?.createdAt);

      if (!previous || currentCreatedAt >= previousCreatedAt) {
        latestByNickname.set(nicknameKey, scoreItem);
      }
    });

    return [...latestByNickname.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const handleBackToLogin = () => {
    setView('login');
    setPwdError('');
    setIsPracticeMode(false);
    setSelectedOpenClassRoomId('');
  };

  const handleTeacherLogout = async () => {
    await signOutFirebaseUser().catch((error) => console.error(error));
    handleBackToLogin();
  };

  const handleTeacherLoginBack = async () => {
    if (user && !user.isAnonymous) {
      await signOutFirebaseUser().catch((error) => console.error(error));
    }
    handleBackToLogin();
  };

  if (!authReady) {
    return (
      <div className="min-h-screen spring-bg flex items-center justify-center p-4">
        <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full z-10 relative shadow-xl">
          <div className="text-5xl mb-4 animate-bounce">🌸</div>
          <p className="text-gray-600 font-bold">접속 준비 중...</p>
        </div>
      </div>
    );
  }

  if (view === 'teacherLogin' || (view === 'teacher' && !teacherAuthorized)) {
    return (
      <TeacherLoginView
        error={pwdError}
        isLoading={teacherLoginLoading}
        teacherUidConfigured={Boolean(TEACHER_UID)}
        currentUser={user}
        onBack={handleTeacherLoginBack}
        onGoogleSignIn={handleTeacherSubmit}
      />
    );
  }

  if (view === 'studentLobby') {
    return (
      <StudentLobbyView
        nickname={nickname}
        setNickname={setNickname}
        roomCodeInput={roomCodeInput}
        setRoomCodeInput={setRoomCodeInput}
        openClassRooms={openClassRooms}
        selectedOpenClassRoomId={selectedOpenClassRoomId}
        setSelectedOpenClassRoomId={setSelectedOpenClassRoomId}
        classStudents={classStudents}
        shopItems={shopItems}
        enteredStudentIds={enteredClassStudentIds}
        onJoinClassStudent={handleJoinClassStudent}
        onBuyCosmetic={handleBuyCosmetic}
        onBuyStockItem={handleBuyStockItem}
        onEquipCosmetic={handleEquipCosmetic}
        onSetStudentPin={handleSetStudentPin}
        onVerifyStudentPin={handleVerifyStudentPin}
        onBack={() => setView('login')}
        onJoinRoom={handleJoinRoom}
        onPracticeStart={startPractice}
      />
    );
  }

  if (view === 'waiting') {
    return (
      <WaitingView
        nickname={nickname}
        myRoomData={myRoomData}
        onLeave={() => setView('studentLobby')}
      />
    );
  }

  if (view === 'playing') {
    return (
      <PlayingView
        nickname={nickname}
        currentWord={currentWord}
        inputValue={inputValue}
        setInputValue={setInputValue}
        combo={combo}
        showSuccess={showSuccess}
        lastEarned={lastEarned}
        score={score}
        timeLeft={timeLeft}
        formatTime={formatTime}
        isError={isError}
        setIsError={setIsError}
        currentQuiz={currentQuiz}
        handleKeyDown={handleKeyDown}
        handleQuizAnswer={handleQuizAnswer}
        boosterAvailable={boosterAvailable}
        boosterActive={boosterActive}
        boosterTimeLeft={boosterTimeLeft}
        activateBooster={activateBooster}
        inputRef={inputRef}
      />
    );
  }

  if (view === 'result') {
    return (
      <ResultView
        score={score}
        correctChars={correctChars}
        gameDuration={gameDuration}
        lastReward={lastReward}
        onHome={handleBackToLogin}
        onPracticeAgain={startPractice}
      />
    );
  }

  if (view === 'teacher') {
    return (
      <TeacherDashboardView
        getLeaderboard={getLeaderboard}
        currentTime={currentTime}
        onLogout={handleTeacherLogout}
        handleCreateRoom={handleCreateRoom}
        newRoomName={newRoomName}
        setNewRoomName={setNewRoomName}
        roomMode={roomMode}
        setRoomMode={setRoomMode}
        roomDuration={roomDuration}
        setRoomDuration={setRoomDuration}
        rooms={rooms}
        viewingRoomId={viewingRoomId}
        setViewingRoomId={setViewingRoomId}
        handleDeleteRoom={handleDeleteRoom}
        startRoomGame={startRoomGame}
        requestScoreSync={requestScoreSync}
        finalizeRankRewards={finalizeRankRewards}
        toggleBoosterPower={toggleBoosterPower}
        toggleWeight={toggleWeight}
        toggleDifficulty={toggleDifficulty}
        handleSaveAnnouncement={handleSaveAnnouncement}
        annTitle={annTitle}
        setAnnTitle={setAnnTitle}
        annContent={annContent}
        setAnnContent={setAnnContent}
        annIsAlert={annIsAlert}
        setAnnIsAlert={setAnnIsAlert}
        editingAnnId={editingAnnId}
        announcements={announcements}
        editAnnouncement={editAnnouncement}
        handleDeleteAnnouncement={handleDeleteAnnouncement}
        cancelEditAnnouncement={cancelEditAnnouncement}
        handleSaveQuiz={handleSaveQuiz}
        quizQuestion={quizQuestion}
        setQuizQuestion={setQuizQuestion}
        quizOptions={quizOptions}
        setQuizOptions={setQuizOptions}
        quizAnswer={quizAnswer}
        setQuizAnswer={setQuizAnswer}
        quizzes={quizzes}
        handleDeleteQuiz={handleDeleteQuiz}
        wordText={wordText}
        setWordText={setWordText}
        wordLanguage={wordLanguage}
        setWordLanguage={setWordLanguage}
        words={words}
        handleSaveWord={handleSaveWord}
        handleDeleteWord={handleDeleteWord}
        classes={classes}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        classGrade={classGrade}
        setClassGrade={setClassGrade}
        classNumber={classNumber}
        setClassNumber={setClassNumber}
        classRoomMode={classRoomMode}
        setClassRoomMode={setClassRoomMode}
        classRoomDuration={classRoomDuration}
        setClassRoomDuration={setClassRoomDuration}
        handleCreateClass={handleCreateClass}
        handleDeleteClass={handleDeleteClass}
        openClassRoom={openClassRoom}
        deleteClassRoomSession={deleteClassRoomSession}
        students={classStudents}
        studentBulkText={studentBulkText}
        setStudentBulkText={setStudentBulkText}
        handleBulkAddStudents={handleBulkAddStudents}
        handleDeleteStudent={handleDeleteStudent}
        handleRegenerateStudentPin={handleRegenerateStudentPin}
        handleResetStudentPin={handleResetStudentPin}
        handleSyncPublicRoster={handleSyncPublicRoster}
        handleSetStudentPoints={handleSetStudentPoints}
        handleAdjustStudentPoints={handleAdjustStudentPoints}
        handleGrantStudentCosmetic={handleGrantStudentCosmetic}
        handleRemoveStudentCosmetic={handleRemoveStudentCosmetic}
        handleResetStudentCosmetics={handleResetStudentCosmetics}
        shopItems={shopItems}
        handleSaveShopItem={handleSaveShopItem}
        handleDeleteShopItem={handleDeleteShopItem}
        classEntryCount={0}
        hallOfFameMonthKey={hallOfFameMonthKey}
        setHallOfFameMonthKey={setHallOfFameMonthKey}
        hallOfFame={hallOfFame}
        monthlyScores={monthlyScores}
        hallOfFameScoreCount={savedScoreCount}
        hallOfFameSavedAt={hallOfFameSavedAt}
        refreshHallOfFame={refreshMonthlyScores}
        isHallOfFameLoading={isHallOfFameLoading}
        hallOfFameError={hallOfFameError}
      />
    );
  }

  return (
    <LoginView
      announcements={announcements}
      showAnnouncementModal={showAnnouncementModal}
      setShowAnnouncementModal={setShowAnnouncementModal}
      onStudentClick={() => {
        setIsPracticeMode(false);
        setView('studentLobby');
      }}
      onTeacherClick={() => {
        setIsPracticeMode(false);
        setPwdError('');
        setView(teacherAuthorized ? 'teacher' : 'teacherLogin');
      }}
    />
  );
}

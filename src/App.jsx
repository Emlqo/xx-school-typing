import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { APP_ID, GAME_RULES } from './constants/gameRules.js';
import { isTeacherUser, TEACHER_IDLE_TIMEOUT_MS, TEACHER_PASSWORD_HASH, TEACHER_UID } from './constants/admin.js';
import { KOREAN_WORDS, ENGLISH_WORDS } from './constants/words.js';
import { LOCAL_QUIZZES } from './constants/quizzes.js';
import {
  getCosmeticById,
  HALL_OF_FAME_TITLE_IDS,
  HALL_OF_FAME_TITLE_ID_LIST,
} from './constants/cosmetics.js';
import { FIRESTORE_PATHS } from './constants/firestorePaths.js';
import { db, signInTeacherWithGoogle, signOutFirebaseUser } from './services/firebaseClient.js';
import {
  activateDuelBooster,
  buyStudentShopItem,
  cancelAllActiveDuels,
  acceptDuelChallenge,
  createDuelChallenge,
  equipStudentCosmetic,
  finalizeDuel,
  finalizeExpiredDuel,
  finalizeStudentReward,
  getActiveDuel,
  getDuelHistory,
  getTeacherDuelHistory,
  getStudentSession,
  joinClassGame,
  joinGuestGame,
  logoutStudentSession,
  recordPracticeCompletion,
  rejectDuelChallenge,
  setInitialStudentLoginPin,
  setInitialStudentPin,
  syncPublicClassRoster,
  verifyStudentLoginPin,
  verifyStudentPin,
} from './services/studentSecurityApi.js';
import { clearStudentDirectoryCache } from './services/studentDirectoryCache.js';
import { getPublicCollection, getPublicDoc } from './utils/firestoreRefs.js';
import { calculateHallOfFame, getHallOfFameTitleWinners, getMonthKey } from './utils/hallOfFame.js';
import { calculateCpm, calculateQuizScore, calculateTypingScore, getQuizWrongPenalty } from './utils/scoring.js';
import { formatTime } from './utils/format.js';
import { getCurrentDuelDailyWinPoints, normalizeClassStudent } from './utils/classStudents.js';
import { DUEL_RULES } from './constants/duelRules.js';
import { verifyTeacherPassword } from './utils/teacherAuth.js';
import { PRACTICE_RECORD_RULES } from './constants/rewards.js';
import { calculateRankRewards, getDefaultRewardState } from './utils/rewards.js';
import {
  createDuelQuizSequence,
  getDuelBoosterState,
  getDuelRemainingSeconds,
  getDuelWord,
  toDuelMillis,
} from './utils/duel.js';
import useAnnouncements from './hooks/useAnnouncements.js';
import useClasses from './hooks/useClasses.js';
import useClassStudents from './hooks/useClassStudents.js';
import useFirebaseAuth from './hooks/useFirebaseAuth.js';
import useDuel from './hooks/useDuel.js';
import useDuelChallenge from './hooks/useDuelChallenge.js';
import useDuelScores from './hooks/useDuelScores.js';
import useDuelSettings from './hooks/useDuelSettings.js';
import useMonthlyScores from './hooks/useMonthlyScores.js';
import useOpenClassRooms from './hooks/useOpenClassRooms.js';
import useQuizzes from './hooks/useQuizzes.js';
import useRoomScores from './hooks/useRoomScores.js';
import useScores from './hooks/useScores.js';
import useShopItems from './hooks/useShopItems.js';
import useShopPurchases from './hooks/useShopPurchases.js';
import useScoreSyncRequest from './hooks/useScoreSyncRequest.js';
import useStudentRoomWatcher from './hooks/useStudentRoomWatcher.js';
import useTeacherRooms from './hooks/useTeacherRooms.js';
import useTeacherLiveDuels from './hooks/useTeacherLiveDuels.js';
import useWords from './hooks/useWords.js';
import LoginView from './components/views/LoginView.jsx';
import EntryView from './components/views/EntryView.jsx';
import DuelChallengeView from './components/views/DuelChallengeView.jsx';
import DuelCountdownView from './components/views/DuelCountdownView.jsx';
import DuelResultView from './components/views/DuelResultView.jsx';
import DuelHistoryView from './components/views/DuelHistoryView.jsx';
import PlayingView from './components/views/PlayingView.jsx';
import ResultView from './components/views/ResultView.jsx';
import StudentLobbyView from './components/views/StudentLobbyView.jsx';
import StudentLoginView from './components/views/StudentLoginView.jsx';
import StudentHallOfFameView from './components/views/StudentHallOfFameView.jsx';
import AssessmentView from './components/views/AssessmentView.jsx';
import StudentRoomEntryView from './components/views/StudentRoomEntryView.jsx';
import TeacherDashboardView from './components/views/TeacherDashboardView.jsx';
import TeacherLoginView from './components/views/TeacherLoginView.jsx';
import WaitingView from './components/views/WaitingView.jsx';
import DuelChallengeModal from './components/duel/DuelChallengeModal.jsx';
import DuelOutgoingModal from './components/duel/DuelOutgoingModal.jsx';

const TEACHER_PATH = '/teacher';

function getInitialView() {
  return window.location.pathname.replace(/\/$/, '') === TEACHER_PATH ? 'teacherLogin' : 'entry';
}

export default function App() {
  const [view, setView] = useState(getInitialView);
  const [pwdError, setPwdError] = useState('');
  const [teacherLoginLoading, setTeacherLoginLoading] = useState(false);
  const [teacherGatePassword, setTeacherGatePassword] = useState('');
  const [teacherGatePassed, setTeacherGatePassed] = useState(
    () => window.sessionStorage.getItem('pw_typing_teacher_gate') === 'passed',
  );
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
  const [studentLoginClassId, setStudentLoginClassId] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [studentSessionExpiresAt, setStudentSessionExpiresAt] = useState(0);
  const [studentSessionChecked, setStudentSessionChecked] = useState(false);
  const [hallOfFameMonthKey, setHallOfFameMonthKey] = useState(() => getMonthKey(new Date()));
  const [isHallTitleBatchUpdating, setIsHallTitleBatchUpdating] = useState(false);
  const [lastReward, setLastReward] = useState(() => getDefaultRewardState());
  const [scoreSaveFailed, setScoreSaveFailed] = useState(false);
  const [duelClassId, setDuelClassId] = useState('');
  const [outgoingDuelTargetId, setOutgoingDuelTargetId] = useState('');
  const [activeDuelId, setActiveDuelId] = useState('');
  const [duelResultData, setDuelResultData] = useState(null);
  const [isDuelMode, setIsDuelMode] = useState(false);
  const [duelProcessing, setDuelProcessing] = useState(false);
  const [duelHistoryRecords, setDuelHistoryRecords] = useState([]);
  const [duelHistoryCursor, setDuelHistoryCursor] = useState(0);
  const [duelHistoryHasMore, setDuelHistoryHasMore] = useState(false);
  const [duelHistoryLoading, setDuelHistoryLoading] = useState(false);
  const [duelHistoryError, setDuelHistoryError] = useState('');
  const [duelHistoryStudentId, setDuelHistoryStudentId] = useState('');
  const [teacherDuelHistoryRecords, setTeacherDuelHistoryRecords] = useState([]);
  const [teacherDuelHistoryCursor, setTeacherDuelHistoryCursor] = useState(0);
  const [teacherDuelHistoryHasMore, setTeacherDuelHistoryHasMore] = useState(false);
  const [teacherDuelHistoryLoading, setTeacherDuelHistoryLoading] = useState(false);
  const [teacherDuelHistoryError, setTeacherDuelHistoryError] = useState('');
  const [teacherDuelHistoryLoaded, setTeacherDuelHistoryLoaded] = useState(false);
  const [teacherSection, setTeacherSection] = useState('overview');
  const [teacherLiveEnabled, setTeacherLiveEnabled] = useState(false);
  const [selectedTeacherLiveDuelId, setSelectedTeacherLiveDuelId] = useState('');
  const [teacherFinalizingDuelId, setTeacherFinalizingDuelId] = useState('');
  const [teacherCancellingAllDuels, setTeacherCancellingAllDuels] = useState(false);
  const [teacherUpdatingDuelAvailability, setTeacherUpdatingDuelAvailability] = useState(false);
  const [localRooms] = useState([]);
  const [localScores, setLocalScores] = useState([]);
  const [localAnnouncements] = useState([]);
  const [localQuizzes] = useState(() => LOCAL_QUIZZES);

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
  const practiceRunIdRef = useRef('');
  const autoAnnouncementShownRef = useRef(false);
  const duelWordIndexRef = useRef(0);
  const duelQuizIndexRef = useRef(0);
  const duelSyncDirtyRef = useRef(false);
  const duelSyncPromiseRef = useRef(null);
  const duelBoosterActivationRef = useRef(false);
  const cancelledDuelHandledRef = useRef('');
  const duelRecoveryStudentRef = useRef('');

  const { user, authReady } = useFirebaseAuth();
  const teacherAuthorized = useMemo(() => isTeacherUser(user), [user]);
  const scopedUser = view === 'teacher' && !teacherAuthorized ? null : user;
  const firestoreReadsEnabled = !(view === 'playing' && isPracticeMode);
  const teacherOverviewActive = view !== 'teacher' || teacherSection === 'overview' || teacherSection === 'classes';
  const teacherClassDataActive = view !== 'teacher' || ['overview', 'classes', 'shop', 'assessments'].includes(teacherSection);
  const { announcements: subscribedAnnouncements, refreshAnnouncements } = useAnnouncements({
    user: scopedUser,
    enabled: firestoreReadsEnabled
      && (view === 'login' || (view === 'teacher' && teacherSection === 'records')),
  });
  const { quizzes: subscribedQuizzes } = useQuizzes({
    user: scopedUser,
    view,
    isPracticeMode,
    isDuelMode,
    enabled: firestoreReadsEnabled && view === 'teacher' && teacherSection === 'quizzes',
  });
  const { rooms: subscribedRooms } = useTeacherRooms({
    user: scopedUser,
    view,
    enabled: firestoreReadsEnabled && teacherOverviewActive,
  });
  const wordsView = isDuelMode && view === 'playing' ? 'duelPlaying' : view;
  const { words } = useWords({
    user: scopedUser,
    view: wordsView,
    isPracticeMode,
    enabled: firestoreReadsEnabled && view === 'teacher' && teacherSection === 'words',
  });
  const { classes } = useClasses({
    user: scopedUser,
    view,
    isPracticeMode,
    enabled: firestoreReadsEnabled && teacherClassDataActive,
  });
  const {
    openClassRooms,
    isLoading: openClassRoomsLoading,
    refreshOpenClassRooms,
  } = useOpenClassRooms({ user: scopedUser, view, isPracticeMode, enabled: firestoreReadsEnabled });
  const selectedOpenClassRoom = useMemo(
    () => openClassRooms.find((room) => room.id === selectedOpenClassRoomId) || null,
    [openClassRooms, selectedOpenClassRoomId],
  );
  const { students: classStudents } = useClassStudents({
    user: scopedUser,
    view,
    classId: view === 'studentLogin'
      ? studentLoginClassId
      : view === 'duelChallenge'
        ? duelClassId
      : view === 'studentLobby'
        ? selectedOpenClassRoom?.classId || ''
        : selectedClassId,
    isPracticeMode,
    enabled: firestoreReadsEnabled && teacherClassDataActive,
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
    : studentProfile?.classId || selectedOpenClassRoom?.classId || '';
  const { shopItems, refreshShopItems } = useShopItems({
    user: scopedUser,
    view,
    classId: shopClassId,
    isPracticeMode,
    enabled: firestoreReadsEnabled
      && (view === 'login' || (view === 'teacher' && teacherSection === 'shop')),
  });
  const { shopPurchases } = useShopPurchases({
    user: scopedUser,
    view,
    classId: selectedClassId,
    isPracticeMode,
    enabled: firestoreReadsEnabled && view === 'teacher' && teacherSection === 'shop',
  });
  const { scores: subscribedScores } = useScores({
    user: scopedUser,
    view,
    viewingRoomId,
    currentScoreDocId,
    enabled: firestoreReadsEnabled && teacherOverviewActive,
  });
  const {
    monthlyScores,
    savedHallOfFame,
    savedScoreCount,
    lastSavedAt: hallOfFameSavedAt,
    canRefreshToday: canRefreshHallOfFameToday,
    loadedMonthKey: hallOfFameLoadedMonthKey,
    refreshMonthlyScores,
    isLoading: isHallOfFameLoading,
    error: hallOfFameError,
  } = useMonthlyScores({
    user: scopedUser,
    view,
    monthKey: hallOfFameMonthKey,
    isPracticeMode,
    enabled: firestoreReadsEnabled
      && (view === 'hallOfFame' || (view === 'teacher' && teacherSection === 'records')),
  });
  const { incomingChallenge, outgoingChallenge } = useDuelChallenge({
    user: scopedUser,
    studentId: user?.uid || '',
    outgoingTargetStudentId: outgoingDuelTargetId,
    enabled: Boolean(studentProfile)
      && !isPracticeMode
      && (view === 'login' || view === 'duelChallenge'),
  });
  const {
    duelEnabled,
    isLoading: duelAvailabilityLoading,
    error: duelAvailabilityError,
  } = useDuelSettings({
    user: scopedUser,
    enabled: firestoreReadsEnabled
      && Boolean(scopedUser)
      && ((view === 'teacher' && teacherSection === 'duelLive')
        || (Boolean(studentProfile) && (view === 'login' || view === 'duelChallenge'))),
  });
  const { duel: activeDuel } = useDuel({
    user: scopedUser,
    duelId: activeDuelId,
    enabled: Boolean(studentProfile) && !isPracticeMode,
  });
  const { duelScores } = useDuelScores({
    user: scopedUser,
    duel: activeDuel,
    viewerStudentId: studentProfile?.id || '',
    enabled: Boolean(studentProfile) && !isPracticeMode,
  });
  const {
    duels: teacherLiveDuels,
    isLoading: teacherLiveLoading,
    error: teacherLiveError,
  } = useTeacherLiveDuels({
    user: scopedUser,
    view,
    enabled: teacherAuthorized && teacherLiveEnabled,
  });
  const selectedTeacherLiveDuel = useMemo(
    () => teacherLiveDuels.find((duel) => duel.id === selectedTeacherLiveDuelId) || null,
    [selectedTeacherLiveDuelId, teacherLiveDuels],
  );
  const { duelScores: selectedTeacherLiveScores, error: selectedTeacherLiveScoresError } = useDuelScores({
    user: scopedUser,
    duel: selectedTeacherLiveDuel,
    enabled: teacherAuthorized && view === 'teacher' && teacherLiveEnabled,
  });
  const myDuelScore = useMemo(
    () => duelScores.find((item) => item.studentId === studentProfile?.id) || null,
    [duelScores, studentProfile?.id],
  );
  const opponentDuelScore = useMemo(
    () => duelScores.find((item) => item.studentId !== studentProfile?.id) || null,
    [duelScores, studentProfile?.id],
  );

  useEffect(() => {
    if (!authReady) return undefined;
    if (!user) {
      clearStudentDirectoryCache();
      setStudentProfile(null);
      setStudentSessionExpiresAt(0);
      setStudentSessionChecked(true);
      return undefined;
    }
    if (!user.isAnonymous) {
      clearStudentDirectoryCache();
      setStudentProfile(null);
      setStudentSessionExpiresAt(0);
      setStudentSessionChecked(true);
      return undefined;
    }

    let cancelled = false;
    setStudentSessionChecked(false);
    getStudentSession()
      .then((result) => {
        if (cancelled) return;
        if (result?.profile && Number(result.sessionExpiresAt) > Date.now()) {
          setStudentProfile(normalizeClassStudent(result.profile));
          setStudentSessionExpiresAt(Number(result.sessionExpiresAt));
          setNickname(result.profile.name || '');
          setView((currentView) => currentView === 'entry' ? 'login' : currentView);
        } else {
          clearStudentDirectoryCache(user.uid);
          setStudentProfile(null);
          setStudentSessionExpiresAt(0);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          clearStudentDirectoryCache(user.uid);
          setStudentProfile(null);
          setStudentSessionExpiresAt(0);
        }
      })
      .finally(() => {
        if (!cancelled) setStudentSessionChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.isAnonymous, user?.uid]);

  useEffect(() => {
    const studentId = studentProfile?.id || '';
    if (!studentId || duelRecoveryStudentRef.current === studentId) return;
    duelRecoveryStudentRef.current = studentId;

    getActiveDuel(studentId)
      .then((result) => {
        if (result?.duel?.id) {
          setActiveDuelId(result.duel.id);
          setIsDuelMode(result.duel.status !== 'completed');
          setView(result.duel.status === 'completed' ? 'duelResult' : 'duelCountdown');
          return;
        }
        if (result?.outgoingChallengeTargetId) {
          setOutgoingDuelTargetId(result.outgoingChallengeTargetId);
        }
      })
      .catch((error) => console.error('결투 상태를 복구하지 못했습니다.', error));
  }, [studentProfile?.id]);

  useEffect(() => {
    const relevantIncoming = incomingChallenge?.targetStudentId === studentProfile?.id
      ? incomingChallenge
      : null;
    const relevantOutgoing = outgoingChallenge?.challengerStudentId === studentProfile?.id
      ? outgoingChallenge
      : null;
    const acceptedChallenge = [relevantIncoming, relevantOutgoing]
      .find((challenge) => challenge?.status === 'accepted' && challenge.duelId);
    if (!acceptedChallenge?.duelId) return;
    if (toDuelMillis(acceptedChallenge.expiresAt) <= Date.now()) return;
    setActiveDuelId(acceptedChallenge.duelId);
    setIsDuelMode(true);
    setView((currentView) => (
      currentView === 'duelResult' ? currentView : 'duelCountdown'
    ));
  }, [incomingChallenge, outgoingChallenge, studentProfile?.id]);

  useEffect(() => {
    if (!activeDuelId || !activeDuel || activeDuel.status !== 'completed') return;
    setDuelResultData(activeDuel);
    setIsDuelMode(false);
    setView('duelResult');
    getStudentSession()
      .then((result) => {
        if (result?.profile) setStudentProfile(normalizeClassStudent(result.profile));
      })
      .catch((error) => console.error(error));
  }, [activeDuel, activeDuelId]);

  useEffect(() => {
    if (!activeDuelId || activeDuel?.status !== 'cancelled') return;
    setActiveDuelId('');
    setDuelResultData(null);
    setOutgoingDuelTargetId('');
    setIsDuelMode(false);
    setBoosterActive(false);
    isEndingRef.current = false;
    setView('login');
    getStudentSession()
      .then((result) => {
        if (result?.profile) setStudentProfile(normalizeClassStudent(result.profile));
      })
      .catch((error) => console.error(error));
    if (cancelledDuelHandledRef.current !== activeDuelId) {
      cancelledDuelHandledRef.current = activeDuelId;
      alert('선생님이 수업을 종료하여 진행 중인 결투가 취소되었습니다. 승부 포인트 5P는 반환됩니다.');
    }
  }, [activeDuel, activeDuelId]);

  useEffect(() => {
    if (!studentProfile || !studentSessionExpiresAt) return undefined;
    const remaining = studentSessionExpiresAt - Date.now();
    if (remaining <= 0) {
      clearStudentDirectoryCache(user?.uid || '');
      setStudentProfile(null);
      setStudentSessionExpiresAt(0);
      setView('entry');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      clearStudentDirectoryCache(user?.uid || '');
      setStudentProfile(null);
      setStudentSessionExpiresAt(0);
      setView('entry');
      alert('학생 로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [studentProfile, studentSessionExpiresAt, user?.uid]);

  useEffect(() => {
    const handlePopState = () => {
      const isTeacherPath = window.location.pathname.replace(/\/$/, '') === TEACHER_PATH;
      if (isTeacherPath) {
        setPwdError('');
        setView('teacherLogin');
        return;
      }
      setView(studentProfile ? 'login' : 'entry');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [studentProfile]);

  useEffect(() => {
    if (view === 'teacher') return;
    setTeacherLiveEnabled(false);
    setSelectedTeacherLiveDuelId('');
  }, [view]);

  const announcements = useMemo(() => [...localAnnouncements, ...subscribedAnnouncements], [localAnnouncements, subscribedAnnouncements]);
  const quizzes = useMemo(
    () => (view === 'teacher'
      ? subscribedQuizzes
      : subscribedQuizzes.length > 0
        ? subscribedQuizzes
        : localQuizzes),
    [localQuizzes, subscribedQuizzes, view],
  );
  const rooms = useMemo(() => [...localRooms, ...subscribedRooms], [localRooms, subscribedRooms]);
  const scores = useMemo(() => [...localScores, ...subscribedScores], [localScores, subscribedScores]);
  const enteredClassStudentIds = useMemo(
    () => selectedOpenClassRoomScores
      .filter((scoreItem) => scoreItem.studentId)
      .map((scoreItem) => scoreItem.studentId),
    [selectedOpenClassRoomScores],
  );
  const studentOpenClassRooms = useMemo(
    () => studentProfile?.classId
      ? openClassRooms.filter((room) => room.classId === studentProfile.classId)
      : [],
    [openClassRooms, studentProfile?.classId],
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

  const pickDuelContent = useCallback(() => {
    if (!activeDuel) return;
    const quizSequence = Array.isArray(activeDuel.quizSequence) ? activeDuel.quizSequence : [];

    if (
      wordCountRef.current >= GAME_RULES.quizIntervalWords
      && duelQuizIndexRef.current < quizSequence.length
    ) {
      const nextQuiz = quizSequence[duelQuizIndexRef.current];
      duelQuizIndexRef.current += 1;
      wordCountRef.current = 0;
      setCurrentQuiz(nextQuiz);
      setCurrentWord('');
      setInputValue('');
      duelSyncDirtyRef.current = true;
      return;
    }

    const nextWord = getDuelWord(activeDuel.randomSeed, duelWordIndexRef.current);
    duelWordIndexRef.current += 1;
    setCurrentQuiz(null);
    setCurrentWord(nextWord);
    setInputValue('');
    duelSyncDirtyRef.current = true;
  }, [activeDuel]);

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
    setScoreSaveFailed(false);
    pendingQuizzesRef.current = [];
    wordCountRef.current = 0;
    gameInfoRef.current = { elapsed: 0 };
    latestScoreRef.current = 0;
    latestCharsRef.current = 0;
    latestQuizCorrectCountRef.current = 0;
    lastProcessedSyncRef.current = 0;
    lastSyncedScoreRef.current = 0;
    isEndingRef.current = false;
    setIsDuelMode(false);
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

  const startDuelGame = useCallback(() => {
    if (!activeDuel || !myDuelScore || !studentProfile?.id) return;
    const remainingSeconds = getDuelRemainingSeconds(activeDuel);
    const duelDuration = Number(activeDuel.duration || DUEL_RULES.durationSeconds);
    resetPlayingState({ practiceMode: false, duration: duelDuration, mode: 'mixed' });
    setIsDuelMode(true);
    setSelectedRoomId('');
    setCurrentScoreDocId(null);
    setMyRoomData(null);
    restoreScoreState(myDuelScore);
    const restoredBooster = getDuelBoosterState(myDuelScore);
    setBoosterAvailable(restoredBooster.available);
    setBoosterActive(restoredBooster.active);
    setBoosterTimeLeft(restoredBooster.timeLeft);
    duelWordIndexRef.current = Math.max(0, Number(myDuelScore.wordIndex || 0));
    duelQuizIndexRef.current = Math.max(0, Number(myDuelScore.quizIndex || 0));
    wordCountRef.current = Math.max(0, Number(myDuelScore.wordCountSinceQuiz || 0));
    setTimeLeft(remainingSeconds);
    gameInfoRef.current.elapsed = Math.max(0, duelDuration - remainingSeconds);
    isEndingRef.current = false;
    if (remainingSeconds <= 0) {
      setView('duelFinishing');
      return;
    }
    pickDuelContent();
    setView('playing');
  }, [activeDuel, myDuelScore, pickDuelContent, resetPlayingState, studentProfile?.id]);

  const startPractice = useCallback(() => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    setSelectedRoomId('');
    setCurrentScoreDocId(null);
    setMyRoomData(null);
    practiceRunIdRef.current = studentProfile?.id
      ? (window.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`)
      : '';
    resetPlayingState({ practiceMode: true, duration: 300, mode: 'mixed' });
    pendingQuizzesRef.current = [...quizzes].sort(() => Math.random() - 0.5);
    wordCountRef.current = 0;
    pickRandomWord('mixed', { practiceMode: true });
    setView('playing');
  }, [nickname, pickRandomWord, quizzes, resetPlayingState, studentProfile?.id]);

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

  const handleJoinClassStudent = useCallback(async (student, roomOverride = null) => {
    const targetRoom = roomOverride || selectedOpenClassRoom;
    if (!targetRoom?.id || !student?.id) {
      alert('입장할 학급과 이름을 선택해주세요.');
      return;
    }

    if (!user || !db) {
      alert('서버 접속 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      const roomData = targetRoom;
      const remainingSeconds = getRemainingSeconds(roomData);

      if (roomData.status === 'playing' && remainingSeconds <= 0) {
        alert('이미 종료된 게임입니다.');
        return;
      }

      const duration = Number(roomData.duration || 300);
      const joined = await joinClassGame(roomData.id, student.id);
      if (Number(joined.sessionExpiresAt) > Date.now()) {
        setStudentSessionExpiresAt(Number(joined.sessionExpiresAt));
      }
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

  const syncDuelScore = useCallback(async ({ finished = false } = {}) => {
    if (!isDuelMode || !myDuelScore?.id || !db) return;
    if (duelSyncPromiseRef.current) await duelSyncPromiseRef.current;
    if (!finished && !duelSyncDirtyRef.current) return;
    const elapsedSeconds = Math.max(1, gameInfoRef.current.elapsed || 1);
    const captured = {
      score: latestScoreRef.current,
      correctChars: latestCharsRef.current,
      quizCorrectCount: latestQuizCorrectCountRef.current,
      wordIndex: duelWordIndexRef.current,
      quizIndex: duelQuizIndexRef.current,
      wordCountSinceQuiz: wordCountRef.current,
    };
    const finalCpm = calculateCpm({ chars: captured.correctChars, seconds: elapsedSeconds });
    const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.duelScores, myDuelScore.id);
    const updates = {
      score: captured.score,
      cpm: finalCpm,
      correctChars: captured.correctChars,
      quizCorrectCount: captured.quizCorrectCount,
      wordIndex: captured.wordIndex,
      quizIndex: captured.quizIndex,
      wordCountSinceQuiz: captured.wordCountSinceQuiz,
      updatedAt: serverTimestamp(),
    };
    if (finished) updates.finishedAt = serverTimestamp();
    const syncPromise = updateDoc(scoreRef, updates);
    duelSyncPromiseRef.current = syncPromise;
    try {
      await syncPromise;
      duelSyncDirtyRef.current = latestScoreRef.current !== captured.score
        || latestCharsRef.current !== captured.correctChars
        || latestQuizCorrectCountRef.current !== captured.quizCorrectCount
        || duelWordIndexRef.current !== captured.wordIndex
        || duelQuizIndexRef.current !== captured.quizIndex
        || wordCountRef.current !== captured.wordCountSinceQuiz;
    } finally {
      duelSyncPromiseRef.current = null;
    }
  }, [isDuelMode, myDuelScore?.id]);

  const endGame = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    setBoosterActive(false);

    if (isDuelMode && activeDuel?.id && studentProfile?.id) {
      setView('duelFinishing');
      try {
        await syncDuelScore({ finished: true });
        let finalized = null;
        for (let attempt = 0; attempt < 6 && !finalized; attempt += 1) {
          try {
            finalized = await finalizeDuel(activeDuel.id, studentProfile.id);
          } catch (error) {
            if (error.code !== 'api/failed-precondition' || attempt === 5) throw error;
            await new Promise((resolve) => window.setTimeout(resolve, 700));
          }
        }
        if (finalized?.profile) setStudentProfile(normalizeClassStudent(finalized.profile));
        if (finalized?.duel?.status === 'cancelled') {
          if (cancelledDuelHandledRef.current !== finalized.duel.id) {
            cancelledDuelHandledRef.current = finalized.duel.id;
            alert('선생님이 수업을 종료하여 진행 중인 결투가 취소되었습니다. 승부 포인트 5P는 반환됩니다.');
          }
          setActiveDuelId('');
          setDuelResultData(null);
          setOutgoingDuelTargetId('');
          setIsDuelMode(false);
          isEndingRef.current = false;
          setView('login');
          return;
        }
        if (finalized?.duel) setDuelResultData(finalized.duel);
        setView('duelResult');
      } catch (error) {
        console.error(error);
        isEndingRef.current = false;
        alert('결투 결과를 확정하는 중 오류가 발생했습니다. 잠시 후 다시 시도합니다.');
      }
      return;
    }

    setView('result');

    if (isPracticeMode) {
      const practiceRunId = practiceRunIdRef.current;
      practiceRunIdRef.current = '';
      if (studentProfile?.id && practiceRunId) {
        const elapsedSeconds = gameInfoRef.current.elapsed || gameDuration || 0;
        const finalCpm = calculateCpm({ chars: latestCharsRef.current, seconds: elapsedSeconds });
        const qualifiesForPracticeRecord = elapsedSeconds >= PRACTICE_RECORD_RULES.minDurationSec
          && finalCpm >= PRACTICE_RECORD_RULES.minCpm
          && latestCharsRef.current > 0;

        try {
          if (qualifiesForPracticeRecord) {
            await recordPracticeCompletion(
              studentProfile.id,
              practiceRunId,
              elapsedSeconds,
              latestCharsRef.current,
              finalCpm,
            );
          }
        } catch (error) {
          console.error('자유 연습 참여 기록을 저장하지 못했습니다.', error);
        }
      }
      return;
    }

    if (!currentScoreDocId || !db) return;

    let scoreSaved = false;
    try {
      const elapsedSeconds = gameInfoRef.current.elapsed || gameDuration || 1;
      const finalCpm = calculateCpm({ chars: latestCharsRef.current, seconds: elapsedSeconds });
      const scoreRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.scores, currentScoreDocId);
      const currentScoreInfo = scores.find((item) => item.id === currentScoreDocId) || {};

      let lastSaveError = null;
      for (let attempt = 0; attempt < 3 && !scoreSaved; attempt += 1) {
        try {
          await updateDoc(scoreRef, {
            score: latestScoreRef.current,
            cpm: finalCpm,
            correctChars: latestCharsRef.current,
            quizCorrectCount: latestQuizCorrectCountRef.current,
            updatedAt: serverTimestamp(),
          });
          scoreSaved = true;
          setScoreSaveFailed(false);
        } catch (saveError) {
          lastSaveError = saveError;
          if (attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
          }
        }
      }
      if (!scoreSaved) throw lastSaveError || new Error('점수를 저장하지 못했습니다.');
      lastSyncedScoreRef.current = latestScoreRef.current;

      if (
        currentScoreInfo.entryType === 'class'
        && currentScoreInfo.classId
        && currentScoreInfo.studentId
        && currentScoreInfo.rewardGranted !== true
      ) {
        const { reward } = await finalizeStudentReward(currentScoreDocId);
        setLastReward(reward);
        const refreshedSession = await getStudentSession();
        if (refreshedSession?.profile) {
          setStudentProfile(normalizeClassStudent(refreshedSession.profile));
        }
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
      if (!scoreSaved) {
        isEndingRef.current = false;
        setScoreSaveFailed(true);
        alert('점수 저장에 실패했습니다. 인터넷 연결을 확인한 뒤 결과 화면을 닫지 말고 다시 시도해주세요.');
      }
    } finally {
      if (scoreSaved) {
        setSelectedRoomId('');
        setCurrentScoreDocId(null);
        setMyRoomData(null);
      }
    }
  }, [activeDuel?.id, currentScoreDocId, gameDuration, isDuelMode, isPracticeMode, scores, studentProfile?.id, syncDuelScore]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Backspace') {
      setCombo(0);
      return;
    }

    const shouldSubmit = event.key === 'Enter' || (event.key === ' ' && !currentWord.includes(' '));
    if (!shouldSubmit || currentQuiz || !currentWord) return;

    event.preventDefault();

    if (inputValue.trim() === currentWord) {
      const myInfo = isDuelMode ? myDuelScore || {} : scores.find((item) => item.id === currentScoreDocId) || {};
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
      duelSyncDirtyRef.current = isDuelMode || duelSyncDirtyRef.current;
      if (isDuelMode) pickDuelContent();
      else pickRandomWord(gameMode);
      return;
    }

    setCombo(0);
    setIsError(true);
  }, [boosterActive, combo, currentQuiz, currentScoreDocId, currentWord, gameMode, inputValue, isDuelMode, myDuelScore, pickDuelContent, pickRandomWord, playComboSound, scores]);

  const handleQuizAnswer = useCallback((answerIndex) => {
    if (!currentQuiz) return;

    const myInfo = isDuelMode ? myDuelScore || {} : scores.find((item) => item.id === currentScoreDocId) || {};

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
    duelSyncDirtyRef.current = isDuelMode || duelSyncDirtyRef.current;
    if (isDuelMode) pickDuelContent();
    else pickRandomWord(gameMode);
  }, [boosterActive, currentQuiz, currentScoreDocId, gameMode, isDuelMode, myDuelScore, pickDuelContent, pickRandomWord, scores]);

  const activateBooster = useCallback(async () => {
    if (!boosterAvailable || boosterActive || duelBoosterActivationRef.current) return;

    const myInfo = isDuelMode ? myDuelScore || {} : scores.find((item) => item.id === currentScoreDocId) || {};
    if (myInfo.boosterEnabled === false) {
      alert('선생님이 부스터 사용을 비활성화했습니다.');
      return;
    }

    if (isDuelMode) {
      if (!activeDuel?.id || !studentProfile?.id) return;
      duelBoosterActivationRef.current = true;
      setBoosterAvailable(false);
      try {
        const result = await activateDuelBooster(activeDuel.id, studentProfile.id);
        const approvedBooster = getDuelBoosterState(result);
        setBoosterAvailable(approvedBooster.available);
        setBoosterActive(approvedBooster.active);
        setBoosterTimeLeft(approvedBooster.timeLeft);
      } catch (error) {
        console.error('결투 부스터 활성화 오류', error);
        if (error.code === 'api/booster-already-used') {
          setBoosterAvailable(false);
          setBoosterActive(false);
          setBoosterTimeLeft(0);
          alert('이 결투에서는 이미 부스터를 사용했습니다.');
        } else {
          setBoosterAvailable(true);
          alert(error.message || '부스터를 활성화하지 못했습니다.');
        }
      } finally {
        duelBoosterActivationRef.current = false;
      }
      return;
    }

    setBoosterActive(true);
    setBoosterAvailable(false);
    setBoosterTimeLeft(GAME_RULES.boosterDuration);
  }, [activeDuel?.id, boosterActive, boosterAvailable, currentScoreDocId, isDuelMode, myDuelScore, scores, studentProfile?.id]);

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
    if (isDuelMode && view === 'playing') duelSyncDirtyRef.current = true;
  }, [correctChars, isDuelMode, quizCorrectCount, score, view]);

  useEffect(() => {
    if (!isDuelMode || view !== 'playing' || !myDuelScore?.id) return undefined;
    const timer = window.setInterval(() => {
      if (!duelSyncDirtyRef.current) return;
      syncDuelScore().catch((error) => console.error('결투 점수 동기화 오류', error));
    }, DUEL_RULES.scoreSyncIntervalMs);
    return () => window.clearInterval(timer);
  }, [isDuelMode, myDuelScore?.id, syncDuelScore, view]);

  useEffect(() => {
    if (view !== 'playing') return undefined;

    const timer = window.setInterval(() => {
      setTimeLeft((prevTimeLeft) => {
        const nextTimeLeft = isDuelMode
          ? getDuelRemainingSeconds(activeDuel)
          : Math.max(prevTimeLeft - 1, 0);
        gameInfoRef.current.elapsed = gameDuration - nextTimeLeft;
        return nextTimeLeft;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeDuel, gameDuration, isDuelMode, view]);

  useEffect(() => {
    if (view === 'playing' && timeLeft <= 0) {
      endGame();
    }
  }, [endGame, timeLeft, view]);

  useEffect(() => {
    if (view !== 'duelFinishing' || !isDuelMode || isEndingRef.current) return;
    endGame();
  }, [endGame, isDuelMode, view]);

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
        window.sessionStorage.removeItem('pw_typing_teacher_gate');
        setTeacherGatePassed(false);
        setTeacherGatePassword('');
        window.history.replaceState({}, '', '/');
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
    if (teacherAuthorized && teacherGatePassed) return true;
    window.alert('관리자가 아닌데 누구인가요? 관리자 계정으로 다시 로그인해 주세요.');
    setPwdError('관리자 세션이 없거나 만료되었습니다. Google 계정으로 다시 로그인해주세요.');
    window.history.replaceState({}, '', TEACHER_PATH);
    setView('teacherLogin');
    return false;
  }, [teacherAuthorized, teacherGatePassed]);

  const handleTeacherGateSubmit = async (event) => {
    event.preventDefault();
    setTeacherLoginLoading(true);
    setPwdError('');

    try {
      const verified = await verifyTeacherPassword(teacherGatePassword, TEACHER_PASSWORD_HASH);
      if (!verified) {
        const warningMessage = studentProfile
          ? `${studentProfile.className || '학급 로그인'} ${studentProfile.name}야, 뭐 하니??`
          : '관리자가 아닌데 누구인가요??';
        window.alert(warningMessage);
        setPwdError(warningMessage);
        return;
      }
      window.sessionStorage.setItem('pw_typing_teacher_gate', 'passed');
      setTeacherGatePassed(true);
      setTeacherGatePassword('');
    } catch (error) {
      console.error(error);
      setPwdError('1차 인증 중 오류가 발생했습니다.');
    } finally {
      setTeacherLoginLoading(false);
    }
  };

  const handleTeacherSubmit = async () => {
    if (!teacherGatePassed) {
      setPwdError('1차 관리자 인증을 먼저 완료해 주세요.');
      return;
    }
    if (teacherAuthorized) {
      window.history.replaceState({}, '', TEACHER_PATH);
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
        window.history.replaceState({}, '', TEACHER_PATH);
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
        await refreshAnnouncements();
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
      await refreshAnnouncements();
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
      await refreshAnnouncements();
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

  const handleResetClassStudentPins = async () => {
    if (!requireTeacherAccess()) return false;
    if (!selectedClassId) {
      alert('PIN을 초기화할 학급을 먼저 선택해주세요.');
      return false;
    }

    const studentsWithPin = classStudents.filter((student) => (
      student.classId === selectedClassId && Boolean(student.studentPin)
    ));
    if (studentsWithPin.length === 0) {
      alert('선택한 학급에 초기화할 PIN이 없습니다.');
      return false;
    }

    const selectedClassName = classes.find((classItem) => classItem.id === selectedClassId)?.name
      || '선택한 학급';
    const confirmed = window.confirm(
      `[${selectedClassName}] 학생 ${studentsWithPin.length}명의 개인 PIN을 모두 초기화할까요?\n초기화 후 학생은 다음 로그인에서 새 PIN을 직접 설정해야 합니다.`,
    );
    if (!confirmed) return false;

    try {
      const chunkSize = 200;
      for (let offset = 0; offset < studentsWithPin.length; offset += chunkSize) {
        const batch = writeBatch(db);
        studentsWithPin.slice(offset, offset + chunkSize).forEach((student) => {
          const studentRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, student.id);
          const rosterRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classRoster, student.id);
          batch.update(studentRef, {
            studentPin: '',
            updatedAt: serverTimestamp(),
          });
          batch.set(rosterRef, {
            hasPin: false,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        await batch.commit();
      }
      alert(`${selectedClassName} 학생 ${studentsWithPin.length}명의 PIN을 초기화했습니다.`);
      return true;
    } catch (error) {
      console.error(error);
      alert('학급 전체 PIN 초기화 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      return false;
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

  const completeStudentLogin = (result) => {
    if (!result?.profile || Number(result.sessionExpiresAt) <= Date.now()) return false;
    const profile = normalizeClassStudent(result.profile);
    if (duelHistoryStudentId && duelHistoryStudentId !== profile.id) {
      setDuelHistoryRecords([]);
      setDuelHistoryCursor(0);
      setDuelHistoryHasMore(false);
      setDuelHistoryStudentId('');
    }
    setStudentProfile(profile);
    setStudentSessionExpiresAt(Number(result.sessionExpiresAt));
    setNickname(profile.name || '');
    setStudentLoginClassId(profile.classId || '');
    duelRecoveryStudentRef.current = '';
    setIsPracticeMode(false);
    setView('login');
    return true;
  };

  const handleStudentLoginPin = async (studentId, pin) => {
    const result = await verifyStudentLoginPin(studentId, pin);
    completeStudentLogin(result);
    return result;
  };

  const handleStudentInitialLoginPin = async (studentId, pin) => {
    const result = await setInitialStudentLoginPin(studentId, pin);
    completeStudentLogin(result);
    return result;
  };

  const handleStudentLogout = async () => {
    await logoutStudentSession().catch((error) => console.error(error));
    clearStudentDirectoryCache(user?.uid || '');
    setStudentProfile(null);
    setStudentSessionExpiresAt(0);
    setStudentLoginClassId('');
    setNickname('');
    setOutgoingDuelTargetId('');
    setActiveDuelId('');
    setIsDuelMode(false);
    setDuelHistoryRecords([]);
    setDuelHistoryCursor(0);
    setDuelHistoryHasMore(false);
    setDuelHistoryError('');
    setDuelHistoryStudentId('');
    duelRecoveryStudentRef.current = '';
    setView('entry');
  };

  const refreshStudentProfile = useCallback(async () => {
    if (!studentProfile?.id) return null;

    try {
      const result = await getStudentSession();
      if (result?.profile && Number(result.sessionExpiresAt) > Date.now()) {
        const nextProfile = normalizeClassStudent(result.profile);
        setStudentProfile(nextProfile);
        setStudentSessionExpiresAt(Number(result.sessionExpiresAt));
        return nextProfile;
      }
    } catch (error) {
      console.error(error);
      alert('학생 정보를 새로고침하지 못했습니다. 다시 로그인해 주세요.');
    }

    return null;
  }, [studentProfile?.id]);

  const loadDuelHistoryPage = async (studentId, cursorMillis = 0, replace = false) => {
    if (!studentId || duelHistoryLoading) return;
    setDuelHistoryLoading(true);
    setDuelHistoryError('');
    try {
      const result = await getDuelHistory(studentId, cursorMillis);
      const nextRecords = Array.isArray(result?.records) ? result.records : [];
      setDuelHistoryRecords((previous) => replace ? nextRecords : [...previous, ...nextRecords]);
      setDuelHistoryCursor(Number(result?.nextCursorMillis || 0));
      setDuelHistoryHasMore(Boolean(result?.hasMore));
      setDuelHistoryStudentId(studentId);
    } catch (error) {
      console.error(error);
      setDuelHistoryError(error.message || '결투 전적을 불러오지 못했습니다.');
    } finally {
      setDuelHistoryLoading(false);
    }
  };

  const handleOpenDuelHistory = () => {
    if (!studentProfile?.id) return;
    setView('duelHistory');
    if (duelHistoryStudentId === studentProfile.id) return;
    setDuelHistoryRecords([]);
    setDuelHistoryCursor(0);
    setDuelHistoryHasMore(false);
    loadDuelHistoryPage(studentProfile.id, 0, true);
  };

  const loadTeacherDuelHistoryPage = async (cursorMillis = 0, replace = false) => {
    if (teacherDuelHistoryLoading) return;
    setTeacherDuelHistoryLoading(true);
    setTeacherDuelHistoryError('');
    try {
      const result = await getTeacherDuelHistory(cursorMillis);
      const nextRecords = Array.isArray(result?.records) ? result.records : [];
      setTeacherDuelHistoryRecords((previous) => replace ? nextRecords : [...previous, ...nextRecords]);
      setTeacherDuelHistoryCursor(Number(result?.nextCursorMillis || 0));
      setTeacherDuelHistoryHasMore(Boolean(result?.hasMore));
      setTeacherDuelHistoryLoaded(true);
    } catch (error) {
      console.error(error);
      setTeacherDuelHistoryError(error.message || '전체 결투 전적을 불러오지 못했습니다.');
    } finally {
      setTeacherDuelHistoryLoading(false);
    }
  };

  const handleOpenTeacherDuelHistory = () => {
    if (teacherDuelHistoryLoaded) return;
    loadTeacherDuelHistoryPage(0, true);
  };

  const handleRefreshTeacherDuelHistory = () => {
    setTeacherDuelHistoryCursor(0);
    setTeacherDuelHistoryHasMore(false);
    loadTeacherDuelHistoryPage(0, true);
  };

  const handleFinalizeSelectedDuel = async () => {
    if (!requireTeacherAccess()) return;
    const duel = selectedTeacherLiveDuel;
    if (!duel?.id || duel.status !== 'playing' || teacherFinalizingDuelId) return;

    const endsAtMillis = toDuelMillis(duel.endsAt);
    if (!endsAtMillis) {
      alert('종료 시간이 없는 결투는 결과를 확정할 수 없습니다.');
      return;
    }
    const expiresAt = endsAtMillis + DUEL_RULES.finalizeGraceMs;
    if (Date.now() < expiresAt) {
      alert('종료 시간이 지난 결투만 결과를 확정할 수 있습니다.');
      return;
    }

    const challengerScore = selectedTeacherLiveScores.find(
      (scoreItem) => scoreItem.studentId === duel.challengerStudentId,
    );
    const targetScore = selectedTeacherLiveScores.find(
      (scoreItem) => scoreItem.studentId === duel.targetStudentId,
    );
    const confirmed = window.confirm(
      `${duel.challengerName || '선수'} ${Number(challengerScore?.score || 0).toLocaleString()}점\n`
      + `${duel.targetName || '선수'} ${Number(targetScore?.score || 0).toLocaleString()}점\n\n`
      + '마지막 저장 점수로 결투 결과를 확정할까요?',
    );
    if (!confirmed) return;

    setTeacherFinalizingDuelId(duel.id);
    try {
      const result = await finalizeExpiredDuel(duel.id);
      const finalized = result?.duel;
      if (!finalized) throw new Error('결투 결과가 반환되지 않았습니다.');
      const resultMessage = finalized.result === 'draw'
        ? '무승부로 확정되어 양쪽 승부 포인트가 반환되었습니다.'
        : `${finalized.winnerStudentId === finalized.challengerStudentId ? finalized.challengerName : finalized.targetName} 승리로 확정되었습니다.`;
      alert(resultMessage);
      if (teacherDuelHistoryLoaded) handleRefreshTeacherDuelHistory();
    } catch (error) {
      console.error(error);
      alert(error.message || '결투 결과를 확정하지 못했습니다.');
    } finally {
      setTeacherFinalizingDuelId('');
    }
  };

  const handleCancelAllActiveDuels = async () => {
    if (!requireTeacherAccess() || teacherCancellingAllDuels) return;
    if (teacherLiveDuels.length === 0) {
      alert('현재 취소할 진행 중 결투가 없습니다.');
      return;
    }
    if (!window.confirm('현재 진행 중인 모든 결투를 취소할까요?\n양쪽 학생에게 승부 포인트 5P가 반환됩니다.')) return;

    setTeacherCancellingAllDuels(true);
    try {
      const result = await cancelAllActiveDuels();
      const cancelledCount = Number(result?.cancelledCount || 0);
      const failedCount = Number(result?.failedCount || 0);
      setSelectedTeacherLiveDuelId('');
      alert(failedCount > 0
        ? `${cancelledCount}경기를 취소했습니다. ${failedCount}경기는 처리하지 못했으니 목록을 확인하고 다시 시도해 주세요.`
        : `진행 중인 결투 ${cancelledCount}경기를 취소하고 승부 포인트를 반환했습니다.`);
    } catch (error) {
      console.error(error);
      alert(error.message || '진행 중인 결투를 일괄 취소하지 못했습니다.');
    } finally {
      setTeacherCancellingAllDuels(false);
    }
  };

  const handleToggleDuelAvailability = async () => {
    if (!requireTeacherAccess() || teacherUpdatingDuelAvailability) return;
    setTeacherUpdatingDuelAvailability(true);
    try {
      const settingsRef = getPublicDoc(db, APP_ID, FIRESTORE_PATHS.settings, 'duel');
      await setDoc(settingsRef, {
        enabled: !duelEnabled,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      }, { merge: true });
    } catch (error) {
      console.error(error);
      alert('결투 기능 설정을 변경하지 못했습니다. 관리자 권한과 Firestore Rules를 확인해 주세요.');
    } finally {
      setTeacherUpdatingDuelAvailability(false);
    }
  };

  const handleCreateDuelChallenge = async (targetStudent) => {
    if (!studentProfile?.id || !targetStudent?.id || duelProcessing) return;
    if (!duelEnabled || duelAvailabilityLoading) {
      alert('선생님이 현재 결투 기능을 닫았습니다.');
      return;
    }
    if (Number(studentProfile.totalPoints || 0) < DUEL_RULES.stakePoints) {
      alert('결투를 신청하려면 최소 5P가 필요합니다.');
      return;
    }
    if (getCurrentDuelDailyWinPoints(studentProfile) >= DUEL_RULES.dailyWinPointLimit) {
      alert('오늘 결투 획득 한도 15P를 모두 채웠습니다. 자정 이후 다시 도전하세요.');
      return;
    }

    setDuelProcessing(true);
    try {
      const result = await createDuelChallenge(targetStudent.id);
      setOutgoingDuelTargetId(result?.challenge?.id || '');
      setView('login');
    } catch (error) {
      console.error(error);
      const messages = {
        'api/duels-disabled': '선생님이 현재 결투 기능을 닫았습니다.',
        'api/failed-precondition': error.message,
        'api/already-exists': error.message,
        'api/permission-denied': '학생 로그인 시간이 만료되었습니다. 다시 로그인해주세요.',
      };
      alert(messages[error.code] || '결투 신청을 보내지 못했습니다.');
    } finally {
      setDuelProcessing(false);
    }
  };

  const handleRejectDuelChallenge = async () => {
    if (!studentProfile?.id || duelProcessing) return;
    setDuelProcessing(true);
    try {
      await rejectDuelChallenge(studentProfile.id);
    } catch (error) {
      console.error(error);
      alert('결투 신청을 거절하는 중 오류가 발생했습니다.');
    } finally {
      setDuelProcessing(false);
    }
  };

  const handleAcceptDuelChallenge = async () => {
    if (!studentProfile?.id || duelProcessing) return;
    if (!duelEnabled || duelAvailabilityLoading) {
      alert('선생님이 현재 결투 기능을 닫았습니다.');
      return;
    }
    if (getCurrentDuelDailyWinPoints(studentProfile) >= DUEL_RULES.dailyWinPointLimit) {
      alert('오늘 결투 획득 한도 15P를 모두 채웠습니다. 자정 이후 다시 도전하세요.');
      return;
    }
    setDuelProcessing(true);
    try {
      const result = await acceptDuelChallenge(
        studentProfile.id,
        createDuelQuizSequence(quizzes),
      );
      if (!result?.duel?.id) throw new Error('결투 생성 결과가 없습니다.');
      setActiveDuelId(result.duel.id);
      setDuelResultData(null);
      setIsDuelMode(true);
      setOutgoingDuelTargetId('');
      const refreshed = await getStudentSession();
      if (refreshed?.profile) setStudentProfile(normalizeClassStudent(refreshed.profile));
      setView('duelCountdown');
    } catch (error) {
      console.error(error);
      alert(error.message || '결투를 시작하지 못했습니다.');
    } finally {
      setDuelProcessing(false);
    }
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
      const result = await buyStudentShopItem(normalizedStudent.id, shopItem.id);
      if (result?.profile && studentProfile?.id === normalizedStudent.id) {
        setStudentProfile((previous) => normalizeClassStudent({ ...previous, ...result.profile }));
      }
      await refreshShopItems();
      return result;
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
      await refreshShopItems();
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
      await refreshShopItems();
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
      if (result?.profile && studentProfile?.id === normalizedStudent.id) {
        setStudentProfile((previous) => normalizeClassStudent({ ...previous, ...result.profile }));
      }
      await refreshShopItems();
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

    try {
      const result = await equipStudentCosmetic(normalizedStudent.id, cosmetic.id);
      if (result?.profile && studentProfile?.id === normalizedStudent.id) {
        setStudentProfile((previous) => normalizeClassStudent({ ...previous, ...result.profile }));
      }
      return result;
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

  const getHallOfFameTitleAwards = () => {
    return getHallOfFameTitleWinners(hallOfFame).map(({ category, winner }) => ({
      titleId: HALL_OF_FAME_TITLE_IDS[category],
      winner,
    }));
  };

  const handleGrantHallOfFameTitles = async () => {
    if (!requireTeacherAccess() || isHallTitleBatchUpdating) return;
    if (hallOfFameLoadedMonthKey !== hallOfFameMonthKey) {
      alert('선택한 달의 명예의 전당 기록을 불러온 뒤 칭호를 지급해 주세요.');
      return;
    }

    const awards = getHallOfFameTitleAwards();
    if (awards.length === 0) {
      alert('지급할 명예의 전당 1위 기록이 없습니다. 먼저 해당 월 기록을 불러와 저장해 주세요.');
      return;
    }

    const awardSummary = awards
      .map(({ titleId, winner }) => `${getCosmeticById(titleId)?.name || titleId}: ${winner.className || ''} ${winner.nickname || ''}`.trim())
      .join('\n');
    if (!window.confirm(`${hallOfFameMonthKey} 명예의 전당 칭호를 다음 학생에게 지급할까요?\n\n${awardSummary}`)) return;

    setIsHallTitleBatchUpdating(true);
    try {
      const awardsByStudent = new Map();
      awards.forEach(({ titleId, winner }) => {
        const studentId = String(winner.studentId);
        const current = awardsByStudent.get(studentId) || [];
        awardsByStudent.set(studentId, [...new Set([...current, titleId])]);
      });

      const batch = writeBatch(db);
      awardsByStudent.forEach((titleIds, studentId) => {
        batch.update(getPublicDoc(db, APP_ID, FIRESTORE_PATHS.classStudents, studentId), {
          ownedCosmetics: arrayUnion(...titleIds),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      alert(`명예의 전당 칭호 ${awards.length}개를 일괄 지급했습니다.`);
    } catch (error) {
      console.error(error);
      alert('명예의 전당 칭호 일괄 지급 중 오류가 발생했습니다.');
    } finally {
      setIsHallTitleBatchUpdating(false);
    }
  };

  const handleRevokeHallOfFameTitles = async () => {
    if (!requireTeacherAccess() || isHallTitleBatchUpdating) return;
    if (!window.confirm('현재 모든 학생이 보유한 MVP·퀴즈왕·스피드왕·꾸준왕 칭호를 회수할까요?\n일반 상점 장식은 유지됩니다.')) return;

    setIsHallTitleBatchUpdating(true);
    try {
      const studentsRef = getPublicCollection(db, APP_ID, FIRESTORE_PATHS.classStudents);
      const titleHoldersSnapshot = await getDocs(query(
        studentsRef,
        where('ownedCosmetics', 'array-contains-any', HALL_OF_FAME_TITLE_ID_LIST),
      ));

      if (titleHoldersSnapshot.empty) {
        alert('회수할 명예의 전당 칭호가 없습니다.');
        return;
      }

      const batch = writeBatch(db);
      titleHoldersSnapshot.docs.forEach((studentSnapshot) => {
        const student = studentSnapshot.data();
        const updates = {
          ownedCosmetics: arrayRemove(...HALL_OF_FAME_TITLE_ID_LIST),
          updatedAt: serverTimestamp(),
        };
        if (HALL_OF_FAME_TITLE_ID_LIST.includes(student.equippedCosmetic)) {
          updates.equippedCosmetic = null;
        }
        batch.update(studentSnapshot.ref, updates);
      });
      await batch.commit();
      alert(`${titleHoldersSnapshot.size}명의 명예의 전당 칭호를 일괄 회수했습니다.`);
    } catch (error) {
      console.error(error);
      alert('명예의 전당 칭호 일괄 회수 중 오류가 발생했습니다.');
    } finally {
      setIsHallTitleBatchUpdating(false);
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

    const latestByStudent = new Map();

    filteredScores.forEach((scoreItem) => {
      const studentKey = scoreItem.studentId
        ? `student:${scoreItem.studentId}`
        : `guest:${scoreItem.nickname || scoreItem.userId || scoreItem.id}`;
      const previous = latestByStudent.get(studentKey);
      const currentUpdatedAt = getTimestampMillis(scoreItem.updatedAt)
        || getTimestampMillis(scoreItem.createdAt);
      const previousUpdatedAt = getTimestampMillis(previous?.updatedAt)
        || getTimestampMillis(previous?.createdAt);
      const currentHasProgress = Number(scoreItem.score || 0) !== 0
        || Number(scoreItem.correctChars || 0) > 0
        || Number(scoreItem.quizCorrectCount || 0) > 0;
      const previousHasProgress = Number(previous?.score || 0) !== 0
        || Number(previous?.correctChars || 0) > 0
        || Number(previous?.quizCorrectCount || 0) > 0;
      const shouldPreferProgress = viewingRoomId !== 'all'
        && currentHasProgress !== previousHasProgress;

      if (
        !previous
        || (shouldPreferProgress && currentHasProgress)
        || (!shouldPreferProgress && currentUpdatedAt > previousUpdatedAt)
        || (
          !shouldPreferProgress
          && currentUpdatedAt === previousUpdatedAt
          && Number(scoreItem.score || 0) > Number(previous.score || 0)
        )
      ) {
        latestByStudent.set(studentKey, scoreItem);
      }
    });

    return [...latestByStudent.values()].sort((a, b) => (b.score || 0) - (a.score || 0));
  };

  const handleBackToLogin = () => {
    window.history.replaceState({}, '', '/');
    setView(studentProfile ? 'login' : 'entry');
    setPwdError('');
    setIsPracticeMode(false);
    setSelectedOpenClassRoomId('');
    setSelectedRoomId('');
    setCurrentScoreDocId(null);
    setMyRoomData(null);
  };

  const handleTeacherLogout = async () => {
    await signOutFirebaseUser().catch((error) => console.error(error));
    window.sessionStorage.removeItem('pw_typing_teacher_gate');
    setTeacherGatePassed(false);
    setTeacherGatePassword('');
    setTeacherDuelHistoryRecords([]);
    setTeacherDuelHistoryCursor(0);
    setTeacherDuelHistoryHasMore(false);
    setTeacherDuelHistoryError('');
    setTeacherDuelHistoryLoaded(false);
    handleBackToLogin();
  };

  const handleTeacherLoginBack = async () => {
    if (user && !user.isAnonymous) {
      await signOutFirebaseUser().catch((error) => console.error(error));
    }
    window.sessionStorage.removeItem('pw_typing_teacher_gate');
    setTeacherGatePassed(false);
    setTeacherGatePassword('');
    handleBackToLogin();
  };

  const openTeacherLogin = () => {
    if (window.location.pathname.replace(/\/$/, '') !== TEACHER_PATH) {
      window.history.pushState({}, '', TEACHER_PATH);
    }
    setIsPracticeMode(false);
    setPwdError('');
    setView('teacherLogin');
  };

  if (!authReady || !studentSessionChecked) {
    return (
      <div className="min-h-screen spring-bg flex items-center justify-center p-4">
        <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full z-10 relative shadow-xl">
          <div className="text-5xl mb-4 animate-bounce">🌸</div>
          <p className="text-gray-600 font-bold">접속 준비 중...</p>
        </div>
      </div>
    );
  }

  if (view === 'teacherLogin' || (view === 'teacher' && (!teacherAuthorized || !teacherGatePassed))) {
    return (
      <TeacherLoginView
        error={pwdError}
        isLoading={teacherLoginLoading}
        teacherUidConfigured={Boolean(TEACHER_UID)}
        currentUser={user}
        gatePassed={teacherGatePassed}
        gatePassword={teacherGatePassword}
        setGatePassword={setTeacherGatePassword}
        onBack={handleTeacherLoginBack}
        onGateSubmit={handleTeacherGateSubmit}
        onGoogleSignIn={handleTeacherSubmit}
      />
    );
  }

  if (view === 'studentLogin') {
    return (
      <StudentLoginView
        classes={classes}
        classStudents={classStudents}
        selectedClassId={studentLoginClassId}
        setSelectedClassId={setStudentLoginClassId}
        onVerifyPin={handleStudentLoginPin}
        onSetInitialPin={handleStudentInitialLoginPin}
        onBack={() => setView('entry')}
      />
    );
  }

  if (view === 'assessment' && studentProfile && selectedAssessmentId) {
    return (
      <AssessmentView
        assessmentId={selectedAssessmentId}
        studentProfile={studentProfile}
        onHome={() => {
          setSelectedAssessmentId('');
          setView('login');
        }}
      />
    );
  }

  if (view === 'duelChallenge' && studentProfile) {
    return (
      <DuelChallengeView
        student={studentProfile}
        classes={classes}
        students={classStudents}
        selectedClassId={duelClassId}
        setSelectedClassId={setDuelClassId}
        isSubmitting={duelProcessing}
        duelEnabled={duelEnabled}
        availabilityLoading={duelAvailabilityLoading}
        onChallenge={handleCreateDuelChallenge}
        onBack={() => setView('login')}
      />
    );
  }

  if (view === 'duelHistory' && studentProfile) {
    return (
      <DuelHistoryView
        records={duelHistoryRecords}
        studentId={studentProfile.id}
        isLoading={duelHistoryLoading}
        hasMore={duelHistoryHasMore}
        error={duelHistoryError}
        onLoadMore={() => loadDuelHistoryPage(studentProfile.id, duelHistoryCursor, false)}
        onBack={() => setView('login')}
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
        initialTab="guest"
        guestOnly
      />
    );
  }

  if (view === 'studentRoomEntry') {
    return (
      <StudentRoomEntryView
        student={studentProfile}
        rooms={studentOpenClassRooms}
        isLoading={openClassRoomsLoading}
        onRefresh={refreshOpenClassRooms}
        onJoin={handleJoinClassStudent}
        onBack={() => setView('login')}
      />
    );
  }

  if (view === 'waiting') {
    return (
      <WaitingView
        nickname={nickname}
        myRoomData={myRoomData}
        onLeave={() => {
          const nextView = studentProfile && myRoomData?.entryType === 'class' ? 'studentRoomEntry' : 'studentLobby';
          setSelectedRoomId('');
          setCurrentScoreDocId(null);
          setMyRoomData(null);
          setView(nextView);
        }}
      />
    );
  }

  if (view === 'duelCountdown' && studentProfile) {
    if (!activeDuel || !myDuelScore) {
      return (
        <div className="min-h-screen spring-bg flex items-center justify-center p-4">
          <div className="glass-box rounded-3xl p-10 text-center font-black text-gray-600 shadow-xl">
            ⚔️ 결투 경기장을 준비하고 있습니다...
          </div>
        </div>
      );
    }
    return (
      <DuelCountdownView
        duel={activeDuel}
        studentId={studentProfile.id}
        onReady={startDuelGame}
      />
    );
  }

  if (view === 'duelFinishing') {
    return (
      <div className="min-h-screen spring-bg flex items-center justify-center p-4">
        <div className="glass-box rounded-3xl p-10 text-center max-w-md w-full shadow-2xl border border-rose-100">
          <div className="text-6xl animate-pulse mb-4">⚔️</div>
          <h1 className="text-2xl font-black text-gray-800">결투 결과 확정 중</h1>
          <p className="text-sm font-bold text-gray-500 mt-2">두 선수의 마지막 점수와 포인트를 안전하게 처리하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (view === 'duelResult' && studentProfile) {
    return (
      <DuelResultView
        duel={duelResultData || activeDuel}
        studentId={studentProfile.id}
        onHome={() => {
          setActiveDuelId('');
          setDuelResultData(null);
          setOutgoingDuelTargetId('');
          setIsDuelMode(false);
          isEndingRef.current = false;
          setView('login');
        }}
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
        onInputDelete={() => setCombo(0)}
        handleQuizAnswer={handleQuizAnswer}
        boosterAvailable={boosterAvailable}
        boosterActive={boosterActive}
        boosterTimeLeft={boosterTimeLeft}
        activateBooster={activateBooster}
        inputRef={inputRef}
        duelInfo={isDuelMode && activeDuel ? {
          myName: studentProfile?.name || nickname,
          opponentName: activeDuel.challengerStudentId === studentProfile?.id
            ? activeDuel.targetName
            : activeDuel.challengerName,
          opponentScore: Number(opponentDuelScore?.score || 0),
        } : null}
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
        scoreSaveFailed={scoreSaveFailed}
        onRetryScoreSave={endGame}
        onHome={handleBackToLogin}
        onPracticeAgain={startPractice}
      />
    );
  }

  if (view === 'hallOfFame' && studentProfile) {
    return (
      <StudentHallOfFameView
        monthKey={hallOfFameMonthKey}
        setMonthKey={setHallOfFameMonthKey}
        hallOfFame={hallOfFame}
        savedAt={hallOfFameSavedAt}
        isLoading={isHallOfFameLoading}
        error={hallOfFameError}
        onBack={() => setView('login')}
      />
    );
  }

  if (view === 'teacher') {
    return (
      <TeacherDashboardView
        activeSection={teacherSection}
        setActiveSection={setTeacherSection}
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
        handleResetClassStudentPins={handleResetClassStudentPins}
        handleSyncPublicRoster={handleSyncPublicRoster}
        handleSetStudentPoints={handleSetStudentPoints}
        handleAdjustStudentPoints={handleAdjustStudentPoints}
        handleGrantStudentCosmetic={handleGrantStudentCosmetic}
        handleRemoveStudentCosmetic={handleRemoveStudentCosmetic}
        handleResetStudentCosmetics={handleResetStudentCosmetics}
        shopItems={shopItems}
        shopPurchases={shopPurchases}
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
        canRefreshHallOfFameToday={canRefreshHallOfFameToday}
        isHallOfFameLoading={isHallOfFameLoading}
        hallOfFameError={hallOfFameError}
        grantHallOfFameTitles={handleGrantHallOfFameTitles}
        revokeHallOfFameTitles={handleRevokeHallOfFameTitles}
        isHallTitleBatchUpdating={isHallTitleBatchUpdating}
        hallOfFameTitlesReady={hallOfFameLoadedMonthKey === hallOfFameMonthKey}
        duelHistoryRecords={teacherDuelHistoryRecords}
        duelHistoryLoading={teacherDuelHistoryLoading}
        duelHistoryHasMore={teacherDuelHistoryHasMore}
        duelHistoryError={teacherDuelHistoryError}
        openDuelHistory={handleOpenTeacherDuelHistory}
        loadMoreDuelHistory={() => loadTeacherDuelHistoryPage(teacherDuelHistoryCursor, false)}
        refreshDuelHistory={handleRefreshTeacherDuelHistory}
        liveDuels={teacherLiveDuels}
        selectedLiveDuelId={selectedTeacherLiveDuelId}
        setSelectedLiveDuelId={setSelectedTeacherLiveDuelId}
        selectedLiveDuel={selectedTeacherLiveDuel}
        selectedLiveScores={selectedTeacherLiveScores}
        liveDuelsLoading={teacherLiveLoading}
        liveDuelsError={teacherLiveError}
        liveDuelDetailError={selectedTeacherLiveScoresError}
        finalizingLiveDuelId={teacherFinalizingDuelId}
        finalizeSelectedLiveDuel={handleFinalizeSelectedDuel}
        cancelAllLiveDuels={handleCancelAllActiveDuels}
        isCancellingAllLiveDuels={teacherCancellingAllDuels}
        duelEnabled={duelEnabled}
        duelAvailabilityLoading={duelAvailabilityLoading}
        duelAvailabilityError={duelAvailabilityError}
        toggleDuelAvailability={handleToggleDuelAvailability}
        isUpdatingDuelAvailability={teacherUpdatingDuelAvailability}
        onLiveSectionChange={(isEnabled) => {
          setTeacherLiveEnabled(isEnabled);
          if (!isEnabled) setSelectedTeacherLiveDuelId('');
        }}
      />
    );
  }

  if (view === 'entry' || !studentProfile) {
    return (
      <EntryView
        onStudentLogin={() => {
          setStudentLoginClassId('');
          setView('studentLogin');
        }}
        onGuestEntry={() => {
          setNickname('');
          setIsPracticeMode(false);
          setView('studentLobby');
        }}
        onPractice={() => {
          setNickname('');
          setIsPracticeMode(false);
          setView('studentLobby');
        }}
      />
    );
  }

  return (
    <>
      <LoginView
        announcements={announcements}
        showAnnouncementModal={showAnnouncementModal}
        setShowAnnouncementModal={setShowAnnouncementModal}
        onStudentClick={() => {
          setIsPracticeMode(false);
          setView('studentRoomEntry');
        }}
        onPracticeClick={startPractice}
        onGuestClick={() => setView('studentLobby')}
        onHallOfFameClick={() => setView('hallOfFame')}
        onDuelClick={() => {
          if (!duelEnabled || duelAvailabilityLoading) {
            alert('선생님이 현재 결투 기능을 닫았습니다.');
            return;
          }
          setDuelClassId('');
          setView('duelChallenge');
        }}
        duelEnabled={duelEnabled}
        duelAvailabilityLoading={duelAvailabilityLoading}
        onDuelHistoryClick={handleOpenDuelHistory}
        onStudentLogout={handleStudentLogout}
        onTeacherClick={openTeacherLogin}
        studentProfile={studentProfile}
        shopItems={shopItems}
        onBuyCosmetic={handleBuyCosmetic}
        onBuyStockItem={handleBuyStockItem}
        onEquipCosmetic={handleEquipCosmetic}
        onRefreshStudentProfile={refreshStudentProfile}
        onOpenAssessment={(assessmentId) => {
          setSelectedAssessmentId(assessmentId);
          setView('assessment');
        }}
      />
      {view === 'login' && (
        <DuelChallengeModal
          challenge={incomingChallenge?.targetStudentId === studentProfile?.id ? incomingChallenge : null}
          isProcessing={duelProcessing}
          canAccept={duelEnabled
            && !duelAvailabilityLoading
            && getCurrentDuelDailyWinPoints(studentProfile) < DUEL_RULES.dailyWinPointLimit}
          disabledReason={!duelEnabled
            ? '선생님이 현재 결투 기능을 닫았습니다.'
            : duelAvailabilityLoading
              ? '결투 가능 여부를 확인하고 있습니다.'
              : '오늘 결투 획득 한도 15P를 모두 채워 수락할 수 없습니다.'}
          onAccept={handleAcceptDuelChallenge}
          onReject={handleRejectDuelChallenge}
        />
      )}
      {view === 'login' && outgoingDuelTargetId && (
        <DuelOutgoingModal
          challenge={outgoingChallenge?.challengerStudentId === studentProfile?.id ? outgoingChallenge : null}
          onClose={() => setOutgoingDuelTargetId('')}
        />
      )}
    </>
  );
}

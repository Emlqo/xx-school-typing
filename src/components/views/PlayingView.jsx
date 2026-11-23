import { useEffect, useState } from 'react';
import { getExpectedInputLanguage } from '../../utils/inputLanguage.js';
import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import BoosterButton from '../game/BoosterButton.jsx';
import GameStatusBar from '../game/GameStatusBar.jsx';
import QuizCard from '../game/QuizCard.jsx';
import TypingInput from '../game/TypingInput.jsx';
import WordDisplay from '../game/WordDisplay.jsx';
import DuelScoreboard from '../duel/DuelScoreboard.jsx';
import './PracticeGearEffects.css';

export default function PlayingView({
  nickname = '',
  currentWord = '',
  inputValue = '',
  setInputValue = () => {},
  combo = 0,
  showSuccess = false,
  lastEarned = 0,
  score = 0,
  timeLeft = 0,
  formatTime = (value) => value,
  isError = false,
  setIsError = () => {},
  currentQuiz = null,
  handleKeyDown = () => {},
  onInputDelete = () => {},
  handleQuizAnswer = () => {},
  boosterAvailable = true,
  boosterActive = false,
  boosterTimeLeft = 0,
  boosterBonusSeconds = 0,
  activateBooster = () => {},
  practiceGearEffects = null,
  practiceGearCue = '',
  quizAnswerPending = false,
  inputRef = null,
  duelInfo = null,
}) {
  const [languageMismatch, setLanguageMismatch] = useState(null);
  const progress = currentWord.length > 0
    ? Math.min((inputValue.length / currentWord.length) * 100, 100)
    : 0;
  const inputLanguage = currentQuiz ? 'quiz' : getExpectedInputLanguage(currentWord, inputValue.length);

  useEffect(() => {
    setLanguageMismatch(null);
  }, [currentQuiz, currentWord]);

  const handleProtectedKeyDown = (event) => {
    const isSubmitKey = event.key === 'Enter' || event.key === ' ';
    if (languageMismatch && isSubmitKey) {
      event.preventDefault();
      return;
    }
    handleKeyDown(event);
  };

  return (
    <div className={`typing-playfield min-h-screen flex flex-col p-3 md:p-5 pb-24 md:pb-28 relative overflow-hidden transition-colors duration-500 ${boosterActive ? 'booster-bg' : 'spring-bg'}`}>
      <CherryBlossomBackground />

      <BoosterButton
        boosterEnabled
        boosterActive={boosterActive}
        boosterAvailable={boosterAvailable}
        boosterTimeLeft={boosterTimeLeft}
        onActivate={activateBooster}
      />

      {showSuccess && (
        <div className="animate-success-pop flex flex-col items-center">
          <div className="text-4xl md:text-5xl font-black text-pink-500 drop-shadow-md italic">
            {combo > 1 ? `${combo} COMBO ❄` : 'PERFECT!'}
          </div>
          <div className="text-2xl font-bold text-yellow-500 mt-1">+{lastEarned}</div>
        </div>
      )}

      <GameStatusBar
        nickname={nickname}
        combo={combo}
        pointWeight={1.0}
        score={score}
        boosterActive={boosterActive}
        timeLeft={timeLeft}
        formatTime={formatTime}
        inputLanguage={inputLanguage}
        languageMismatch={languageMismatch}
      />

      {boosterBonusSeconds > 0 && (
        <div className="practice-gear-badges">
          <span>부스터 +{boosterBonusSeconds}초</span>
          {practiceGearEffects?.quizShield && <span>퀴즈 보호 1회</span>}
          {practiceGearEffects?.level >= 12 && !practiceGearEffects.quizShield && <span>퀴즈 보호 사용 완료</span>}
        </div>
      )}

      {duelInfo && (
        <DuelScoreboard
          myName={duelInfo.myName}
          myScore={score}
          opponentName={duelInfo.opponentName}
          opponentScore={duelInfo.opponentScore}
        />
      )}

      <div className="relative flex-1 flex flex-col items-center justify-center max-w-3xl w-full mx-auto z-10 py-3">
        {practiceGearCue && (
          <div key={practiceGearCue} className="practice-gear-cue" data-cue={practiceGearCue} role="status">
            <span aria-hidden="true" className="practice-gear-pulse" />
            <strong>{practiceGearCue === 'booster' ? `⚡ 부스터 연장 · ${boosterTimeLeft}초` : '🛡 퀴즈 보호 · 점수와 콤보 유지!'}</strong>
          </div>
        )}
        {currentQuiz ? (
          <QuizCard
            currentQuiz={currentQuiz}
            handleQuizAnswer={handleQuizAnswer}
            answerPending={quizAnswerPending}
            shieldAvailable={Boolean(practiceGearEffects?.quizShield)}
          />
        ) : (
          <>
            <WordDisplay
              currentWord={currentWord}
              inputValue={inputValue}
            />

            <TypingInput
              currentWord={currentWord}
              inputValue={inputValue}
              setInputValue={setInputValue}
              setIsError={setIsError}
              handleKeyDown={handleProtectedKeyDown}
              inputRef={inputRef}
              boosterActive={boosterActive}
              combo={combo}
              isError={isError}
              onLanguageMismatch={setLanguageMismatch}
              onLanguageAccepted={() => setLanguageMismatch(null)}
              onDelete={onInputDelete}
            />

            <p className="mt-4 bg-white rounded-lg px-3 py-1.5 text-gray-700 text-xs sm:text-sm font-medium text-center">
              백스페이스(지우기)를 누르거나 오답 제출 시 <span className="text-red-700">콤보가 초기화</span>됩니다.
            </p>

            <div className="w-full h-1.5 bg-white/50 rounded-full mt-3 overflow-hidden border border-pink-100">
              <div
                className={`h-full transition-all duration-300 ${isError ? 'bg-red-400' : boosterActive ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-pink-300 to-pink-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

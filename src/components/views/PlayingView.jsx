import CherryBlossomBackground from '../common/CherryBlossomBackground.jsx';
import BoosterButton from '../game/BoosterButton.jsx';
import GameStatusBar from '../game/GameStatusBar.jsx';
import QuizCard from '../game/QuizCard.jsx';
import TypingInput from '../game/TypingInput.jsx';
import WordDisplay from '../game/WordDisplay.jsx';

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
  postQuizLanguageCheck = false,
  handleKeyDown = () => {},
  handleQuizAnswer = () => {},
  boosterAvailable = true,
  boosterActive = false,
  boosterTimeLeft = 0,
  activateBooster = () => {},
  inputRef = null,
}) {
  const progress = currentWord.length > 0
    ? Math.min((inputValue.length / currentWord.length) * 100, 100)
    : 0;
  const inputLanguage = currentQuiz
    ? 'quiz'
    : /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(currentWord)
      ? 'ko'
      : 'en';
  const detectedInputLanguage = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(inputValue)
    ? 'ko'
    : /[A-Za-z]/.test(inputValue)
      ? 'en'
      : '';

  return (
    <div className={`min-h-screen flex flex-col p-4 md:p-8 relative overflow-hidden transition-colors duration-500 ${boosterActive ? 'booster-bg' : 'spring-bg'}`}>
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
            {combo > 1 ? `${combo} COMBO 🌸` : 'PERFECT!'}
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
        detectedInputLanguage={detectedInputLanguage}
        postQuizLanguageCheck={postQuizLanguageCheck}
      />

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl w-full mx-auto -mt-10 md:-mt-20 z-10">
        {currentQuiz ? (
          <QuizCard
            currentQuiz={currentQuiz}
            handleQuizAnswer={handleQuizAnswer}
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
              handleKeyDown={handleKeyDown}
              inputRef={inputRef}
              boosterActive={boosterActive}
              combo={combo}
              isError={isError}
            />

            <p className="mt-8 text-gray-500 text-sm font-medium">
              백스페이스(지우기)를 누르거나 오답 제출 시 <span className="text-red-400">콤보가 초기화</span>됩니다.
            </p>

            <div className="w-full max-w-3xl h-2 bg-white/50 rounded-full mt-4 overflow-hidden border border-pink-100">
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

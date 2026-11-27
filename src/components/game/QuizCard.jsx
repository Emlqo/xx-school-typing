import { useState } from 'react';
import { GAME_RULES } from '../../constants/gameRules.js';

function QuizCorrection({ answer, explanation, onComplete }) {
  const [value, setValue] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (value.trim().normalize('NFC') !== answer.normalize('NFC')) {
      setMismatch(true);
      return;
    }
    onComplete();
  };

  return (
    <form onSubmit={submit} className="text-center rounded-2xl bg-white border-2 border-indigo-200 shadow-md p-4 md:p-6">
      <p className="text-sm font-bold text-rose-700 mb-1">오답</p>
      <p className="text-sm text-gray-700" id="quiz-correction-explanation">{explanation}</p>
      <p className="my-3 text-2xl font-black text-indigo-800">{answer}</p>
      <label htmlFor="quiz-correction-input" className="block mb-2 text-sm font-bold text-gray-700">위 정답을 입력하면 다음 제시어가 나와요.</label>
      <div className="flex flex-col sm:flex-row items-stretch gap-2 max-w-sm mx-auto">
        <input
          id="quiz-correction-input"
          type="text"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setMismatch(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault();
          }}
          onPaste={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-describedby="quiz-correction-explanation"
          aria-invalid={mismatch}
          className="w-full min-w-0 rounded-xl border-2 border-indigo-200 px-3 py-2 text-center text-lg font-bold text-gray-800 focus:border-indigo-600 focus:outline-none aria-[invalid=true]:border-rose-400"
        />
        <button type="submit" disabled={!value.trim()} className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">정답 확인</button>
      </div>
      {mismatch && <p role="status" className="mt-2 text-sm font-bold text-rose-700">위 정답과 같게 입력해 주세요.</p>}
    </form>
  );
}

export default function QuizCard({
  currentQuiz,
  handleQuizAnswer = () => {},
  answerPending = false,
  correcting = false,
  onCorrectionComplete = () => {},
  shieldAvailable = false,
}) {
  if (!currentQuiz) return null;

  return (
    <div className="w-full text-center mb-4 animate-float-up-fade">
      <div className="bg-indigo-600 text-white text-sm font-bold px-4 py-1 rounded-full inline-block mb-3 animate-bounce shadow-md">🚨 돌발 퀴즈!</div>
      <div className="text-xl md:text-3xl font-black break-words leading-snug mb-5 text-gray-800 bg-white rounded-lg p-4 md:p-6">
        Q. {currentQuiz.question}
      </div>
      {correcting ? (
        <QuizCorrection
          answer={currentQuiz.options[currentQuiz.answer]}
          explanation={currentQuiz.explanation}
          onComplete={onCorrectionComplete}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mx-auto w-full">
            {(currentQuiz.options || []).map((option, index) => (
              <button
                key={`${option}-${index}`}
                onClick={() => handleQuizAnswer(index)}
                disabled={answerPending}
                className="bg-white border-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 disabled:opacity-60 text-gray-700 font-bold text-base md:text-lg py-3 px-4 rounded-xl shadow-sm transition-all transform hover:scale-[1.02]"
              >
                {index + 1}. {option}
              </button>
            ))}
          </div>
          <p className="mt-4 text-gray-700 text-sm font-medium bg-white rounded-lg px-3 py-1.5 inline-block">
            정답 <span className="text-green-700 font-bold">+{GAME_RULES.quizCorrectBaseScore}점</span> / 오답 {shieldAvailable
              ? <span className="text-teal-700 font-bold">장비 보호 1회</span>
              : <span className="text-red-700 font-bold">{GAME_RULES.quizWrongPenalty}점 (콤보 증발)</span>}
          </p>
        </>
      )}
    </div>
  );
}

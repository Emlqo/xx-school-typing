import { GAME_RULES } from '../../constants/gameRules.js';

export default function QuizCard({
  currentQuiz,
  handleQuizAnswer = () => {},
  answerPending = false,
  shieldAvailable = false,
}) {
  if (!currentQuiz) return null;

  return (
    <div className="w-full text-center mb-4 animate-float-up-fade">
      <div className="bg-indigo-600 text-white text-sm font-bold px-4 py-1 rounded-full inline-block mb-3 animate-bounce shadow-md">🚨 돌발 퀴즈!</div>
      <div className="text-xl md:text-3xl font-black break-words leading-snug mb-5 text-gray-800 bg-white rounded-lg p-4 md:p-6">
        Q. {currentQuiz.question}
      </div>
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
    </div>
  );
}

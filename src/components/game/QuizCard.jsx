import { GAME_RULES } from '../../constants/gameRules.js';

export default function QuizCard({
  currentQuiz,
  handleQuizAnswer = () => {},
}) {
  if (!currentQuiz) return null;

  return (
    <div className="w-full text-center mb-8 animate-float-up-fade">
      <div className="bg-indigo-600 text-white text-sm font-bold px-5 py-1.5 rounded-full inline-block mb-6 animate-bounce shadow-md">🚨 돌발 퀴즈!</div>
      <div className="text-3xl md:text-5xl font-black tracking-wide break-keep leading-tight mb-10 text-gray-800 drop-shadow-sm">
        Q. {currentQuiz.question}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto w-full">
        {(currentQuiz.options || []).map((option, index) => (
          <button
            key={`${option}-${index}`}
            onClick={() => handleQuizAnswer(index)}
            className="bg-white border-2 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 text-gray-700 font-bold text-xl md:text-2xl py-6 px-4 rounded-2xl shadow-sm transition-all transform hover:scale-[1.02]"
          >
            {index + 1}. {option}
          </button>
        ))}
      </div>
      <p className="mt-8 text-gray-500 text-sm font-medium">
        정답 <span className="text-green-500 font-bold">+{GAME_RULES.quizCorrectBaseScore}점</span> / 오답 <span className="text-red-500 font-bold">{GAME_RULES.quizWrongPenalty}점 (콤보 증발)</span>
      </p>
    </div>
  );
}

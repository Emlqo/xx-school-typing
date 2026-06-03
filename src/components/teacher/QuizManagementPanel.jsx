export default function QuizManagementPanel({
  handleSaveQuiz = () => {},
  quizQuestion = '',
  setQuizQuestion = () => {},
  quizOptions = ['', '', '', ''],
  setQuizOptions = () => {},
  quizAnswer = 0,
  setQuizAnswer = () => {},
  quizzes = [],
  handleDeleteQuiz = () => {},
}) {
  return (
    <div className="glass-box p-6 rounded-3xl mt-6 border border-indigo-100">
      <h2 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">🧠 4지선다 퀴즈 관리 (게임 중 돌발 출제)</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveQuiz} className="space-y-3 bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
          <input
            type="text"
            value={quizQuestion}
            onChange={(event) => setQuizQuestion(event.target.value)}
            placeholder="퀴즈 문제 (예: 파이썬의 출력 함수는?)"
            className="w-full px-4 py-3 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-gray-700"
            required
          />
          <div className="space-y-2 mt-2">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <input type="radio" name="quizAnswer" checked={quizAnswer === index} onChange={() => setQuizAnswer(index)} className="w-5 h-5 text-indigo-500 cursor-pointer" />
                <input
                  type="text"
                  value={quizOptions[index] || ''}
                  onChange={(event) => {
                    const nextOptions = [...quizOptions];
                    nextOptions[index] = event.target.value;
                    setQuizOptions(nextOptions);
                  }}
                  placeholder={`${index + 1}번 보기`}
                  className={`flex-1 px-3 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 ${quizAnswer === index ? 'bg-indigo-50 border-indigo-300 font-bold' : 'border-gray-200'}`}
                  required
                />
              </div>
            ))}
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-2">🧠 퀴즈 등록</button>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {quizzes.map((quiz, index) => (
            <div key={quiz.id} className="bg-white p-4 rounded-2xl border border-indigo-100 flex justify-between items-start gap-4 hover:border-indigo-300 transition-colors">
              <div className="flex-1">
                <div className="font-bold text-indigo-900 text-sm mb-2">Q{index + 1}. {quiz.question}</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {(quiz.options || []).map((option, optionIndex) => (
                    <div key={`${option}-${optionIndex}`} className={`p-1 px-2 rounded-md ${quiz.answer === optionIndex ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500'}`}>
                      {optionIndex + 1}. {option} {quiz.answer === optionIndex && '✅'}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDeleteQuiz(quiz.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors shrink-0">✖</button>
            </div>
          ))}
          {quizzes.length === 0 && <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-indigo-100">등록된 퀴즈가 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

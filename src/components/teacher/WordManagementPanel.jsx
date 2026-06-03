export default function WordManagementPanel({
  wordText = '',
  setWordText = () => {},
  wordLanguage = 'ko',
  setWordLanguage = () => {},
  words = [],
  handleSaveWord = () => {},
  handleDeleteWord = () => {},
}) {
  const languageLabel = {
    ko: '한국어',
    en: '영어',
  };

  return (
    <div className="glass-box p-6 rounded-3xl mt-6 border border-emerald-100">
      <h2 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">단어장 관리</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveWord} className="space-y-3 bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <input
              type="text"
              value={wordText}
              onChange={(event) => setWordText(event.target.value)}
              placeholder="추가할 단어 또는 문장을 입력하세요"
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-gray-700"
            />
            <select
              value={wordLanguage}
              onChange={(event) => setWordLanguage(event.target.value)}
              className="w-full px-4 py-3 border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 bg-white font-bold text-emerald-800"
            >
              <option value="ko">한국어</option>
              <option value="en">영어</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors">
            단어 등록
          </button>
        </form>

        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {words.map((word) => (
            <div key={word.id} className="bg-white p-4 rounded-2xl border border-emerald-100 flex justify-between items-center gap-4 hover:border-emerald-300 transition-colors">
              <div className="min-w-0">
                <div className="font-bold text-emerald-900 truncate">{word.text || word.word || word.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                    {languageLabel[word.language] || word.language || '한국어'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${word.active === false ? 'bg-gray-100 text-gray-500' : 'bg-pink-50 text-pink-600'}`}>
                    {word.active === false ? '비활성' : '활성'}
                  </span>
                </div>
              </div>
              <button onClick={() => handleDeleteWord(word.id)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors shrink-0 font-bold">
                삭제
              </button>
            </div>
          ))}
          {words.length === 0 && (
            <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-emerald-100">
              등록된 단어가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

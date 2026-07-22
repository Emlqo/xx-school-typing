const teacherSections = [
  { id: 'overview', label: '점수판', description: '방 관리와 실시간 점수' },
  { id: 'classes', label: '학급/명단', description: '학급 생성과 학생 등록' },
  { id: 'shop', label: '상점/포인트', description: '포인트와 장식 관리' },
  { id: 'quizzes', label: '퀴즈', description: '돌발 퀴즈 등록' },
  { id: 'words', label: '단어장', description: '제시어 추가/삭제' },
  { id: 'records', label: '공지/명예', description: '공지와 명예의 전당' },
  { id: 'duels', label: '결투 전적', description: '전체 학생 1:1 기록' },
];

export default function TeacherHeader({
  onLogout = () => {},
  activeSection = 'overview',
  setActiveSection = () => {},
}) {
  return (
    <div className="glass-box p-6 rounded-3xl space-y-5">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🏫 교무실 타자 점수 관리</h1>
          <p className="text-gray-500 mt-1 font-medium">필요한 관리자 기능을 섹션별로 빠르게 관리하세요.</p>
        </div>
        <button onClick={onLogout} className="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50">로그아웃</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-2">
        {teacherSections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-transparent shadow-lg shadow-teal-200'
                  : 'bg-white/80 border-cyan-100 text-gray-600 hover:bg-cyan-50 hover:border-cyan-200'
              }`}
            >
              <div className="font-black">{section.label}</div>
              <div className={`text-xs font-bold mt-1 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                {section.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

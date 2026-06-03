function parseStudentNames(value) {
  return value
    .split(/\s+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export default function StudentRosterPanel({
  selectedClass = null,
  selectedClassRoom = null,
  students = [],
  classRoomScores = [],
  studentBulkText = '',
  setStudentBulkText = () => {},
  handleBulkAddStudents = () => {},
  handleDeleteStudent = () => {},
}) {
  const parsedNames = parseStudentNames(studentBulkText);
  const scoreByStudentId = new Map(
    classRoomScores
      .filter((score) => score.studentId)
      .map((score) => [score.studentId, score]),
  );
  const classEntryCount = scoreByStudentId.size;

  return (
    <div className="glass-box p-6 rounded-3xl border border-teal-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-teal-800 flex items-center gap-2">🧑‍🎓 학생 명단 관리</h2>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-teal-100 text-teal-700">
          입장 {classEntryCount}명 / 명단 {students.length}명
        </span>
      </div>

      <form onSubmit={handleBulkAddStudents} className="space-y-3 mb-6 border-b border-teal-100 pb-6">
        <div className="bg-white rounded-2xl border border-teal-100 p-4">
          <div className="text-xs text-gray-400 font-bold mb-1">선택 학급</div>
          <div className="font-black text-teal-800">{selectedClass?.name || '학급을 선택하세요'}</div>
          <div className="text-xs text-gray-400 font-bold mt-2">
            {selectedClassRoom ? `현황 방: ${selectedClassRoom.name}` : '열린 학급 방을 선택하면 입장 현황이 표시됩니다.'}
          </div>
        </div>
        <textarea
          value={studentBulkText}
          onChange={(event) => setStudentBulkText(event.target.value)}
          placeholder="학생 이름을 붙여넣으세요. 줄바꿈 또는 띄어쓰기로 여러 명을 한 번에 등록할 수 있습니다."
          rows={5}
          className="w-full px-4 py-3 border border-teal-200 rounded-xl outline-none resize-none custom-scrollbar focus:ring-2 focus:ring-teal-400 bg-white"
        />
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-gray-400">
          <span>등록 예정 {parsedNames.length}명</span>
          <span>예: 김민준1 김민준2 이서연</span>
        </div>
        <button
          type="submit"
          disabled={!selectedClass || parsedNames.length === 0}
          className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed py-3 rounded-xl font-bold text-white shadow-md transition-colors"
        >
          학생 일괄 등록
        </button>
      </form>

      <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
        {students.map((student) => {
          const scoreDoc = scoreByStudentId.get(student.id);
          const entered = Boolean(scoreDoc);

          return (
            <div key={student.id} className={`p-3 rounded-xl border flex justify-between items-center gap-3 transition-colors ${entered ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-teal-100 hover:border-teal-300'}`}>
              <div className="min-w-0">
                <div className="font-black text-gray-800 truncate">{student.name}</div>
                <div className={`text-xs font-bold mt-1 ${entered ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {entered ? '입장 완료' : student.active === false ? '비활성' : '미입장'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {selectedClassRoom && (
                  <div className="text-right min-w-[72px]">
                    <div className="text-xs text-gray-400 font-bold">점수</div>
                    <div className={`font-black ${entered ? 'text-pink-500' : 'text-gray-300'}`}>
                      {entered ? (scoreDoc.score || 0).toLocaleString() : '-'}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteStudent(student.id, student.name)}
                  className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-bold"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
        {students.length === 0 && (
          <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-teal-100">
            선택한 학급에 등록된 학생이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

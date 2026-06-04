import { COSMETIC_ITEMS } from '../../constants/cosmetics.js';
import { safeToLocaleNumber } from '../../utils/format.js';

export default function ShopPointManagementPanel({
  classes = [],
  selectedClassId = '',
  setSelectedClassId = () => {},
  students = [],
  handleSetStudentPoints = () => {},
  handleAdjustStudentPoints = () => {},
  handleGrantStudentCosmetic = () => {},
  handleRemoveStudentCosmetic = () => {},
  handleResetStudentCosmetics = () => {},
}) {
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId) || null;

  return (
    <div className="glass-box p-6 rounded-3xl border border-teal-100">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-black text-teal-800 flex items-center gap-2">상점/포인트 관리</h2>
          <p className="text-sm text-gray-500 font-bold mt-1">
            학급 학생의 포인트와 보유 장식을 직접 관리합니다.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-white border border-teal-100 text-teal-700 font-black">
          선택 학급 {selectedClass?.name || '없음'}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-teal-100 p-4 mb-5">
        <label className="text-xs text-gray-400 font-black block mb-2">관리할 학급</label>
        <select
          value={selectedClassId}
          onChange={(event) => setSelectedClassId(event.target.value)}
          className="w-full px-4 py-3 border border-teal-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400 bg-white font-bold text-gray-700"
        >
          <option value="">학급을 선택하세요</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {students.map((student) => {
          const ownedCosmetics = Array.isArray(student.ownedCosmetics) ? student.ownedCosmetics : [];
          const totalPoints = Number(student.totalPoints || 0);

          return (
            <div key={student.id} className="bg-white rounded-2xl border border-cyan-100 p-4 shadow-sm">
              <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                <div className="min-w-0 xl:w-56">
                  <div className="text-lg font-black text-gray-800 truncate">{student.name}</div>
                  <div className="text-xs text-gray-400 font-bold mt-1">
                    최고 기록 {safeToLocaleNumber(student.bestScore || 0)}점
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-2">
                    {safeToLocaleNumber(totalPoints)}P
                  </div>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    handleSetStudentPoints(student.id, formData.get('points'));
                  }}
                  className="flex flex-wrap items-center gap-2 xl:w-80"
                >
                  <input
                    key={totalPoints}
                    name="points"
                    type="number"
                    min="0"
                    defaultValue={totalPoints}
                    className="w-28 px-3 py-2 border border-teal-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-400 font-bold"
                  />
                  <button type="submit" className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-black">
                    설정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStudentPoints(student.id, totalPoints, 10)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black border border-emerald-100"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStudentPoints(student.id, totalPoints, 50)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl font-black border border-emerald-100"
                  >
                    +50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStudentPoints(student.id, totalPoints, -10)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black border border-rose-100"
                  >
                    -10
                  </button>
                </form>

                <div className="flex-1">
                  <div className="text-xs text-gray-400 font-black mb-2">아이템 지급/회수</div>
                  <div className="flex flex-wrap gap-2">
                    {COSMETIC_ITEMS.map((item) => {
                      const owned = ownedCosmetics.includes(item.id);
                      const equipped = student.equippedCosmetic === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => (owned
                            ? handleRemoveStudentCosmetic(student, item.id)
                            : handleGrantStudentCosmetic(student, item.id))}
                          className={`px-3 py-2 rounded-xl text-xs font-black border transition-colors ${
                            owned
                              ? 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600'
                              : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-cyan-50 hover:text-cyan-700'
                          }`}
                          title={owned ? '클릭하면 회수합니다.' : '클릭하면 지급합니다.'}
                        >
                          {item.name}{equipped ? ' · 장착 중' : owned ? ' · 보유' : ''}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleResetStudentCosmetics(student.id)}
                      className="px-3 py-2 rounded-xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-500"
                    >
                      장식 초기화
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!selectedClassId && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-teal-100 font-bold">
            먼저 관리할 학급을 선택하세요.
          </div>
        )}

        {selectedClassId && students.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-teal-100 font-bold">
            선택한 학급에 등록된 학생이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

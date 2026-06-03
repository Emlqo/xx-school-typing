export default function AnnouncementManagementPanel({
  handleSaveAnnouncement = () => {},
  annTitle = '',
  setAnnTitle = () => {},
  annContent = '',
  setAnnContent = () => {},
  annIsAlert = false,
  setAnnIsAlert = () => {},
  editingAnnId = null,
  announcements = [],
  editAnnouncement = () => {},
  handleDeleteAnnouncement = () => {},
  cancelEditAnnouncement = () => {},
}) {
  return (
    <div className="glass-box p-6 rounded-3xl mt-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">📢 공지사항 작성 및 관리</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSaveAnnouncement} className="space-y-3 bg-white p-5 rounded-2xl border border-pink-100 shadow-sm">
          <input
            type="text"
            value={annTitle}
            onChange={(event) => setAnnTitle(event.target.value)}
            placeholder="제목 (예: 📌 5월 코딩대회 MVP 발표!)"
            className="w-full px-4 py-3 border border-pink-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 font-bold"
            required
          />
          <textarea
            value={annContent}
            onChange={(event) => setAnnContent(event.target.value)}
            placeholder="학생들에게 알릴 내용을 적어주세요."
            rows="4"
            className="w-full px-4 py-3 border border-pink-200 rounded-xl outline-none resize-none custom-scrollbar focus:ring-2 focus:ring-pink-400"
            required
          />

          <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer p-2 bg-pink-50 rounded-lg border border-pink-100">
            <input type="checkbox" checked={annIsAlert} onChange={(event) => setAnnIsAlert(event.target.checked)} className="w-5 h-5 text-pink-500 rounded focus:ring-pink-400 cursor-pointer" />
            🚨 학생들이 처음 접속할 때 이 공지를 팝업으로 띄우기
          </label>

          <div className="flex gap-2 mt-2">
            <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition-colors">{editingAnnId ? '수정 완료' : '📢 공지 등록'}</button>
            {editingAnnId && <button type="button" onClick={cancelEditAnnouncement} className="px-5 bg-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-300 transition-colors">취소</button>}
          </div>
        </form>

        <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
          {announcements.map((announcement) => (
            <div key={announcement.id} className={`bg-white p-4 rounded-2xl border flex justify-between items-start gap-4 transition-colors ${announcement.isAlert ? 'border-red-300 bg-red-50/30' : 'border-pink-100 hover:border-pink-300'}`}>
              <div className="flex-1">
                <div className="font-bold text-gray-800 text-sm">
                  {announcement.title}
                  {announcement.isAlert && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full ml-2 animate-pulse align-middle">팝업 ON</span>}
                </div>
                <div className="text-xs text-gray-400 line-clamp-1 mt-1">{announcement.content}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => editAnnouncement(announcement)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="수정">✏️</button>
                <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="삭제">✖</button>
              </div>
            </div>
          ))}
          {announcements.length === 0 && <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-pink-100">등록된 공지사항이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}

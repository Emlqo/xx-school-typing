import LinkifiedText from './LinkifiedText.jsx';

export default function AnnouncementModal({ announcements = [], onClose = () => {} }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto custom-scrollbar shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-5 text-gray-400 hover:text-pink-500 text-3xl font-black">&times;</button>
        <h2 className="text-2xl font-black text-pink-600 mb-6 flex items-center gap-2">📢 공지사항</h2>
        <div className="space-y-4">
          {announcements.length > 0 ? (
            announcements.map((ann) => (
              <div key={ann.id} className={`p-4 rounded-2xl border text-left ${ann.isAlert ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-pink-50/50 border-pink-100'}`}>
                <h3 className="font-bold text-lg text-gray-800 mb-2">
                  {ann.isAlert && <span className="text-red-500 mr-1 animate-pulse">🚨</span>}
                  {ann.title}
                </h3>
                <LinkifiedText text={ann.content} className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed" />
                <div className="text-xs text-gray-400 mt-3 text-right">
                  {ann.createdAt?.toDate ? ann.createdAt.toDate().toLocaleDateString() : ''}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8 font-medium">등록된 공지사항이 없습니다.</p>
          )}
        </div>
        <button onClick={onClose} className="w-full mt-6 py-3 bg-pink-100 text-pink-600 font-bold rounded-xl hover:bg-pink-200">닫기</button>
      </div>
    </div>
  );
}

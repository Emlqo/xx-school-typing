import { safeToLocaleNumber } from '../../utils/format.js';
import { getCosmeticById } from '../../constants/cosmetics.js';

export default function LeaderboardPanel({
  leaderboardScores = [],
  rooms = [],
  viewingRoomId = '',
  participantCount = 0,
  roomAverageScore = 0,
  startRoomGame = () => {},
  requestScoreSync = () => {},
  toggleBoosterPower = () => {},
  toggleWeight = () => {},
  toggleDifficulty = () => {},
}) {
  const selectedRoom = rooms.find((room) => room.id === viewingRoomId);
  const title = viewingRoomId === 'all'
    ? '풍양중 전체 명예의 전당'
    : viewingRoomId === ''
      ? '학생 점수 확인 (반을 선택하세요)'
      : `[${selectedRoom?.name || '선택한 반'}] 실시간 점수판`;

  return (
    <div className="glass-box p-6 rounded-3xl col-span-1 lg:col-span-2">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <h2 className="text-2xl font-bold text-pink-600 flex items-center gap-2 flex-wrap">
            🏆 {title}
            {viewingRoomId !== '' && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse ml-2">🔴 LIVE</span>}
          </h2>

          {viewingRoomId !== '' && viewingRoomId !== 'all' && (
            <div className="flex gap-2">
              {selectedRoom?.status === 'waiting' && (
                <button onClick={() => startRoomGame(viewingRoomId)} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold animate-bounce shadow-lg">
                  🚀 게임 시작!
                </button>
              )}
              {selectedRoom?.status === 'playing' && (
                <button onClick={() => requestScoreSync(viewingRoomId)} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg transition-all">
                  📡 실시간 가져오기
                </button>
              )}
            </div>
          )}
        </div>

        {viewingRoomId !== '' && viewingRoomId !== 'all' && (
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 rounded-2xl text-white shadow-lg flex justify-between items-center transform hover:scale-[1.01] transition-transform">
            <div>
              <div className="text-indigo-100 font-bold text-sm mb-1 tracking-wide">학급 평균 점수 (참여: {participantCount}명)</div>
              <div className="text-5xl font-black drop-shadow-md tracking-tight">
                {safeToLocaleNumber(roomAverageScore)} <span className="text-2xl font-bold text-indigo-200">PTS</span>
              </div>
            </div>
            <div className="text-6xl animate-bounce drop-shadow-lg">🔥</div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-pink-50 text-pink-800 text-sm">
              <th className="py-3 px-4 font-bold rounded-tl-xl w-16 text-center">순위</th>
              <th className="py-3 px-4 font-bold">학생(닉네임)</th>
              <th className="py-3 px-4 font-bold text-center">설정(밸런스)</th>
              <th className="py-3 px-4 font-bold text-right">퀴즈</th>
              <th className="py-3 px-4 font-bold text-right">최고 점수</th>
              <th className="py-3 px-4 font-bold text-right rounded-tr-xl">타수(CPM)</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardScores.length > 0 ? leaderboardScores.map((score, index) => {
              const isEditable = viewingRoomId !== 'all' && selectedRoom?.status === 'waiting';
              const cosmetic = getCosmeticById(score.equippedCosmetic);
              const rowCosmeticClass = cosmetic?.leaderboardClass || '';

              return (
                <tr key={score.id} className={`border-b border-gray-100 transition-colors hover:bg-white/50 ${rowCosmeticClass}`}>
                  <td className="py-3 px-4 text-center font-bold">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : <span className="text-gray-400">{index + 1}</span>}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-800 relative overflow-hidden">
                    {cosmetic && (
                      <span className={`cosmetic-effect ${cosmetic.effectClass || 'cosmetic-effect-aura'}`} aria-hidden="true" />
                    )}
                    <div className="cosmetic-name-content flex flex-wrap items-center gap-2">
                      <span>{score.nickname}</span>
                      {cosmetic && (
                        <span className={`text-[11px] px-2 py-1 rounded-full font-black ${cosmetic.badgeClass || 'cosmetic-badge cosmetic-badge-teal'}`}>
                          {cosmetic.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {isEditable ? (
                      <div className="flex justify-center gap-1 flex-wrap">
                        <button onClick={() => toggleBoosterPower(score.id, score.boosterEnabled)} className={`px-2 py-1 rounded text-xs font-bold transition-all ${score.boosterEnabled !== false ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          부스터 {score.boosterEnabled !== false ? 'ON' : 'OFF'}
                        </button>
                        <button onClick={() => toggleWeight(score.id, score.pointWeight || 1.0)} className="px-2 py-1 rounded text-xs font-bold transition-all bg-purple-500 text-white">
                          x{score.pointWeight || 1.0}
                        </button>
                        <button onClick={() => toggleDifficulty(score.id, score.difficulty || 'normal')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${score.difficulty === 'hell' ? 'bg-black text-white' : score.difficulty === 'hard' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {score.difficulty === 'hell' ? '💀' : score.difficulty === 'hard' ? '🔥' : '🌱'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-bold">
                        {score.boosterEnabled !== false ? '부스터⭕' : '부스터❌'} | x{score.pointWeight || 1.0} | {score.difficulty === 'hell' ? '💀' : score.difficulty === 'hard' ? '🔥' : '🌱'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-indigo-500">{score.quizCorrectCount || 0}개</td>
                  <td className="py-3 px-4 text-right font-black text-pink-500 text-lg">{safeToLocaleNumber(score.score || 0)}</td>
                  <td className="py-3 px-4 text-right text-gray-500 font-medium">{score.cpm || 0}타</td>
                </tr>
              );
            }) : (
              <tr><td colSpan="6" className="py-8 text-center text-gray-400">아직 등록된 기록이 없거나 선택한 반이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

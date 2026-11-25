import { Fragment, useId, useRef, useState } from 'react';
import { safeToLocaleNumber } from '../../utils/format.js';
import { getCosmeticById } from '../../constants/cosmetics.js';
import { getTypeforgePracticeEffects } from '../../utils/typeforgePractice.js';
import SubwayLeaderboard from './SubwayLeaderboard.jsx';
import MemoryKingEffect from '../common/MemoryKingEffect.jsx';
import './LeaderboardPanel.css';

function GearImage({ art, detail = false }) {
  if (!art) return null;
  return <img key={art} src={art} alt="" loading={detail ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
    onError={event => { event.currentTarget.hidden = true; }} />;
}

function ScoreTable({ scores, showEquipment, onAllowReentry, reentryPendingIds, gameEnded }) {
  const [expandedId, setExpandedId] = useState(null);
  const trigger = useRef(null);
  const detailPrefix = useId();

  function closeGear() {
    setExpandedId(null);
    trigger.current?.focus();
  }

  return (
    <div className="scoreboard-table-wrap" onKeyDown={event => {
      if (event.key === 'Escape' && expandedId !== null) closeGear();
    }}>
      <table className="scoreboard-table" aria-label="학생 점수">
        <thead>
          <tr>
            <th scope="col" className="scoreboard-rank-col">순위</th>
            <th scope="col">학생</th>
            <th scope="col" className="scoreboard-point-col">점수</th>
            <th scope="col" className="scoreboard-cpm-col">타수</th>
            <th scope="col" className="scoreboard-quiz-col">퀴즈</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, index) => {
            const cosmetic = getCosmeticById(score.equippedCosmetic);
            const gear = showEquipment ? score.typeforgeGear : null;
            const gearInfo = getTypeforgePracticeEffects(gear);
            const gearName = gear?.name || gearInfo?.typeLabel;
            const expanded = expandedId === score.id;
            const detailId = detailPrefix + '-' + encodeURIComponent(score.id);
            const rank = score.screenExitDetected ? '—' : index + 1;
            const reentryPending = reentryPendingIds.includes(score.id);
            return (
              <Fragment key={score.id}>
                <tr className="scoreboard-row" data-expanded={expanded || undefined}>
                  <td className="scoreboard-rank-col">
                    <span className="scoreboard-rank" data-rank={rank}>{rank}</span>
                  </td>
                  <th scope="row" className="scoreboard-student-cell">
                    <div className="scoreboard-name-line">
                      <div className={`scoreboard-name-tag ${cosmetic?.leaderboardClass || ''}`}
                        data-title={cosmetic?.id} title={cosmetic ? `${score.nickname} · ${cosmetic.name}` : score.nickname}>
                        {cosmetic && (cosmetic.id === 'title_memory_king' ? <MemoryKingEffect />
                          : <span className={`cosmetic-effect ${cosmetic.effectClass || 'cosmetic-effect-aura'}`} aria-hidden="true" />)}
                        <strong className="cosmetic-name-content">{score.nickname}</strong>
                        {cosmetic && <span className="scoreboard-title-label cosmetic-name-content">{cosmetic.name}</span>}
                      </div>
                      {gearInfo && (
                        <button type="button" className="scoreboard-gear" data-tier={gear.tier} data-type={gear.type}
                          aria-label={`+${gear.level} ${gearName}`} title={gearName}
                          aria-expanded={expanded} aria-controls={detailId} onClick={event => {
                            if (expanded) closeGear();
                            else {
                              trigger.current = event.currentTarget;
                              setExpandedId(score.id);
                            }
                          }}>
                          <GearImage art={gear.art} />
                          <b>+{gear.level}</b>
                          <span className="scoreboard-gear-name">{gearName}</span>
                        </button>
                      )}
                    </div>
                    {score.screenExitDetected && (
                      <div className="scoreboard-reentry">
                        <span>화면 이탈 · 진행 중단</span>
                        {!gameEnded && <button type="button" disabled={reentryPending} onClick={() => onAllowReentry(score)}>
                          {reentryPending ? '처리 중…' : '재입장 허용'}
                        </button>}
                      </div>
                    )}
                  </th>
                  <td className="scoreboard-point-col">{safeToLocaleNumber(score.score || 0)}</td>
                  <td className="scoreboard-cpm-col">{safeToLocaleNumber(score.cpm || 0)}<span>타</span></td>
                  <td className="scoreboard-quiz-col">{score.quizCorrectCount || 0}</td>
                </tr>
                {gearInfo && (
                  <tr id={detailId} className="scoreboard-detail-row" hidden={!expanded}>
                    <td colSpan={5}>
                      {expanded && (
                        <div className="scoreboard-gear-detail" role="region" aria-label={`${score.nickname} 장비`}>
                          <GearImage art={gear.art} detail />
                          <div className="scoreboard-detail-copy" aria-live="polite">
                            <strong>{gearName}</strong>
                            <span>+{gear.level}{gear.tier ? ` · ${gear.tier}` : ''}</span>
                          </div>
                          <button type="button" className="scoreboard-action" onClick={closeGear}>닫기</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {scores.length === 0 && <tr><td className="scoreboard-empty" colSpan={5}>등록된 기록이 아직 없어요.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function LeaderboardPanel({
  leaderboardScores = [],
  students = [],
  rooms = [],
  viewingRoomId = '',
  participantCount = 0,
  roomAverageScore = 0,
  currentTime = Date.now(),
  startRoomGame = () => {},
  requestScoreSync = () => {},
  onAllowReentry = () => {},
  reentryPendingIds = [],
  finalizeRankRewards = () => {},
  finishedScoreboard = null,
}) {
  const selectedRoom = rooms.find(room => room.id === viewingRoomId);
  if (selectedRoom?.mode === 'subway') return <SubwayLeaderboard room={selectedRoom} students={students} records={leaderboardScores} currentTime={currentTime} startRoomGame={startRoomGame} requestScoreSync={requestScoreSync} onAllowReentry={onAllowReentry} reentryPendingIds={reentryPendingIds} />;

  const scores = [
    ...leaderboardScores.filter(score => !score.screenExitDetected),
    ...leaderboardScores.filter(score => score.screenExitDetected),
  ];
  const expiresAt = typeof selectedRoom?.expiresAt?.toMillis === 'function'
    ? selectedRoom.expiresAt.toMillis()
    : Number(selectedRoom?.expiresAt || 0);
  const waiting = selectedRoom?.status === 'waiting';
  const playing = selectedRoom?.status === 'playing';
  const gameEnded = playing && expiresAt > 0 && expiresAt <= currentTime;
  const isClassRoom = selectedRoom?.entryType === 'class';
  const entered = new Set(leaderboardScores.filter(score => score.studentId).map(score => score.studentId));
  const activeStudents = isClassRoom ? students.filter(student => student.active !== false) : [];
  const missingStudents = activeStudents.filter(student => !entered.has(student.id));
  const hasSelection = Boolean(viewingRoomId && viewingRoomId !== 'all');
  const title = viewingRoomId === 'all' ? '풍양중 전체 명예의 전당'
    : hasSelection ? `${selectedRoom?.name || selectedRoom?.className || '선택한 반'} 점수판` : '학생 점수 확인';
  const status = waiting ? '입장 대기' : gameEnded ? '경기 종료' : playing ? '경기 진행 중' : '';

  return (
    <section className="teacher-scoreboard col-span-1 lg:col-span-2" aria-label="관리자 점수판">
      <header className="scoreboard-header">
        <div className="scoreboard-heading">
          <h2>{title}</h2>
          {status && <span className="scoreboard-status" data-phase={waiting ? 'waiting' : gameEnded ? 'finished' : 'live'}>{status}</span>}
        </div>
        {hasSelection && (waiting || playing) && (
          <div className="scoreboard-actions">
            {waiting && <button type="button" className="scoreboard-action primary" onClick={() => startRoomGame(viewingRoomId)}>게임 시작</button>}
            {playing && (!gameEnded || !isClassRoom) && <button type="button" className="scoreboard-action" onClick={() => requestScoreSync(viewingRoomId)}>실시간 가져오기</button>}
            {finishedScoreboard && <button type="button" className="scoreboard-action"
              onClick={finishedScoreboard.refresh} disabled={finishedScoreboard.loading}>결과 새로고침</button>}
            {playing && isClassRoom && (
              <button type="button" className="scoreboard-action reward" onClick={() => finalizeRankRewards(viewingRoomId)}
                disabled={!gameEnded || !finishedScoreboard?.result || selectedRoom.rewardFinalized === true || participantCount === 0}>
                {selectedRoom.rewardFinalized ? '보상 지급 완료' : gameEnded ? '순위 보상 확정' : '게임 종료 후 지급'}
              </button>
            )}
          </div>
        )}
      </header>

      {finishedScoreboard?.loading && <p className="scoreboard-prompt" role="status">최종 결과를 모으고 있어요.</p>}
      {finishedScoreboard?.error && <p className="scoreboard-prompt" role="alert">최종 결과를 불러오지 못했어요. 결과 새로고침을 눌러 주세요.</p>}

      {hasSelection && (!finishedScoreboard || finishedScoreboard.result) && (
        <div className="scoreboard-overview">
          <dl className="scoreboard-summary">
            <div><dt>학급 평균 점수</dt><dd>{safeToLocaleNumber(roomAverageScore)}</dd></div>
            <div><dt>참여</dt><dd>{participantCount}<span>명</span></dd></div>
          </dl>
          {activeStudents.length > 0 && (missingStudents.length > 0 ? (
            <div className="scoreboard-attendance" aria-label="미입장 학생">
              <strong>미입장 {missingStudents.length}명</strong>
              <ul>{missingStudents.map(student => <li key={student.id}>{student.name}</li>)}</ul>
            </div>
          ) : <p className="scoreboard-attendance complete">모든 학생이 입장했습니다.</p>)}
        </div>
      )}

      {(!finishedScoreboard || finishedScoreboard.result) && (!viewingRoomId && scores.length === 0
        ? <p className="scoreboard-prompt">반을 선택하면 점수가 표시돼요.</p>
        : <ScoreTable key={viewingRoomId} scores={scores} showEquipment={isClassRoom}
            reentryPendingIds={reentryPendingIds} onAllowReentry={onAllowReentry} gameEnded={gameEnded} />)}
    </section>
  );
}

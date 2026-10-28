import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ElementGameView from '../src/components/views/ElementGameView.jsx';
import ElementSettings from '../src/components/teacher/ElementSettings.jsx';
import SubwayLeaderboard from '../src/components/teacher/SubwayLeaderboard.jsx';
import { DEFAULT_ELEMENT_CONFIG } from '../src/constants/elements.js';
import { elementRange, memoryStart } from '../src/utils/memoryGame.js';
import { subwayHintPenalty } from '../src/utils/subway.js';
import '../src/styles/global.css';

const params = new URLSearchParams(location.search);
const now = Date.now();
const room = { id: 'elements-preview', mode: 'subway', entryType: 'class', status: params.has('leaderboard') ? 'waiting' : 'playing', focusGuardEnabled: false, startedAt: now - (params.has('study') ? 0 : 16000), duration: 120,
  subway: { ...DEFAULT_ELEMENT_CONFIG, subject: 'elements', practice: params.has('recall') ? 'recall' : 'memory', fromNumber: Number(params.get('from') || 1), toNumber: Number(params.get('to') || 20) } };
room.expiresAt = memoryStart(room) + 120000;
const names = elementRange(room.subway).map(item => item.name);
window.elementSubmissions = [];
function TeacherPreview() {
  const [config, setConfig] = useState(DEFAULT_ELEMENT_CONFIG);
  return <main className="max-w-3xl p-6 mx-auto"><ElementSettings value={config} onChange={setConfig} /></main>;
}
function GamePreview() {
  const [gameRoom, setGameRoom] = useState(room);
  window.requestElementSync = () => setGameRoom(previous => ({ ...previous, syncRequestedAt: Date.now() }));
  return <ElementGameView room={gameRoom} nickname="실험실 학생" scoreId={`element-demo-${params.toString() || 'default'}`} scoreData={params.has('reentry') ? { subwayProgress: 1, subwayHints: { 0: 2 }, subwayAnswers: ['수소'] } : undefined} onHome={() => { window.elementHomeClicked = true; }} submitRun={async (_, answers, hints) => {
  window.elementSubmissions.push({ answers, hints });
  if (params.has('fail') && window.elementSubmissions.length === 1) throw Error('테스트 저장 실패');
  if (params.has('clock-skew') && window.elementSubmissions.length === 1) return { score: { subwayStatus: 'running' } };
  return { score: { subwayStatus: answers.length === names.length ? 'completed' : Date.now() >= room.expiresAt ? 'timeout' : 'running', subwayProgress: answers.length, subwayAnswers: answers, subwayPenaltyMs: subwayHintPenalty(hints), subwayElapsedMs: Date.now() - memoryStart(room) + subwayHintPenalty(hints) } };
}} />;
}
createRoot(document.getElementById('root')).render(params.has('teacher') ? <TeacherPreview /> : params.has('leaderboard') ? <SubwayLeaderboard room={room} students={[{ id: 's1', name: '입장 학생' }, { id: 's2', name: '미입장 학생' }]} records={[{ id: 'r1', studentId: 's1', nickname: '입장 학생', subwayStatus: 'completed', subwayProgress: names.length, subwayElapsedMs: 43000, subwayAnswers: names }]} currentTime={now} startRoomGame={() => {}} requestScoreSync={() => {}} /> : <GamePreview />);

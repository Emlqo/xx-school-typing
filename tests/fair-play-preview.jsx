import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import useGameFocusGuard from '../src/hooks/useGameFocusGuard.js';
import { enterGameFullscreen, rememberScreenExit, readScreenExit, isFocusGuardEnabled } from '../src/utils/fairPlay.js';
import WaitingView from '../src/components/views/WaitingView.jsx';
import SubwayRecallView from '../src/components/views/SubwayRecallView.jsx';
import '../src/styles/global.css';

function Preview() {
  const [stage, setStage] = useState(readScreenExit('test') ? 'stopped' : 'entry');
  const [room] = useState({ focusGuardEnabled: !new URLSearchParams(location.search).has('off'), mode: 'subway', startedAt: Date.now(), expiresAt: Date.now() + 315000, subway: { practice: 'recall', previewEnabled: true, previewSeconds: 15 } });
  const stop = reason => {
    window.testReports = (window.testReports || 0) + 1;
    rememberScreenExit('test', reason);
    setStage('stopped');
  };
  useGameFocusGuard(stage === 'playing' && isFocusGuardEnabled(room), stop);
  if (stage === 'stopped') return <h1>화면 이탈 · 진행 중단</h1>;
  if (stage === 'entry') return <button onClick={async () => { if (!isFocusGuardEnabled(room) || await enterGameFullscreen()) setStage('waiting'); }}>선수 입장</button>;
  if (stage === 'waiting') return <><WaitingView myRoomData={room} /><button onClick={() => setStage('playing')}>일반 게임 시작</button><button onClick={() => setStage('subway')}>지하철 시작</button></>;
  if (stage === 'subway') return <SubwayRecallView room={room} scoreId="test" nickname="테스트" onViolation={stop} submitRun={async () => { throw new Error('Unexpected write'); }} />;
  return <><h1>게임 진행 중</h1><input aria-label="타자 입력"/><button onClick={() => setStage('result')}>정상 종료</button></>;
}
createRoot(document.getElementById('root')).render(<Preview />);

import React from 'react';
import { createRoot } from 'react-dom/client';
import SubwayGameView from '../src/components/views/SubwayGameView.jsx';
import '../src/styles/global.css';

const params = new URLSearchParams(location.search);
const start = Date.now() - (params.has('expired') ? 301000 : 0);
let attempts = 0;
createRoot(document.getElementById('root')).render(<SubwayGameView
  room={{ id: 'preview', mode: 'subway', startedAt: start, expiresAt: start + 300000 + (params.has('memory') ? 15000 : 0), duration: 300, subway: { line: '4', from: '진접', to: '동대문', practice: params.has('memory') ? 'memory' : 'copy' } }}
  nickname="테스트" scoreId="preview" scoreData={{ subwayProgress: Number(params.get('progress') || 0) }} onHome={() => {}}
  submitRun={async (_, answers) => {
    if (params.has('fail') && attempts++ === 0) throw new Error('테스트 저장 실패');
    return { score: { subwayStatus: params.has('expired') ? 'timeout' : answers.length === 16 ? 'completed' : 'running', subwayElapsedMs: Date.now() - start } };
  }}
/>);

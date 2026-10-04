import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import StudentHomeShopPanel from '../src/components/common/StudentHomeShopPanel.jsx';
import GachaManagementPanel from '../src/components/teacher/GachaManagementPanel.jsx';
import '../src/styles/global.css';
import '../src/styles/season-cosmetics.css';
import * as demoApi from './shop-preview-api.js';

function Preview() {
  const [student, setStudent] = useState({ id: 'demo-student', name: '미리보기 학생', totalPoints: 1000, ownedCosmetics: [], equippedCosmetic: null });
  const params = new URLSearchParams(location.search);
  const api = params.has('demo') ? demoApi : undefined;
  return <main className="max-w-5xl mx-auto p-4">{params.has('teacher') ? <GachaManagementPanel api={api} /> : <StudentHomeShopPanel student={student} onProfileChange={setStudent} gachaApi={api} shopItems={[{ id: 'sample', season: 2, scope: 'school', name: '초코우유', price: 100, stock: 10, active: true }]} />}</main>;
}
createRoot(document.getElementById('root')).render(<Preview />);

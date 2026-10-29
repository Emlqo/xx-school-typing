import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TypingGrowthPanel from '../src/components/teacher/TypingGrowthPanel.jsx';
import TeacherHeader from '../src/components/teacher/TeacherHeader.jsx';
import '../src/styles/global.css';

const names = ['예시 학생 1', '예시 학생 2', '예시 학생 3', '예시 학생 4', '예시 학생 5', '추가 선정 학생', '다음 후보 학생'];
const records = names.flatMap((nickname, student) => Array.from({ length: 6 }, (_, index) => ({
  id: `${student}-${index}`, studentId: `s${student}`, nickname, classId: 'c11', entryType: 'class', gameType: 'typing',
  roomId: `room${index}`, room: { mode: 'mixed', status: 'playing', expiresAt: 1 },
  cpm: index < 3 ? 40 : 110 - student * 7, correctChars: 200,
  createdAt: Date.UTC(2026, index < 3 ? 5 : 9, index + 1),
})));
window.growthMetrics = { reads: 0, writes: 0 };
window.growthAuthorized = true;
const cache = new Map();
function Preview() {
  const [classes, setClasses] = useState([{ id: 'c11', name: '1학년 11반' }, { id: 'c7', name: '1학년 7반' }]);
  const [section, setSection] = useState('growth');
  return <div className="min-h-screen spring-bg p-4 md:p-8"><main className="relative max-w-6xl mx-auto space-y-6">
    <p className="text-xs font-bold text-gray-600">미리보기 · 예시 데이터</p>
    <TeacherHeader activeSection={section} setActiveSection={setSection} />
    {section === 'growth' ? <TypingGrowthPanel classes={classes} authorize={() => window.growthAuthorized}
      loadRecords={async (classId, { force }) => {
        if (!force && cache.has(classId)) return cache.get(classId);
        window.growthMetrics.reads++;
        const result = { records: classId === 'c11' ? records : [], scoreCount: classId === 'c11' ? records.length : 0, roomCount: classId === 'c11' ? 6 : 0, loadedAt: Date.now() };
        cache.set(classId, result);
        return result;
      }}
      saveExclusion={async (classId, studentId, excluded) => {
        if (window.growthFailSave) throw new Error('예외 저장 실패');
        window.growthMetrics.writes++;
        setClasses(previous => previous.map(item => {
          if (item.id !== classId) return item;
          const ids = new Set(item.typingGrowthExcludedStudentIds || []);
          if (excluded) ids.add(studentId); else ids.delete(studentId);
          return { ...item, typingGrowthExcludedStudentIds: [...ids] };
        }));
      }} /> : <button className="bg-white border rounded-lg p-4" onClick={() => setSection('growth')}>성장 분석으로 돌아가기</button>}
  </main></div>;
}
createRoot(document.getElementById('root')).render(<Preview />);

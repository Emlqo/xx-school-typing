import React from 'react';
import { createRoot } from 'react-dom/client';
import EntryView from '../src/components/views/EntryView.jsx';
import LoginView from '../src/components/views/LoginView.jsx';
import '../src/styles/global.css';
const home = new URLSearchParams(location.search).has('home');
createRoot(document.getElementById('root')).render(home ? <LoginView announcements={[]} showAnnouncementModal={false} setShowAnnouncementModal={() => {}} onStudentClick={() => {}} /> : <EntryView />);

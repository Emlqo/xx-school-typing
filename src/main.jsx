import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AppVersionBadge from './components/common/AppVersionBadge.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <AppVersionBadge />
  </React.StrictMode>
);

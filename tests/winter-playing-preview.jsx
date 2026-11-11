import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PlayingView from '../src/components/views/PlayingView.jsx';
import '../src/styles/global.css';

function Preview() {
  const params = new URLSearchParams(location.search);
  const [inputValue, setInputValue] = useState('');
  const [isError, setIsError] = useState(params.has('error'));
  return <PlayingView nickname="Preview" currentWord="Small steps make a big difference."
    inputValue={inputValue} setInputValue={setInputValue} isError={isError} setIsError={setIsError}
    combo={params.has('combo') ? 4 : 0} boosterActive={params.has('booster')} boosterTimeLeft={20}
    timeLeft={180} score={1200} formatTime={() => '3:00'}
    duelInfo={params.has('duel') ? { myName: 'A', opponentName: 'B', opponentScore: 500 } : null}
    currentQuiz={params.has('quiz') ? { question: 'Preview quiz', options: ['A', 'B', 'C', 'D'], answer: 0 } : null}
  />;
}
createRoot(document.getElementById('root')).render(<Preview />);

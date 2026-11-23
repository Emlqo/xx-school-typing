export default function WordDisplay({ currentWord = '', inputValue = '' }) {
  const hasSpaces = currentWord.includes(' ');
  const renderWord = () => {
    return currentWord.split('').map((char, index) => {
      const typed = index < inputValue.length;
      const correct = inputValue[index] === char;
      if (char === ' ') {
        const state = typed ? (correct ? 'correct' : 'wrong') : 'pending';
        return <span key={index} className="typing-space" data-space-state={state}>{char}</span>;
      }

      let colorClass = 'text-white';

      if (typed) {
        colorClass = correct
          ? 'text-teal-200 font-black'
          : 'text-red-900 bg-red-100 rounded underline decoration-wavy decoration-red-700';
      }

      return <span key={`${char}-${index}`} className={`transition-colors duration-100 ${colorClass}`}>{char}</span>;
    });
  };

  return (
    <div className="typing-word-board w-full text-center mb-4 rounded-2xl px-4 py-3 sm:p-5">
      <p className="text-teal-100 font-bold text-xs sm:text-sm mb-2">
        제시어 {hasSpaces && <span className="ml-2 font-medium text-teal-200/85">⌴ 표시에 스페이스바</span>}
      </p>
      <div className="typing-prompt-text font-black break-words text-white select-none pointer-events-none">
        {renderWord()}
      </div>
    </div>
  );
}

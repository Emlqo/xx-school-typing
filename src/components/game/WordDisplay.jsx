export default function WordDisplay({ currentWord = '', inputValue = '' }) {
  const renderWord = () => {
    return currentWord.split('').map((char, index) => {
      let colorClass = 'text-white';

      if (index < inputValue.length) {
        colorClass = inputValue[index] === char
          ? 'text-teal-200 font-black'
          : 'text-red-900 bg-red-100 rounded underline decoration-wavy decoration-red-700';
      }

      return <span key={`${char}-${index}`} className={`transition-colors duration-100 ${colorClass}`}>{char}</span>;
    });
  };

  return (
    <div className="typing-word-board w-full text-center mb-6 rounded-2xl p-5 md:p-8">
      <p className="text-teal-100 font-bold text-sm mb-4">제시어</p>
      <div className="text-3xl md:text-5xl font-black break-words leading-relaxed min-h-[100px] text-white select-none pointer-events-none">
        {renderWord()}
      </div>
    </div>
  );
}

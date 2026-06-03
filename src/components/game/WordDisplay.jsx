export default function WordDisplay({ currentWord = '', inputValue = '' }) {
  const renderWord = () => {
    return currentWord.split('').map((char, index) => {
      let colorClass = 'text-gray-400';

      if (index < inputValue.length) {
        colorClass = inputValue[index] === char
          ? 'text-pink-500 font-black'
          : 'text-red-500 bg-red-100 rounded underline decoration-wavy decoration-red-500';
      }

      return <span key={`${char}-${index}`} className={`transition-colors duration-100 ${colorClass}`}>{char}</span>;
    });
  };

  return (
    <div className="w-full text-center mb-8">
      <p className="text-pink-400 font-bold tracking-widest text-sm mb-4">제시어</p>
      <div className="text-4xl md:text-6xl font-black tracking-wide break-keep leading-tight min-h-[100px] text-gray-300 select-none pointer-events-none">
        {renderWord()}
      </div>
    </div>
  );
}

import { findLanguageMismatch } from '../../utils/inputLanguage.js';

export default function TypingInput({
  currentWord = '',
  inputValue = '',
  setInputValue = () => {},
  setIsError = () => {},
  handleKeyDown = () => {},
  inputRef = null,
  boosterActive = false,
  combo = 0,
  isError = false,
  onLanguageMismatch = () => {},
  onLanguageAccepted = () => {},
}) {
  return (
    <div className={`w-full max-w-3xl relative rounded-2xl overflow-hidden transition-all duration-200 ${boosterActive ? 'shadow-[0_0_40px_rgba(251,191,36,0.5)] border-4 border-yellow-400 bg-white' : combo > 2 ? 'input-success' : 'glass-box'} ${isError ? 'border-2 border-red-400 animate-shake shadow-lg shadow-red-200' : 'border-2 border-transparent'}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          const nextValue = e.target.value;
          const mismatch = findLanguageMismatch(nextValue, currentWord);

          if (mismatch) {
            onLanguageMismatch(mismatch);
            return;
          }

          setInputValue(nextValue);
          setIsError(false);
          onLanguageAccepted();
        }}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          e.preventDefault();
          alert('🚨 앗! 복사/붙여넣기 치트키는 사용할 수 없습니다!');
        }}
        onDrop={(e) => e.preventDefault()}
        className={`w-full text-center text-2xl md:text-4xl py-6 md:py-8 px-6 outline-none bg-transparent font-bold transition-colors ${isError ? 'text-red-600' : 'text-gray-800'}`}
        placeholder={currentWord.includes(' ') ? '입력 후 엔터(Enter)를 누르세요' : '입력 후 스페이스바 또는 엔터'}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}

export default function BoosterButton({
  boosterEnabled = true,
  boosterActive = false,
  boosterAvailable = true,
  boosterTimeLeft = 0,
  onActivate = () => {},
}) {
  if (!boosterEnabled) return null;

  return (
    <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-50">
      <button
        onClick={onActivate}
        disabled={!boosterAvailable}
        className={`w-24 h-24 md:w-32 md:h-32 rounded-full shadow-2xl font-black flex flex-col items-center justify-center transition-all transform ${boosterActive ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse scale-110 shadow-orange-400' : boosterAvailable ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 hover:shadow-pink-400 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
      >
        {boosterActive ? (
          <>
            <span className="text-4xl md:text-5xl mb-1 drop-shadow-md">🔥</span>
            <span className="text-xl md:text-2xl">{boosterTimeLeft}초</span>
          </>
        ) : boosterAvailable ? (
          <>
            <span className="text-4xl md:text-5xl mb-1 drop-shadow-md">🚀</span>
            <span className="text-sm md:text-base tracking-widest">부스터</span>
          </>
        ) : (
          <>
            <span className="text-4xl md:text-5xl mb-1 opacity-50">💨</span>
            <span className="text-xs md:text-sm">사용됨</span>
          </>
        )}
      </button>
    </div>
  );
}

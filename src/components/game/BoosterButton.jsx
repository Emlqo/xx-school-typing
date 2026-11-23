export default function BoosterButton({
  boosterEnabled = true,
  boosterActive = false,
  boosterAvailable = true,
  boosterTimeLeft = 0,
  onActivate = () => {},
}) {
  if (!boosterEnabled) return null;

  return (
    <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      <button
        onClick={onActivate}
        disabled={!boosterAvailable}
        className={`w-[68px] h-[68px] md:w-[84px] md:h-[84px] rounded-full shadow-xl font-black flex flex-col items-center justify-center transition-all transform ${boosterActive ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse scale-105 shadow-orange-400' : boosterAvailable ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-105 hover:shadow-pink-400 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
      >
        {boosterActive ? (
          <>
            <span className="text-2xl md:text-3xl drop-shadow-md">🔥</span>
            <span className="text-base md:text-lg">{boosterTimeLeft}초</span>
          </>
        ) : boosterAvailable ? (
          <>
            <span className="text-2xl md:text-3xl drop-shadow-md">🚀</span>
            <span className="text-xs md:text-sm">부스터</span>
          </>
        ) : (
          <>
            <span className="text-2xl md:text-3xl opacity-50">💨</span>
            <span className="text-xs">사용됨</span>
          </>
        )}
      </button>
    </div>
  );
}

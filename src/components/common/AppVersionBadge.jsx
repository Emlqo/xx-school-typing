const APP_VERSION = __APP_VERSION__;

export default function AppVersionBadge() {
  return (
    <div
      className="fixed bottom-2 right-2 z-[9999] pointer-events-none select-none rounded-md border-2 border-teal-300 bg-white/95 px-2.5 py-1 text-[11px] font-black text-teal-700 shadow-md backdrop-blur-sm"
      aria-label={`앱 버전 ${APP_VERSION}`}
    >
      버전 {APP_VERSION}
    </div>
  );
}

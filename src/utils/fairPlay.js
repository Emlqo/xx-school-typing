export async function enterGameFullscreen() {
  if (document.fullscreenElement) return true;
  try {
    if (!document.documentElement.requestFullscreen) throw new Error('unsupported');
    await document.documentElement.requestFullscreen();
    return Boolean(document.fullscreenElement);
  } catch {
    alert('경기에 참여하려면 전체 화면을 허용해주세요. 전체 화면을 지원하는 Chrome에서 다시 시도해주세요.');
    return false;
  }
}

export function readScreenExit(scoreId, revision) {
  try {
    const raw = localStorage.getItem(`screen-exit:${scoreId}`);
    if (!raw) return '';
    const saved = raw.startsWith('{') ? JSON.parse(raw) : { reason: raw, revision: 0 };
    if (revision !== undefined && saved.revision !== revision) {
      localStorage.removeItem(`screen-exit:${scoreId}`);
      return '';
    }
    return saved.reason || '';
  }
  catch { return ''; }
}

export function rememberScreenExit(scoreId, reason, revision = 0) {
  try { localStorage.setItem(`screen-exit:${scoreId}`, JSON.stringify({ reason, revision })); }
  catch { /* Server persistence remains authoritative when storage is unavailable. */ }
}

export function watchGameFocus(onExit) {
  let stopped = false;
  const stop = (reason) => {
    if (stopped) return;
    stopped = true;
    onExit(reason);
  };
  const blur = () => stop('focus');
  const visibility = () => { if (document.hidden) stop('hidden'); };
  const fullscreen = () => { if (!document.fullscreenElement) stop('fullscreen'); };
  window.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('fullscreenchange', fullscreen);
  if (document.hidden) stop('hidden');
  else if (!document.fullscreenElement) stop('fullscreen');
  else if (!document.hasFocus()) stop('focus');
  return () => {
    window.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('fullscreenchange', fullscreen);
  };
}

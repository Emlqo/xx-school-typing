export function formatTime(sec) {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;
}

export function safeToLocaleNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '0';
}

export function formatAnnouncementDate(value) {
  const millis = value?.toMillis?.() ?? (typeof value === 'number' ? value : Number(value?.seconds || 0) * 1000);
  return millis > 0 ? new Date(millis).toLocaleDateString('ko-KR') : '';
}

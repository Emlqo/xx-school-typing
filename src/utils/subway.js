// Line 4, Jinjeop -> Oido. Station suffixes and secondary names are omitted.
export const LINE_4 = ['진접', '오남', '별내별가람', '불암산', '상계', '노원', '창동', '쌍문', '수유', '미아', '미아사거리', '길음', '성신여대입구', '한성대입구', '혜화', '동대문', '동대문역사문화공원', '충무로', '명동', '회현', '서울', '숙대입구', '삼각지', '신용산', '이촌', '동작', '총신대입구', '사당', '남태령', '선바위', '경마공원', '대공원', '과천', '정부과천청사', '인덕원', '평촌', '범계', '금정', '산본', '수리산', '대야미', '반월', '상록수', '한대앞', '중앙', '고잔', '초지', '안산', '신길온천', '정왕', '오이도'];
export const DEFAULT_SUBWAY_ROUTE = { line: '4', from: '진접', to: '노원', practice: 'memory', previewSeconds: 15 };

export function subwayPreviewMs(room) {
  if (room?.mode !== 'subway' || room?.subway?.practice !== 'memory') return 0;
  const seconds = Number(room.subway.previewSeconds ?? 15);
  return (Number.isFinite(seconds) ? Math.min(300, Math.max(5, Math.floor(seconds))) : 15) * 1000;
}

export function stationInitials(name) {
  return [...name].map((char) => {
    const offset = char.charCodeAt(0) - 0xac00;
    return offset >= 0 && offset <= 11171 ? 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'[Math.floor(offset / 588)] : char;
  }).join('');
}

export function subwayHintPenalty(hints = {}) {
  return Object.values(hints).reduce((sum, level) => sum + (level === 2 ? 8000 : level === 1 ? 3000 : 0), 0);
}

export function subwayRoute(config = DEFAULT_SUBWAY_ROUTE) {
  if (config?.line !== '4') return [];
  const start = LINE_4.indexOf(config.from);
  const end = LINE_4.indexOf(config.to);
  if (start < 0 || end < 0 || start === end) return [];
  const route = LINE_4.slice(Math.min(start, end), Math.max(start, end) + 1);
  return start < end ? route : route.reverse();
}

export function subwayMillis(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  return Number(value) || 0;
}

export function subwayStart(room) {
  return (subwayMillis(room?.startedAt) || subwayMillis(room?.expiresAt) - Number(room?.duration || 300) * 1000 - subwayPreviewMs(room)) + subwayPreviewMs(room);
}

export function formatRaceTime(ms) {
  const centiseconds = Math.floor(Math.max(0, ms || 0) / 10);
  return `${String(Math.floor(centiseconds / 6000)).padStart(2, '0')}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}

export function rankSubwayResults(records) {
  const sorted = [...records].sort((a, b) => {
    const ac = a.subwayStatus === 'completed';
    const bc = b.subwayStatus === 'completed';
    if (ac !== bc) return ac ? -1 : 1;
    return ac ? a.subwayElapsedMs - b.subwayElapsedMs : (b.subwayProgress || 0) - (a.subwayProgress || 0);
  });
  let rank = 0;
  return sorted.map((record, index) => {
    if (record.subwayStatus !== 'completed') return { ...record, subwayRank: null };
    if (index === 0 || record.subwayElapsedMs !== sorted[index - 1].subwayElapsedMs) rank = index + 1;
    return { ...record, subwayRank: rank };
  });
}

import { ELEMENTS } from '../constants/elements.js';
import { subwayMillis, subwayPreviewMs, subwayRoute, subwayStart } from './subway.js';

export function isElementRoom(room) {
  return room?.mode === 'subway' && room.subway?.subject === 'elements';
}

export function createElementPracticeRoom(now = Date.now()) {
  return { id: `local-elements-${now}`, mode: 'subway', duration: 120, status: 'playing', focusGuardEnabled: false,
    startedAt: now, expiresAt: now + 135000,
    subway: { subject: 'elements', fromNumber: 1, toNumber: 40, practice: 'memory', previewSeconds: 15 } };
}

export function elementRange(config = {}) {
  const from = Number(config.fromNumber);
  const to = Number(config.toNumber);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > ELEMENTS.length || from > to) return [];
  return ELEMENTS.filter(item => item.number >= from && item.number <= to);
}

export function isValidElementConfig(config) {
  return elementRange(config).length > 0 && ['memory', 'recall'].includes(config.practice)
    && Number.isInteger(Number(config.previewSeconds)) && Number(config.previewSeconds) >= 5 && Number(config.previewSeconds) <= 300;
}

export function memoryAnswers(room) {
  return isElementRoom(room) ? elementRange(room.subway).map(item => item.name) : subwayRoute(room?.subway);
}

export function memoryPreviewMs(room) {
  if (!isElementRoom(room)) return subwayPreviewMs(room);
  return isValidElementConfig(room.subway) ? Number(room.subway.previewSeconds) * 1000 : 0;
}

export function memoryStart(room) {
  if (!isElementRoom(room)) return subwayStart(room);
  const preview = memoryPreviewMs(room);
  return (subwayMillis(room?.startedAt) || subwayMillis(room?.expiresAt) - Number(room?.duration || 300) * 1000 - preview) + preview;
}

export function memoryRoomLabel(room) {
  if (isElementRoom(room)) return `원소 암기 · ${room.subway.fromNumber}~${room.subway.toNumber}번 · ${room.subway.practice === 'recall' ? '순서 없이' : '순서대로'}`;
  return room?.subway?.practice === 'recall' ? '4호선 전체 · 역 이름 많이 맞히기' : `4호선 · ${room?.subway?.from} → ${room?.subway?.to}`;
}

export function rankElementResults(records, recall) {
  return [...records].sort((a, b) => {
    if (Boolean(a.screenExitDetected) !== Boolean(b.screenExitDetected)) return a.screenExitDetected ? 1 : -1;
    if (recall) {
      const count = Number(b.subwayProgress || 0) - Number(a.subwayProgress || 0);
      if (count) return count;
    } else if ((a.subwayStatus === 'completed') !== (b.subwayStatus === 'completed')) return a.subwayStatus === 'completed' ? -1 : 1;
    if (a.subwayStatus === 'completed' && b.subwayStatus === 'completed') {
      const time = Number(a.subwayElapsedMs || 0) - Number(b.subwayElapsedMs || 0);
      if (time) return time;
    }
    if (!recall) {
      const count = Number(b.subwayProgress || 0) - Number(a.subwayProgress || 0);
      if (count) return count;
    }
    return String(a.nickname || '').localeCompare(String(b.nickname || ''), 'ko');
  }).map((record, index) => ({ ...record, subwayRank: record.screenExitDetected ? null : index + 1 }));
}

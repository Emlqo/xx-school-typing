export const TEACHER_UID = String(import.meta.env.VITE_TEACHER_UID || '').trim();
export const TEACHER_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const TEACHER_PASSWORD_HASH = '617de0de8228777a9ee34ae76c81aeab6b52abf2162fafb4bce0d8a19650a1fe';

export function isTeacherUser(user) {
  return Boolean(user && !user.isAnonymous && TEACHER_UID && user.uid === TEACHER_UID);
}

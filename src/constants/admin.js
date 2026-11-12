export const TEACHER_UID = String(import.meta.env.VITE_TEACHER_UID || '').trim();
export const TEACHER_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const TEACHER_PASSWORD_HASH = '5cb7fb690b57fdc9037b02764ee92eb402911e43cde0c051db3e42b90e6af1fc';

export function isTeacherUser(user) {
  return Boolean(user && !user.isAnonymous && TEACHER_UID && user.uid === TEACHER_UID);
}

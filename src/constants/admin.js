export const TEACHER_UID = String(import.meta.env.VITE_TEACHER_UID || '').trim();
export const TEACHER_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export function isTeacherUser(user) {
  return Boolean(user && !user.isAnonymous && TEACHER_UID && user.uid === TEACHER_UID);
}

import { isAllowedTeacherUid } from './teacherAccess.js';

export const TEACHER_UID = String(import.meta.env.VITE_TEACHER_UID || '').trim();
export const TEACHER_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const TEACHER_PASSWORD_HASH = '49faefe84a0320353c36f7273bc8bc28fd681ce7d7b1ab9fe3b8dfba6ce0e431';

export function isTeacherUser(user) {
  return Boolean(user && !user.isAnonymous && TEACHER_UID && isAllowedTeacherUid(user.uid, TEACHER_UID));
}


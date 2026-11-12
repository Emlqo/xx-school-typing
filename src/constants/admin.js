import { isAllowedTeacherUid } from './teacherAccess.js';

export const TEACHER_UID = String(import.meta.env.VITE_TEACHER_UID || '').trim();
export const TEACHER_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
export const TEACHER_PASSWORD_HASH = '9936ce68cdb92108f983d2c89c5150fee7314980cc1d49a1c3a53c114c6c6b33';

export function isTeacherUser(user) {
  return Boolean(user && !user.isAnonymous && TEACHER_UID && isAllowedTeacherUid(user.uid, TEACHER_UID));
}


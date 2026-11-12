// Firebase Auth UIDs are identifiers, not credentials. Keep firestore.rules in sync.
export const ADDITIONAL_TEACHER_UIDS = Object.freeze([
  'vioi7NZk6WOECUbsu12MMDXPOVh2',
]);

export function isAllowedTeacherUid(uid, primaryUid) {
  return typeof uid === 'string' && uid.length > 0
    && (uid === primaryUid || ADDITIONAL_TEACHER_UIDS.includes(uid));
}

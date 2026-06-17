export async function hashTeacherPassword(password = '') {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyTeacherPassword(password = '', expectedHash = '') {
  const passwordHash = await hashTeacherPassword(password);
  return passwordHash === expectedHash;
}

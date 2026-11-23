import { createCipheriv, createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';

export function typeforgeOrigin(value) {
  try {
    const target = new URL(value);
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname);
    if ((target.protocol !== 'https:' && !(loopback && target.protocol === 'http:')) ||
      target.pathname !== '/' || target.search || target.hash || target.username || target.password) return null;
    return target.origin;
  } catch {
    return null;
  }
}

export function issueTypeforgeEntry({ origin, secret, studentId, classId, grade, classNo, name, number, sessionExpiresAt, now = Date.now() }) {
  const iv = randomBytes(12);
  const key = createHash('sha256').update('typeforge-identity:' + secret).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ name, number }), 'utf8'), cipher.final()]);
  const identity = Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64url');
  const claims = {
    iss: 'pw_typing', aud: origin, sub: studentId, classId, grade, classNo, identity,
    nonce: randomUUID(), iat: now, exp: Math.min(now + 60000, sessionExpiresAt), sessionExpiresAt,
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return origin + '/#pw-entry=' + encoded + '.' + signature;
}

const SESSION_COOKIE_NAME = 'swe_admin_session';

async function sign(secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode('admin'));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function createSessionCookieValue() {
  return sign(process.env.ADMIN_SESSION_SECRET);
}

async function isValidSession(value) {
  if (!value) return false;
  const expected = await sign(process.env.ADMIN_SESSION_SECRET);
  if (value.length !== expected.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

module.exports = { SESSION_COOKIE_NAME, createSessionCookieValue, isValidSession };

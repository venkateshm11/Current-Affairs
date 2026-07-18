// Gemini API key encryption — Web Crypto API only (no npm crypto dependency).
//
// Contract (golden-rules.md #2, phase-1.md):
//  - AES-GCM, 256-bit key (authenticated encryption — never ECB/CBC)
//  - Key derived with PBKDF2 from (VITE_ENCRYPTION_SECRET + uid), 100000 iterations, SHA-256
//  - Salt: 16 random bytes (crypto.getRandomValues) — never Math.random()
//  - IV:   12 random bytes (crypto.getRandomValues)
//  - Output: base64 string of (salt || iv || ciphertext)
//
// The decrypted key is returned to the caller and must be discarded after a single use.
// Nothing here logs the plaintext key or the secret.

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getSecret() {
  const secret = import.meta.env.VITE_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('Missing VITE_ENCRYPTION_SECRET');
  }
  return secret;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(uid, salt) {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getSecret() + uid),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptApiKey(plainKey, uid) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(uid, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainKey),
  );
  const cipherBytes = new Uint8Array(cipherBuffer);

  const combined = new Uint8Array(salt.length + iv.length + cipherBytes.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(cipherBytes, salt.length + iv.length);

  return bytesToBase64(combined);
}

export async function decryptApiKey(encryptedKey, uid) {
  const combined = base64ToBytes(encryptedKey);
  const salt = combined.slice(0, SALT_BYTES);
  const iv = combined.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const cipherBytes = combined.slice(SALT_BYTES + IV_BYTES);

  const key = await deriveKey(uid, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBytes,
  );

  return decoder.decode(plainBuffer);
}

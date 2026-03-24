/**
 * Unit tests for the AES-256-GCM crypto helpers (Task 4).
 */

// Set a deterministic test key before importing crypto module
process.env.LOG_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes of 0xaa

import { encrypt, decrypt, sha256Hash } from '../../src/lib/crypto';

describe('encrypt / decrypt', () => {
  const samples = [
    'Hello, world!',
    'Special chars: <>&"\'',
    'Italian: ciao mamma 🍕',
    '',
    'x'.repeat(1000),
  ];

  it.each(samples)('round-trips: %s', (plaintext) => {
    const cipher = encrypt(plaintext);
    const recovered = decrypt(cipher);
    expect(recovered).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const text = 'same message';
    const c1 = encrypt(text);
    const c2 = encrypt(text);
    expect(c1).not.toBe(c2);
  });

  it('throws on tampered ciphertext', () => {
    const cipher = encrypt('tamper me');
    const parts = cipher.split(':');
    // Flip the last char of the tag
    const badTag = parts[2]!.slice(0, -1) + (parts[2]!.slice(-1) === 'a' ? 'b' : 'a');
    const tampered = `${parts[0]}:${parts[1]}:${badTag}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on malformed input', () => {
    expect(() => decrypt('not:valid')).toThrow('Invalid ciphertext format');
  });
});

describe('sha256Hash', () => {
  it('returns a 64-char hex string', () => {
    const hash = sha256Hash('https://example.com/media/abc.jpg');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic', () => {
    const url = 'https://example.com/media/abc.jpg';
    expect(sha256Hash(url)).toBe(sha256Hash(url));
  });

  it('differs for different inputs', () => {
    expect(sha256Hash('a')).not.toBe(sha256Hash('b'));
  });
});

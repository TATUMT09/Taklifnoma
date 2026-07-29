const crypto = require('crypto');

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function generateSlug(length = 7) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

module.exports = { generateSlug };

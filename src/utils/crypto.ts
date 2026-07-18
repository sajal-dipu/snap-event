/**
 * Cryptographic helpers for SnapEvent Virtual Rooms.
 * Uses native Web Crypto API for secure password generation and hashing.
 */

/**
 * Generates a cryptographically secure, strong random alphanumeric password.
 * Length is 12 characters, including uppercase, lowercase, numbers, and symbols.
 */
export function generateStrongPassword(length = 12): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = lowercase + uppercase + numbers + symbols;

  // Ensure at least one character from each set is included
  const getRandomChar = (set: string) => {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return set[array[0] % set.length];
    }
    return set[Math.floor(Math.random() * set.length)];
  };

  const passwordArray = [
    getRandomChar(lowercase),
    getRandomChar(uppercase),
    getRandomChar(numbers),
    getRandomChar(symbols),
  ];

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const array = new Uint32Array(length - 4);
    crypto.getRandomValues(array);
    for (let i = 0; i < length - 4; i++) {
      passwordArray.push(allChars[array[i] % allChars.length]);
    }

    // Shuffle the password array using Fisher-Yates
    const shuffleArray = new Uint32Array(passwordArray.length);
    crypto.getRandomValues(shuffleArray);
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = shuffleArray[i] % (i + 1);
      const temp = passwordArray[i];
      passwordArray[i] = passwordArray[j];
      passwordArray[j] = temp;
    }
  } else {
    for (let i = 0; i < length - 4; i++) {
      passwordArray.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = passwordArray[i];
      passwordArray[i] = passwordArray[j];
      passwordArray[j] = temp;
    }
  }

  return passwordArray.join("");
}

let cachedH: number[] | null = null;
let cachedK: number[] | null = null;

function sha256Fallback(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  let i: number, j: number;
  let result = "";

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  if (!cachedH || !cachedK) {
    cachedH = [];
    cachedK = [];
    let primeCounter = 0;
    const isComposite: { [key: number]: number } = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        cachedH[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        cachedK[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
  }

  let hash = [...cachedH!];
  const k = cachedK!;

  ascii += "\x80";
  while (ascii[lengthProperty] % 64 - 56) ascii += "\x00";

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ""; // ASCII check (guaranteed by unescape(encodeURIComponent(str)))
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

/**
 * Generates a SHA-256 hash of a cleartext string.
 * Uses Web Crypto API when available, and falls back to Node.js crypto module or a pure JS implementation.
 */
export async function hashPassword(password: string): Promise<string> {
  // 1. Guard & Web Crypto API
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
      if (!hashBuffer) {
        throw new Error("crypto.subtle.digest returned null/undefined buffer");
      }
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      return hashHex;
    } catch (err) {
      console.error("Error during Web Crypto digest in src/utils/crypto.ts at line 71:", err);
      throw err; // Do not suppress the error
    }
  }

  // Warning when standard Web Crypto API is unavailable
  if (typeof crypto === "undefined") {
    console.warn("Warning: crypto is undefined in src/utils/crypto.ts at line 71");
  } else if (!crypto.subtle) {
    console.warn("Warning: crypto.subtle is undefined in src/utils/crypto.ts at line 71");
  }

  // 2. Node.js createHash fallback for Server-side
  if (typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require("crypto");
      if (nodeCrypto && typeof nodeCrypto.createHash === "function") {
        const hash = nodeCrypto.createHash("sha256");
        if (hash) {
          hash.update(password);
          const digest = hash.digest("hex");
          if (digest) {
            return digest;
          }
          throw new Error("Node.js createHash().digest() returned null/undefined in src/utils/crypto.ts");
        }
      }
    } catch (err) {
      console.error("Error during Node.js crypto fallback in src/utils/crypto.ts:", err);
      throw err; // Do not suppress the error
    }
  }

  // 3. Pure JS SHA-256 Fallback for non-secure client-side contexts
  try {
    const utf8String = unescape(encodeURIComponent(password));
    const hash = sha256Fallback(utf8String);
    if (!hash) {
      throw new Error("Pure JS sha256Fallback returned empty/null hash in src/utils/crypto.ts");
    }
    return hash;
  } catch (err) {
    console.error("Error during pure JS SHA-256 fallback in src/utils/crypto.ts:", err);
    throw err; // Do not suppress the error
  }
}

/**
 * Generates a unique security code of the format XXXX-XXXX (e.g. A7F3-D9K2).
 */
export function generateSecurityCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const getSecureChar = () => {
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return chars[array[0] % chars.length];
    }
    return chars[Math.floor(Math.random() * chars.length)];
  };

  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += getSecureChar();
    part2 += getSecureChar();
  }
  return `${part1}-${part2}`;
}



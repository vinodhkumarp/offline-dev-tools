// Browser-native JWT (JWS compact) signature and claim verification using Web Crypto.
// Nothing is sent over the network; keys are imported as non-extractable and never stored.

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'info';

export interface Check {
  label: string;
  status: CheckStatus;
  message: string;
}

export interface VerifyOptions {
  /** Encoding of an HMAC secret. */
  secretEncoding?: 'utf8' | 'base64';
  /** Allowed clock skew in seconds for exp/nbf/iat. */
  clockSkewSeconds?: number;
  /** Expected `iss` value; skipped when empty. */
  issuer?: string;
  /** Expected `aud` value; skipped when empty. */
  audience?: string;
  /** Current time in ms (for tests). */
  now?: number;
}

export interface VerifyResult {
  /** true = valid, false = invalid, null = could not be checked (e.g. bad key input). */
  signatureValid: boolean | null;
  algorithm: string;
  checks: Check[];
}

type Family = 'HMAC' | 'RSASSA-PKCS1-v1_5' | 'RSA-PSS' | 'ECDSA' | 'Ed25519';

interface AlgorithmSpec {
  family: Family;
  hash?: 'SHA-256' | 'SHA-384' | 'SHA-512';
  namedCurve?: 'P-256' | 'P-384' | 'P-521';
  /** Raw (IEEE P1363) ECDSA signature length in bytes. */
  signatureLength?: number;
  hashBytes?: number;
}

export const SUPPORTED_ALGORITHMS: Record<string, AlgorithmSpec> = {
  HS256: { family: 'HMAC', hash: 'SHA-256', hashBytes: 32 },
  HS384: { family: 'HMAC', hash: 'SHA-384', hashBytes: 48 },
  HS512: { family: 'HMAC', hash: 'SHA-512', hashBytes: 64 },
  RS256: { family: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
  RS384: { family: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
  RS512: { family: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
  PS256: { family: 'RSA-PSS', hash: 'SHA-256', hashBytes: 32 },
  PS384: { family: 'RSA-PSS', hash: 'SHA-384', hashBytes: 48 },
  PS512: { family: 'RSA-PSS', hash: 'SHA-512', hashBytes: 64 },
  ES256: { family: 'ECDSA', hash: 'SHA-256', namedCurve: 'P-256', signatureLength: 64 },
  ES384: { family: 'ECDSA', hash: 'SHA-384', namedCurve: 'P-384', signatureLength: 96 },
  ES512: { family: 'ECDSA', hash: 'SHA-512', namedCurve: 'P-521', signatureLength: 132 },
  EdDSA: { family: 'Ed25519' },
  Ed25519: { family: 'Ed25519' },
};

export const isSymmetricAlgorithm = (alg: string) => SUPPORTED_ALGORITHMS[alg]?.family === 'HMAC';

class KeyInputError extends Error {}

// ---------------------------------------------------------------------------
// Encoding helpers

const BASE64URL = /^[A-Za-z0-9_-]*$/;

export const base64UrlToBytes = (input: string): Uint8Array<ArrayBuffer> => {
  const normalized = input.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(normalized) || normalized.length % 4 === 1) {
    throw new KeyInputError('Value is not valid base64/base64url.');
  }
  const binary = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const decodeJsonPart = (part: string, name: string): Record<string, unknown> => {
  if (!BASE64URL.test(part)) throw new Error(`The ${name} is not base64url encoded.`);
  const value = JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`The ${name} is not a JSON object.`);
  return value as Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Key parsing

type ParsedKey =
  | { kind: 'spki'; data: Uint8Array<ArrayBuffer>; source: string }
  | { kind: 'jwk'; data: JsonWebKey; source: string };

const pemBody = (pem: string, label: string): Uint8Array<ArrayBuffer> => {
  const match = pem.match(new RegExp(`-----BEGIN ${label}-----([\\s\\S]*?)-----END ${label}-----`));
  if (!match) throw new KeyInputError(`Could not find a complete ${label} PEM block.`);
  return base64UrlToBytes(match[1].replace(/\s+/g, ''));
};

// Minimal DER reader: enough to pull SubjectPublicKeyInfo out of an X.509 certificate.
const readTlv = (der: Uint8Array<ArrayBuffer>, offset: number) => {
  const tag = der[offset];
  let length = der[offset + 1];
  let headerLength = 2;
  if (length & 0x80) {
    const byteCount = length & 0x7f;
    if (byteCount === 0 || byteCount > 4) throw new KeyInputError('Unsupported DER length in certificate.');
    length = 0;
    for (let i = 0; i < byteCount; i++) length = length * 256 + der[offset + 2 + i];
    headerLength += byteCount;
  }
  const end = offset + headerLength + length;
  if (end > der.length) throw new KeyInputError('Truncated certificate.');
  return { tag, start: offset, contentStart: offset + headerLength, end };
};

export const spkiFromCertificate = (der: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
  const certificate = readTlv(der, 0);
  const tbs = readTlv(der, certificate.contentStart);
  if (certificate.tag !== 0x30 || tbs.tag !== 0x30) throw new KeyInputError('Not an X.509 certificate.');

  let cursor = tbs.contentStart;
  const next = () => {
    const tlv = readTlv(der, cursor);
    cursor = tlv.end;
    return tlv;
  };

  if (next().tag === 0xa0) next(); // optional [0] version, then serialNumber
  next(); // signature algorithm
  next(); // issuer
  next(); // validity
  next(); // subject
  const spki = next();
  if (spki.tag !== 0x30) throw new KeyInputError('Could not locate the public key in the certificate.');
  return der.slice(spki.start, spki.end);
};

const publicJwk = (jwk: JsonWebKey): JsonWebKey => {
  switch (jwk.kty) {
    case 'RSA':
      return { kty: 'RSA', n: jwk.n, e: jwk.e };
    case 'EC':
      return { kty: 'EC', crv: jwk.crv, x: jwk.x, y: jwk.y };
    case 'OKP':
      return { kty: 'OKP', crv: jwk.crv, x: jwk.x };
    default:
      throw new KeyInputError(`Unsupported JWK key type "${jwk.kty}" for an asymmetric algorithm.`);
  }
};

const chooseFromJwks = (keys: JsonWebKey[], header: Record<string, unknown>, checks: Check[]): JsonWebKey & { kid?: string } => {
  const kid = typeof header.kid === 'string' ? header.kid : undefined;
  const candidates = keys as (JsonWebKey & { kid?: string; use?: string })[];
  if (kid) {
    const match = candidates.find((key) => key.kid === kid);
    if (!match) throw new KeyInputError(`No key in the JWKS has kid "${kid}".`);
    checks.push({ label: 'Key selection', status: 'pass', message: `Selected JWKS key with kid "${kid}".` });
    return match;
  }
  const signingKeys = candidates.filter((key) => key.use !== 'enc');
  if (signingKeys.length === 1) {
    checks.push({ label: 'Key selection', status: 'warn', message: 'Token has no kid; using the only signing key in the JWKS.' });
    return signingKeys[0];
  }
  throw new KeyInputError('Token has no kid and the JWKS contains several keys. Paste the specific key instead.');
};

const parseAsymmetricKey = (input: string, header: Record<string, unknown>, alg: string, checks: Check[]): ParsedKey => {
  const text = input.trim();
  if (!text) throw new KeyInputError(`Paste a public key (PEM, X.509 certificate, JWK, or JWKS) to verify ${alg}.`);

  if (/PRIVATE KEY-----/.test(text)) {
    throw new KeyInputError('This looks like a private key. Verification only needs the public key; avoid pasting private keys.');
  }
  if (/-----BEGIN RSA PUBLIC KEY-----/.test(text)) {
    throw new KeyInputError('PKCS#1 "RSA PUBLIC KEY" PEM is not supported. Convert it with: openssl rsa -RSAPublicKey_in -in key.pem -pubout');
  }
  if (/-----BEGIN CERTIFICATE-----/.test(text)) {
    return { kind: 'spki', data: spkiFromCertificate(pemBody(text, 'CERTIFICATE')), source: 'X.509 certificate' };
  }
  if (/-----BEGIN PUBLIC KEY-----/.test(text)) {
    return { kind: 'spki', data: pemBody(text, 'PUBLIC KEY'), source: 'PEM public key' };
  }

  if (text.startsWith('{')) {
    let parsed: JsonWebKey & { keys?: JsonWebKey[]; alg?: string; use?: string; kid?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new KeyInputError('Key looks like JSON but could not be parsed.');
    }
    let jwk = parsed;
    let source = 'JWK';
    if (Array.isArray(parsed.keys)) {
      jwk = chooseFromJwks(parsed.keys, header, checks);
      source = 'JWKS';
    }
    if (jwk.alg && jwk.alg !== alg) {
      throw new KeyInputError(`The key is restricted to ${jwk.alg}, but the token uses ${alg}.`);
    }
    if (jwk.use === 'enc') {
      throw new KeyInputError('The key is marked for encryption (use: "enc"), not signatures.');
    }
    if ('d' in jwk) {
      checks.push({ label: 'Key material', status: 'warn', message: 'The JWK contains private key material. Only the public part was used.' });
    }
    return { kind: 'jwk', data: publicJwk(jwk), source };
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(text) && text.replace(/\s/g, '').length > 100) {
    // Bare base64: Azure AD / SAML x5c certificates are often shared without PEM headers.
    const der = base64UrlToBytes(text.replace(/\s/g, ''));
    try {
      return { kind: 'spki', data: spkiFromCertificate(der), source: 'base64 X.509 certificate' };
    } catch {
      return { kind: 'spki', data: der, source: 'base64 SubjectPublicKeyInfo' };
    }
  }

  throw new KeyInputError('Unrecognised key format. Use a PEM public key, X.509 certificate, JWK, or JWKS.');
};

const importParams = (spec: AlgorithmSpec): AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams => {
  switch (spec.family) {
    case 'RSASSA-PKCS1-v1_5':
    case 'RSA-PSS':
      return { name: spec.family, hash: spec.hash! };
    case 'ECDSA':
      return { name: 'ECDSA', namedCurve: spec.namedCurve! };
    case 'Ed25519':
      return { name: 'Ed25519' };
    default:
      throw new Error('Unexpected algorithm family.');
  }
};

const verifyParams = (spec: AlgorithmSpec): AlgorithmIdentifier | RsaPssParams | EcdsaParams => {
  switch (spec.family) {
    case 'RSA-PSS':
      return { name: 'RSA-PSS', saltLength: spec.hashBytes! };
    case 'ECDSA':
      return { name: 'ECDSA', hash: spec.hash! };
    default:
      return { name: spec.family };
  }
};

// ---------------------------------------------------------------------------
// Claims

const checkClaims = (payload: Record<string, unknown>, options: VerifyOptions): Check[] => {
  const checks: Check[] = [];
  const now = Math.floor((options.now ?? Date.now()) / 1000);
  const skew = options.clockSkewSeconds ?? 0;
  const at = (seconds: number) => new Date(seconds * 1000).toISOString();

  const numeric = (name: string): number | undefined => {
    const value = payload[name];
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      checks.push({ label: name, status: 'fail', message: `"${name}" must be a NumericDate (seconds since epoch).` });
      return undefined;
    }
    return value;
  };

  const exp = numeric('exp');
  if (exp === undefined && payload.exp === undefined) {
    checks.push({ label: 'exp', status: 'warn', message: 'Token has no expiry (exp).' });
  } else if (exp !== undefined) {
    checks.push(
      now >= exp + skew
        ? { label: 'exp', status: 'fail', message: `Expired at ${at(exp)}.` }
        : { label: 'exp', status: 'pass', message: `Valid until ${at(exp)}.` }
    );
  }

  const nbf = numeric('nbf');
  if (nbf !== undefined) {
    checks.push(
      now < nbf - skew
        ? { label: 'nbf', status: 'fail', message: `Not valid before ${at(nbf)}.` }
        : { label: 'nbf', status: 'pass', message: `Valid since ${at(nbf)}.` }
    );
  }

  const iat = numeric('iat');
  if (iat !== undefined && iat > now + skew) {
    checks.push({ label: 'iat', status: 'warn', message: `Issued in the future (${at(iat)}). Check clock skew.` });
  }

  if (options.issuer?.trim()) {
    const expected = options.issuer.trim();
    checks.push(
      payload.iss === expected
        ? { label: 'iss', status: 'pass', message: `Issuer matches "${expected}".` }
        : { label: 'iss', status: 'fail', message: `Expected issuer "${expected}", got ${JSON.stringify(payload.iss ?? null)}.` }
    );
  }

  if (options.audience?.trim()) {
    const expected = options.audience.trim();
    const aud = payload.aud;
    const audiences = Array.isArray(aud) ? aud : aud === undefined ? [] : [aud];
    checks.push(
      audiences.includes(expected)
        ? { label: 'aud', status: 'pass', message: `Audience includes "${expected}".` }
        : { label: 'aud', status: 'fail', message: `Expected audience "${expected}", got ${JSON.stringify(aud ?? null)}.` }
    );
  }

  return checks;
};

// ---------------------------------------------------------------------------
// Verification

export const verifyJwt = async (token: string, keyInput: string, options: VerifyOptions = {}): Promise<VerifyResult> => {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('A signed JWT must have exactly 3 dot-separated parts.');

  const header = decodeJsonPart(parts[0], 'header');
  const payload = decodeJsonPart(parts[1], 'payload');
  const alg = typeof header.alg === 'string' ? header.alg : '';
  const checks: Check[] = [];
  const claimChecks = checkClaims(payload, options);
  const result = (signatureValid: boolean | null): VerifyResult => ({ signatureValid, algorithm: alg, checks: [...checks, ...claimChecks] });

  if (!alg || alg.toLowerCase() === 'none') {
    checks.push({ label: 'Signature', status: 'fail', message: 'Token is unsigned (alg "none"). Never accept these.' });
    return result(false);
  }

  const spec = SUPPORTED_ALGORITHMS[alg];
  if (!spec) {
    checks.push({ label: 'Signature', status: 'fail', message: `Unsupported algorithm "${alg}".` });
    return result(null);
  }

  if (Array.isArray(header.crit) && header.crit.length > 0) {
    checks.push({ label: 'crit', status: 'fail', message: `Token requires unsupported critical header(s): ${header.crit.join(', ')}.` });
    return result(false);
  }

  if (!BASE64URL.test(parts[2]) || parts[2] === '') {
    checks.push({ label: 'Signature', status: 'fail', message: 'Signature segment is missing or not base64url.' });
    return result(false);
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    checks.push({ label: 'Signature', status: 'fail', message: 'Web Crypto is unavailable. Serve the app over HTTPS or localhost.' });
    return result(null);
  }

  const signature = base64UrlToBytes(parts[2]);
  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  try {
    let key: CryptoKey;

    if (spec.family === 'HMAC') {
      if (!keyInput) throw new KeyInputError(`Enter the shared secret to verify ${alg}.`);
      if (/-----BEGIN|^\s*\{/.test(keyInput)) {
        checks.push({ label: 'Key material', status: 'warn', message: 'The secret looks like a public key or JWK. A token that is HMAC-signed with a public key is a classic algorithm-confusion attack.' });
      }
      const secret = options.secretEncoding === 'base64' ? base64UrlToBytes(keyInput) : new TextEncoder().encode(keyInput);
      if (secret.length < spec.hashBytes!) {
        checks.push({ label: 'Key strength', status: 'warn', message: `Secret is ${secret.length} bytes; RFC 7518 requires at least ${spec.hashBytes} bytes for ${alg}.` });
      }
      key = await subtle.importKey('raw', secret, { name: 'HMAC', hash: spec.hash! }, false, ['verify']);
      checks.push({ label: 'Key', status: 'info', message: `Shared secret (${options.secretEncoding === 'base64' ? 'base64' : 'UTF-8'}).` });
    } else {
      const parsed = parseAsymmetricKey(keyInput, header, alg, checks);
      try {
        key = parsed.kind === 'spki'
          ? await subtle.importKey('spki', parsed.data, importParams(spec), false, ['verify'])
          : await subtle.importKey('jwk', parsed.data, importParams(spec), false, ['verify']);
      } catch (e) {
        throw new KeyInputError(`The ${parsed.source} does not match ${alg} (${(e as Error).message || 'import failed'}).`);
      }
      checks.push({ label: 'Key', status: 'info', message: `${parsed.source} (${key.algorithm.name}).` });

      const modulusLength = (key.algorithm as RsaHashedKeyAlgorithm).modulusLength;
      if (modulusLength && modulusLength < 2048) {
        checks.push({ label: 'Key strength', status: 'warn', message: `RSA key is ${modulusLength} bits; use at least 2048.` });
      }
      if (spec.signatureLength && signature.length !== spec.signatureLength) {
        checks.push({ label: 'Signature', status: 'fail', message: `${alg} signatures must be ${spec.signatureLength} raw bytes, got ${signature.length}. DER-encoded ECDSA signatures are not valid in JWS.` });
        return result(false);
      }
    }

    const valid = await subtle.verify(verifyParams(spec), key, signature, signingInput);
    checks.push(
      valid
        ? { label: 'Signature', status: 'pass', message: `Signature is valid (${alg}).` }
        : { label: 'Signature', status: 'fail', message: 'Signature does NOT match this key. The token may be tampered with, or the key is wrong.' }
    );
    return result(valid);
  } catch (e) {
    if (e instanceof KeyInputError) {
      checks.push({ label: 'Key', status: 'fail', message: e.message });
      return result(null);
    }
    const name = (e as Error).name;
    const message = name === 'NotSupportedError'
      ? `This browser does not support ${alg} in Web Crypto.`
      : `Verification failed: ${(e as Error).message || name}`;
    checks.push({ label: 'Signature', status: 'fail', message });
    return result(null);
  }
};

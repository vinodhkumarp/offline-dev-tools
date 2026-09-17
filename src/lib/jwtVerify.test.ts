import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createHmac,
  constants,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from 'node:crypto';
import { verifyJwt } from './jwtVerify.ts';

const b64u = (value: Buffer | string) => Buffer.from(value).toString('base64url');
const NOW = Date.UTC(2026, 0, 1) ;
const nowSec = Math.floor(NOW / 1000);

const encode = (header: object, payload: object) => `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;
const basePayload = { sub: 'user-1', iss: 'https://issuer.example', aud: ['api'], iat: nowSec - 10, exp: nowSec + 3600 };

const signAsymmetric = (alg: string, privateKey: KeyObject, header: object = {}) => {
  const input = encode({ alg, typ: 'JWT', ...header }, basePayload);
  const hash = `sha${alg.slice(2)}`;
  let signature: Buffer;
  if (alg.startsWith('RS')) signature = sign(hash, Buffer.from(input), privateKey);
  else if (alg.startsWith('PS')) signature = sign(hash, Buffer.from(input), { key: privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: Number(alg.slice(2)) / 8 });
  else if (alg.startsWith('ES')) signature = sign(hash, Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  else signature = sign(null, Buffer.from(input), privateKey);
  return `${input}.${b64u(signature)}`;
};

const tamper = (token: string) => {
  const [h, , s] = token.split('.');
  return `${h}.${b64u(JSON.stringify({ ...basePayload, sub: 'admin' }))}.${s}`;
};

const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
const keyPairs = {
  RS256: rsa, RS384: rsa, RS512: rsa, PS256: rsa, PS384: rsa, PS512: rsa,
  ES256: generateKeyPairSync('ec', { namedCurve: 'P-256' }),
  ES384: generateKeyPairSync('ec', { namedCurve: 'P-384' }),
  ES512: generateKeyPairSync('ec', { namedCurve: 'P-521' }),
  EdDSA: generateKeyPairSync('ed25519'),
};

for (const [alg, pair] of Object.entries(keyPairs)) {
  test(`${alg}: valid with PEM and JWK, invalid when tampered`, async () => {
    const token = signAsymmetric(alg, pair.privateKey);
    const pem = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const jwk = JSON.stringify(pair.publicKey.export({ format: 'jwk' }));

    assert.equal((await verifyJwt(token, pem, { now: NOW })).signatureValid, true);
    assert.equal((await verifyJwt(token, jwk, { now: NOW })).signatureValid, true);
    assert.equal((await verifyJwt(tamper(token), pem, { now: NOW })).signatureValid, false);
  });
}

test('HS256/384/512 with UTF-8 and base64 secrets', async () => {
  const secret = 'a-very-long-shared-secret-value-with-64-bytes-of-entropy-00000000';
  for (const alg of ['HS256', 'HS384', 'HS512']) {
    const input = encode({ alg, typ: 'JWT' }, basePayload);
    const token = `${input}.${b64u(createHmac(`sha${alg.slice(2)}`, secret).update(input).digest())}`;
    assert.equal((await verifyJwt(token, secret, { now: NOW })).signatureValid, true, alg);
    assert.equal((await verifyJwt(token, b64u(secret), { now: NOW, secretEncoding: 'base64' })).signatureValid, true, alg);
    assert.equal((await verifyJwt(token, 'wrong', { now: NOW })).signatureValid, false, alg);
  }
});

test('weak HMAC secrets produce a warning', async () => {
  const input = encode({ alg: 'HS256' }, basePayload);
  const token = `${input}.${b64u(createHmac('sha256', 'short').update(input).digest())}`;
  const result = await verifyJwt(token, 'short', { now: NOW });
  assert.equal(result.signatureValid, true);
  assert.ok(result.checks.some((c) => c.label === 'Key strength' && c.status === 'warn'));
});

test('JWKS key selection by kid', async () => {
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const token = signAsymmetric('RS256', rsa.privateKey, { kid: 'key-2' });
  const jwks = JSON.stringify({
    keys: [
      { ...other.publicKey.export({ format: 'jwk' }), kid: 'key-1', use: 'sig' },
      { ...rsa.publicKey.export({ format: 'jwk' }), kid: 'key-2', use: 'sig' },
    ],
  });
  assert.equal((await verifyJwt(token, jwks, { now: NOW })).signatureValid, true);

  const unknownKid = signAsymmetric('RS256', rsa.privateKey, { kid: 'missing' });
  const result = await verifyJwt(unknownKid, jwks, { now: NOW });
  assert.equal(result.signatureValid, null);
  assert.match(result.checks.find((c) => c.label === 'Key')!.message, /No key in the JWKS/);
});

test('rejects alg none, algorithm/key mismatch, and private keys', async () => {
  const none = `${encode({ alg: 'none' }, basePayload)}.`;
  assert.equal((await verifyJwt(none, '', { now: NOW })).signatureValid, false);

  const token = signAsymmetric('RS256', rsa.privateKey);
  const ecPem = keyPairs.ES256.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  assert.equal((await verifyJwt(token, ecPem, { now: NOW })).signatureValid, null);

  const restrictedJwk = JSON.stringify({ ...rsa.publicKey.export({ format: 'jwk' }), alg: 'PS256' });
  assert.equal((await verifyJwt(token, restrictedJwk, { now: NOW })).signatureValid, null);

  const privatePem = rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const result = await verifyJwt(token, privatePem, { now: NOW });
  assert.equal(result.signatureValid, null);
  assert.match(result.checks.find((c) => c.label === 'Key')!.message, /private key/);
});

test('HMAC token checked against a public key is flagged as algorithm confusion', async () => {
  const pem = rsa.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const input = encode({ alg: 'HS256' }, basePayload);
  const token = `${input}.${b64u(createHmac('sha256', pem).update(input).digest())}`;
  const result = await verifyJwt(token, pem, { now: NOW });
  assert.ok(result.checks.some((c) => /algorithm-confusion/.test(c.message)));
});

test('claim checks: exp, nbf, iss, aud with clock skew', async () => {
  const input = encode({ alg: 'HS256' }, { ...basePayload, exp: nowSec - 30, nbf: nowSec + 30 });
  const secret = 'x'.repeat(32);
  const token = `${input}.${b64u(createHmac('sha256', secret).update(input).digest())}`;

  const strict = await verifyJwt(token, secret, { now: NOW, issuer: 'https://issuer.example', audience: 'other' });
  const status = (label: string) => strict.checks.find((c) => c.label === label)?.status;
  assert.equal(status('exp'), 'fail');
  assert.equal(status('nbf'), 'fail');
  assert.equal(status('iss'), 'pass');
  assert.equal(status('aud'), 'fail');

  const lenient = await verifyJwt(token, secret, { now: NOW, clockSkewSeconds: 60 });
  assert.equal(lenient.checks.find((c) => c.label === 'exp')?.status, 'pass');
  assert.equal(lenient.checks.find((c) => c.label === 'nbf')?.status, 'pass');
});

test('X.509 certificate (PEM and bare base64 x5c)', { skip: spawnSync('openssl', ['version']).status !== 0 }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'jwt-cert-'));
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');
  const created = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath, '-days', '1', '-subj', '/CN=test']);
  assert.equal(created.status, 0, created.stderr.toString());

  const { createPrivateKey } = await import('node:crypto');
  const token = signAsymmetric('RS256', createPrivateKey(readFileSync(keyPath)));
  const certPem = readFileSync(certPath, 'utf8');
  assert.equal((await verifyJwt(token, certPem, { now: NOW })).signatureValid, true);

  const x5c = certPem.replace(/-----(BEGIN|END) CERTIFICATE-----|\s/g, '');
  assert.equal((await verifyJwt(token, x5c, { now: NOW })).signatureValid, true);
});

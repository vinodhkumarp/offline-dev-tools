import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, ShieldAlert, ShieldQuestion, Copy, Check, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { verifyJwt, isSymmetricAlgorithm, type Check as VerifyCheck, type VerifyResult } from '../lib/jwtVerify';

const CHECK_ICON = {
  pass: { Icon: CheckCircle2, color: 'var(--success)' },
  fail: { Icon: XCircle, color: 'var(--danger)' },
  warn: { Icon: AlertTriangle, color: 'var(--warning)' },
  info: { Icon: Info, color: 'var(--text-muted)' },
} as const;

interface JWTDecoded {
  header: object | null;
  payload: object | null;
  signature: string;
  isExpired: boolean | null;
  expirationTime: Date | null;
  timeLeft: string;
}

const EMPTY_DECODED: JWTDecoded = {
  header: null,
  payload: null,
  signature: '',
  isExpired: null,
  expirationTime: null,
  timeLeft: ''
};

export const JWTDebugger: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [decoded, setDecoded] = useState<JWTDecoded>({
    header: null,
    payload: null,
    signature: '',
    isExpired: null,
    expirationTime: null,
    timeLeft: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Signature verification inputs live only in component state; they are never persisted.
  const [keyInput, setKeyInput] = useState<string>('');
  const [secretEncoding, setSecretEncoding] = useState<'utf8' | 'base64'>('utf8');
  const [expectedIssuer, setExpectedIssuer] = useState<string>('');
  const [expectedAudience, setExpectedAudience] = useState<string>('');
  const [clockSkew, setClockSkew] = useState<number>(0);
  // Each result is tagged with the inputs it was computed for, so a stale result is never shown for new input.
  const [verificationState, setVerificationState] = useState<{ inputs: string; result: VerifyResult } | null>(null);

  const algorithm = decoded.header && typeof (decoded.header as { alg?: unknown }).alg === 'string'
    ? (decoded.header as { alg: string }).alg
    : '';
  const symmetric = isSymmetricAlgorithm(algorithm);

  const verificationInputs = JSON.stringify([token, keyInput, secretEncoding, expectedIssuer, expectedAudience, clockSkew]);
  const canVerify = Boolean(decoded.header) && !error;
  const verification = canVerify && verificationState?.inputs === verificationInputs ? verificationState.result : null;

  useEffect(() => {
    if (!canVerify) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      verifyJwt(token, keyInput, {
        secretEncoding,
        issuer: expectedIssuer,
        audience: expectedAudience,
        clockSkewSeconds: clockSkew,
      })
        .then((result) => {
          if (!cancelled) setVerificationState({ inputs: verificationInputs, result });
        })
        .catch((e: Error) => {
          if (!cancelled) {
            setVerificationState({
              inputs: verificationInputs,
              result: { signatureValid: null, algorithm, checks: [{ label: 'Token', status: 'fail', message: e.message }] }
            });
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canVerify, verificationInputs, token, keyInput, secretEncoding, expectedIssuer, expectedAudience, clockSkew, algorithm]);

  const hasKey = keyInput.trim() !== '' || algorithm.toLowerCase() === 'none';
  const claimFailed = verification?.checks.some((c) => c.status === 'fail' && ['exp', 'nbf', 'iss', 'aud', 'crit'].includes(c.label));
  const verdict = hasKey && !verification
    ? { tone: 'neutral', title: 'Verifying…', detail: 'Checking the signature in your browser.' }
    : !verification || !hasKey
    ? { tone: 'neutral', title: 'Signature not verified', detail: symmetric ? 'Enter the shared secret below to verify.' : 'Paste the issuer public key, certificate, JWK or JWKS below to verify.' }
    : verification.signatureValid === true && !claimFailed
      ? { tone: 'pass', title: 'Signature verified', detail: `Valid ${verification.algorithm} signature and claims.` }
      : verification.signatureValid === true
        ? { tone: 'warn', title: 'Signature valid, claims rejected', detail: 'The token was signed by this key but must not be accepted.' }
        : verification.signatureValid === false
          ? { tone: 'fail', title: 'Invalid signature', detail: 'Do not trust this token.' }
          : { tone: 'warn', title: 'Could not verify', detail: 'See the details below.' };
  const verdictColor = { pass: 'var(--success)', fail: 'var(--danger)', warn: 'var(--warning)', neutral: 'var(--text-muted)' }[verdict.tone];
  const VerdictIcon = verdict.tone === 'pass' ? ShieldCheck : verdict.tone === 'neutral' ? ShieldQuestion : ShieldAlert;
  const visibleChecks: VerifyCheck[] = hasKey
    ? verification?.checks ?? []
    : (verification?.checks ?? []).filter((c) => c.label !== 'Key' && c.label !== 'Signature');

  const copyToClipboard = (sectionName: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(sectionName);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  const base64UrlDecode = (str: string): string => {
    try {
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      const binString = atob(base64);
      const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch (e) {
      throw new Error('Base64 decode failed', { cause: e });
    }
  };

  const decodeToken = (jwtToken: string) => {
    setToken(jwtToken);
    setError(null);

    if (!jwtToken.trim()) {
      setDecoded({
        header: null,
        payload: null,
        signature: '',
        isExpired: null,
        expirationTime: null,
        timeLeft: ''
      });
      return;
    }

    const parts = jwtToken.trim().split('.');
    if (parts.length !== 3) {
      setDecoded(EMPTY_DECODED);
      setError('A JWT must contain exactly 3 parts separated by dots (.)');
      return;
    }

    try {
      const headerStr = base64UrlDecode(parts[0]);
      const payloadStr = base64UrlDecode(parts[1]);
      const signature = parts[2];

      const header = JSON.parse(headerStr);
      const payload = JSON.parse(payloadStr);

      let isExpired = null;
      let expirationTime = null;

      if (payload && typeof payload === 'object' && 'exp' in payload) {
        const expUnix = (payload as { exp?: number }).exp;
        if (typeof expUnix === 'number') {
          expirationTime = new Date(expUnix * 1000);
          isExpired = expirationTime.getTime() < Date.now();
        }
      }

      setDecoded({
        header,
        payload,
        signature,
        isExpired,
        expirationTime,
        timeLeft: ''
      });
    } catch (e) {
      setDecoded(EMPTY_DECODED);
      setError('Invalid JWT structure or failed to parse JSON parts: ' + (e as Error).message);
    }
  };

  // Live timer for token expiration
  useEffect(() => {
    if (!decoded.expirationTime) return;

    const updateTimeLeft = () => {
      const diff = decoded.expirationTime!.getTime() - Date.now();
      if (diff <= 0) {
        setDecoded(prev => ({ ...prev, isExpired: true, timeLeft: 'Expired' }));
        return;
      }

      const secs = Math.floor(diff / 1000) % 60;
      const mins = Math.floor(diff / (1000 * 60)) % 60;
      const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      let timeStr = '';
      if (days > 0) timeStr += `${days}d `;
      if (hours > 0 || days > 0) timeStr += `${hours}h `;
      if (mins > 0 || hours > 0 || days > 0) timeStr += `${mins}m `;
      timeStr += `${secs}s`;

      setDecoded(prev => ({ ...prev, timeLeft: timeStr }));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [decoded.expirationTime]);

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">JWT Debugger</h2>
        <p className="tool-subtitle">
          Decode JSON Web Tokens and verify their signatures and claims entirely in your browser with Web Crypto. Keys are never stored or sent anywhere.
        </p>
      </div>

      <div className="jwt-grid">
        {/* Token Input (Left side) */}
        <div className="card jwt-panel-input">
          <span className="card-title-text">Encoded Token</span>
          <textarea
            value={token}
            onChange={(e) => decodeToken(e.target.value)}
            className="textarea code-editor"
            style={{ minHeight: '180px' }}
            placeholder="Paste your encoded JWT here (header.payload.signature)..."
          />
          {error && (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', border: '1px solid hsla(346, 84%, 50%, 0.2)', borderRadius: '8px' }}>
              {error}
            </div>
          )}
          {/* Signature verification */}
          {decoded.header && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '8px', border: `1px solid ${verdictColor}`, color: verdictColor, backgroundColor: 'var(--bg-input)' }}>
                <VerdictIcon size={20} style={{ flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700 }}>{verdict.title}</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{verdict.detail}</p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="jwt-verify-key">
                  {symmetric ? `Shared secret (${algorithm})` : `Public key${algorithm ? ` (${algorithm})` : ''}: PEM, X.509 certificate, JWK or JWKS`}
                </label>
                <textarea
                  id="jwt-verify-key"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="textarea code-editor"
                  style={{ minHeight: '110px' }}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={symmetric
                    ? 'Enter the HMAC secret...'
                    : '-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n\nor {"keys":[...]} copied from the issuer\'s JWKS endpoint'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                {symmetric && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="jwt-secret-encoding">Secret encoding</label>
                    <select id="jwt-secret-encoding" className="select" value={secretEncoding} onChange={(e) => setSecretEncoding(e.target.value as 'utf8' | 'base64')}>
                      <option value="utf8">UTF-8 text</option>
                      <option value="base64">Base64 / base64url</option>
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="jwt-iss">Expected issuer (iss)</label>
                  <input id="jwt-iss" className="input-text" value={expectedIssuer} onChange={(e) => setExpectedIssuer(e.target.value)} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="jwt-aud">Expected audience (aud)</label>
                  <input id="jwt-aud" className="input-text" value={expectedAudience} onChange={(e) => setExpectedAudience(e.target.value)} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="jwt-skew">Clock skew</label>
                  <select id="jwt-skew" className="select" value={clockSkew} onChange={(e) => setClockSkew(Number(e.target.value))}>
                    <option value={0}>None</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>60 seconds</option>
                    <option value={300}>5 minutes</option>
                  </select>
                </div>
              </div>

              {visibleChecks.length > 0 && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {visibleChecks.map((check, idx) => {
                    const { Icon, color } = CHECK_ICON[check.status];
                    return (
                      <li key={idx} style={{ display: 'flex', gap: '8px', fontSize: '11px', lineHeight: 1.5 }}>
                        <Icon size={13} style={{ color, flexShrink: 0, marginTop: '2px' }} />
                        <span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>{check.label}</strong>{' '}
                          <span style={{ color: 'var(--text-secondary)' }}>{check.message}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Decoded Details (Right side) */}
        <div className="jwt-panel-decoded">
          {/* Expiration Status Card */}
          {decoded.expirationTime && (
            <div className={`jwt-status-card ${decoded.isExpired ? 'expired' : 'active'}`}>
              <div className="jwt-status-wrapper">
                <div className="jwt-status-icon-box">
                  {decoded.isExpired ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Token Status: {decoded.isExpired ? 'Expired' : 'Active'}
                  </p>
                  <p style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>
                    Expires: {decoded.expirationTime.toLocaleString()}
                  </p>
                </div>
              </div>
              {!decoded.isExpired && (
                <div className="jwt-status-countdown">
                  <Clock size={12} />
                  <span>{decoded.timeLeft} left</span>
                </div>
              )}
            </div>
          )}

          {/* Decoded Header */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="card-header-row" style={{ marginBottom: '8px' }}>
              <span className="form-label" style={{ color: 'hsl(346, 84%, 60%)' }}>Header (Algorithm & Token Type)</span>
              {decoded.header && (
                <button
                  onClick={() => copyToClipboard('header', JSON.stringify(decoded.header, null, 2))}
                  className="copy-link"
                >
                  {copiedSection === 'header' ? <Check size={11} /> : <Copy size={11} />}
                  Copy
                </button>
              )}
            </div>
            <pre className="code-display-box" style={{ color: 'hsl(346, 84%, 65%)', border: '1px solid rgba(239, 68, 68, 0.15)', maxHeight: '160px' }}>
              {decoded.header ? JSON.stringify(decoded.header, null, 2) : '{}'}
            </pre>
          </div>

          {/* Decoded Payload */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="card-header-row" style={{ marginBottom: '8px' }}>
              <span className="form-label" style={{ color: 'hsl(263, 85%, 65%)' }}>Payload (Data Claims)</span>
              {decoded.payload && (
                <button
                  onClick={() => copyToClipboard('payload', JSON.stringify(decoded.payload, null, 2))}
                  className="copy-link"
                >
                  {copiedSection === 'payload' ? <Check size={11} /> : <Copy size={11} />}
                  Copy
                </button>
              )}
            </div>
            <pre className="code-display-box" style={{ color: 'hsl(263, 85%, 70%)', border: '1px solid rgba(139, 92, 246, 0.15)', maxHeight: '250px' }}>
              {decoded.payload ? JSON.stringify(decoded.payload, null, 2) : '{}'}
            </pre>
          </div>

          {/* Decoded Signature */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="card-header-row" style={{ marginBottom: '8px' }}>
              <span className="form-label" style={{ color: 'hsl(180, 70%, 50%)' }}>Signature</span>
              {decoded.signature && (
                <button
                  onClick={() => copyToClipboard('signature', decoded.signature)}
                  className="copy-link"
                >
                  {copiedSection === 'signature' ? <Check size={11} /> : <Copy size={11} />}
                  Copy
                </button>
              )}
            </div>
            <pre className="code-display-box" style={{ color: 'hsl(180, 70%, 55%)', border: '1px solid rgba(6, 182, 212, 0.15)', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
              {decoded.signature || 'HMACSHA256(\n  base64UrlEncode(header) + "." +\n  base64UrlEncode(payload),\n  your-256-bit-secret\n)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
export default JWTDebugger;

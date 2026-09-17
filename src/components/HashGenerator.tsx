import React, { useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { md5 } from '../lib/md5';

export const HashGenerator: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [hashes, setHashes] = useState({
    md5: '',
    sha1: '',
    sha256: '',
    sha384: '',
    sha512: ''
  });
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyToClipboard = (hashName: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedHash(hashName);
      setTimeout(() => setCopiedHash(null), 2000);
    });
  };

  // Compute hashes when input changes. Results from a stale input are ignored.
  useEffect(() => {
    let cancelled = false;

    const computeHashes = async () => {
      if (!inputText) {
        setHashes({ md5: '', sha1: '', sha256: '', sha384: '', sha512: '' });
        return;
      }

      const data = new TextEncoder().encode(inputText);

      const getHexHash = async (algo: string): Promise<string> => {
        try {
          const hashBuffer = await crypto.subtle.digest(algo, data);
          return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, '0')).join('');
        } catch {
          return 'Error computing hash (Web Crypto requires HTTPS or localhost)';
        }
      };

      const [sha1, sha256, sha384, sha512] = await Promise.all(
        ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map(getHexHash)
      );

      if (!cancelled) {
        setHashes({ md5: md5(inputText), sha1, sha256, sha384, sha512 });
      }
    };

    computeHashes();
    return () => {
      cancelled = true;
    };
  }, [inputText]);

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">Cryptographic Hash Generator</h2>
        <p className="tool-subtitle">
          Generate hashes locally in your browser. MD5 and SHA-1 are included for legacy checksum compatibility, not new security-sensitive uses.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Input Text Area */}
        <div className="card form-group">
          <label className="form-label" style={{ fontSize: '13px' }}>Input Text</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="textarea code-editor"
            style={{ height: '120px' }}
            placeholder="Type or paste text to generate cryptographic hashes..."
          />
        </div>

        {/* Hashes Output Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Computed Hashes</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* MD5 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <span className="form-label" style={{ color: 'var(--accent-light)', fontSize: '10px' }}>MD5</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', wordBreak: 'break-all', userSelect: 'all', paddingRight: '8px', color: 'var(--text-secondary)' }}>
                {hashes.md5 || 'Paste text above to compute MD5 checksum...'}
              </div>
              {hashes.md5 && (
                <button
                  onClick={() => copyToClipboard('md5', hashes.md5)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {copiedHash === 'md5' ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                  {copiedHash === 'md5' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {/* SHA-1 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <span className="form-label" style={{ color: 'var(--accent-light)', fontSize: '10px' }}>SHA-1</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', wordBreak: 'break-all', userSelect: 'all', paddingRight: '8px', color: 'var(--text-secondary)' }}>
                {hashes.sha1 || 'Compute SHA-1 checksum...'}
              </div>
              {hashes.sha1 && (
                <button
                  onClick={() => copyToClipboard('sha1', hashes.sha1)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {copiedHash === 'sha1' ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                  {copiedHash === 'sha1' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {/* SHA-256 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <span className="form-label" style={{ color: 'var(--accent-light)', fontSize: '10px' }}>SHA-256</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', wordBreak: 'break-all', userSelect: 'all', paddingRight: '8px', color: 'var(--text-secondary)' }}>
                {hashes.sha256 || 'Compute SHA-256 checksum...'}
              </div>
              {hashes.sha256 && (
                <button
                  onClick={() => copyToClipboard('sha256', hashes.sha256)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {copiedHash === 'sha256' ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                  {copiedHash === 'sha256' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {/* SHA-384 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <span className="form-label" style={{ color: 'var(--accent-light)', fontSize: '10px' }}>SHA-384</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', wordBreak: 'break-all', userSelect: 'all', paddingRight: '8px', color: 'var(--text-secondary)' }}>
                {hashes.sha384 || 'Compute SHA-384 checksum...'}
              </div>
              {hashes.sha384 && (
                <button
                  onClick={() => copyToClipboard('sha384', hashes.sha384)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {copiedHash === 'sha384' ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                  {copiedHash === 'sha384' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {/* SHA-512 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ width: '80px', flexShrink: 0 }}>
                <span className="form-label" style={{ color: 'var(--accent-light)', fontSize: '10px' }}>SHA-512</span>
              </div>
              <div style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '12px', wordBreak: 'break-all', userSelect: 'all', paddingRight: '8px', color: 'var(--text-secondary)' }}>
                {hashes.sha512 || 'Compute SHA-512 checksum...'}
              </div>
              {hashes.sha512 && (
                <button
                  onClick={() => copyToClipboard('sha512', hashes.sha512)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                >
                  {copiedHash === 'sha512' ? <Check size={11} style={{ color: 'var(--success)' }} /> : <Copy size={11} />}
                  {copiedHash === 'sha512' ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HashGenerator;

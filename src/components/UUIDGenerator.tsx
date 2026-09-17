import React, { useState } from 'react';
import { Copy, Check, Plus, Download } from 'lucide-react';

const createUuidV4 = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

export const UUIDGenerator: React.FC = () => {
  const [quantity, setQuantity] = useState<number>(5);
  const [uppercase, setUppercase] = useState<boolean>(false);
  const [noHyphens, setNoHyphens] = useState<boolean>(false);
  
  const generateUUID = (upper: boolean, plain: boolean): string => {
    let uuid = createUuidV4();

    if (plain) {
      uuid = uuid.replace(/-/g, '');
    }
    return upper ? uuid.toUpperCase() : uuid.toLowerCase();
  };

  const [uuids, setUuids] = useState<string[]>(() => {
    return Array.from({ length: 5 }, () => createUuidV4().toLowerCase());
  });

  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const handleGenerate = (currentQty = quantity, currentUpper = uppercase, currentNoHyphens = noHyphens) => {
    const list = Array.from({ length: currentQty }, () => generateUUID(currentUpper, currentNoHyphens));
    setUuids(list);
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    handleGenerate(newQty, uppercase, noHyphens);
  };

  const handleUppercaseChange = (newUpper: boolean) => {
    setUppercase(newUpper);
    handleGenerate(quantity, newUpper, noHyphens);
  };

  const handleNoHyphensChange = (newNoHyphens: boolean) => {
    setNoHyphens(newNoHyphens);
    handleGenerate(quantity, uppercase, newNoHyphens);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  };

  const copyAll = () => {
    if (uuids.length === 0) return;
    const text = uuids.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  const downloadTextFile = () => {
    if (uuids.length === 0) return;
    const text = uuids.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">UUID / GUID Generator</h2>
        <p className="tool-subtitle">
          Generate RFC 4122 compliant UUID v4 strings locally. Support for custom formatting and bulk outputs.
        </p>
      </div>

      <div className="grid-2">
        {/* Controls Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Generation Controls</span>

          {/* Quantity selector */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Quantity</label>
            <select
              value={quantity}
              onChange={(e) => handleQuantityChange(Number(e.target.value))}
              className="select"
            >
              <option value={1}>1 UUID</option>
              <option value={5}>5 UUIDs</option>
              <option value={10}>10 UUIDs</option>
              <option value={50}>50 UUIDs</option>
              <option value={100}>100 UUIDs</option>
              <option value={250}>250 UUIDs</option>
            </select>
          </div>

          <div style={{ height: '1px', width: '100%', backgroundColor: 'var(--border)' }} />

          {/* Formatting Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span className="form-label" style={{ fontSize: '11px' }}>Format Settings</span>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={uppercase}
                onChange={(e) => handleUppercaseChange(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              Capitalize Letters (Uppercase)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={noHyphens}
                onChange={(e) => handleNoHyphensChange(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              Disable Hyphens (Plain Hex)
            </label>
          </div>

          <button
            onClick={() => handleGenerate()}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 'auto' }}
          >
            <Plus size={14} />
            Generate New Set
          </button>
        </div>

        {/* Output List Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-header-row" style={{ marginBottom: 0 }}>
            <span className="card-title-text" style={{ fontSize: '13px' }}>Generated Results</span>
            {uuids.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={copyAll}
                  className="copy-link"
                  style={{ fontWeight: 600 }}
                >
                  {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                  {copiedAll ? 'Copied All!' : 'Copy All'}
                </button>
                <span style={{ color: 'var(--border)' }}>|</span>
                <button
                  onClick={downloadTextFile}
                  className="copy-link"
                  style={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                >
                  <Download size={12} />
                  Download .txt
                </button>
              </div>
            )}
          </div>

          <div className="uuid-list" style={{ flex: 1, minHeight: '260px' }}>
            {uuids.length > 0 ? (
              uuids.map((uuid, idx) => (
                <div 
                  key={idx} 
                  className="uuid-row"
                >
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, userSelect: 'none', marginRight: '10px', width: '24px' }}>{idx + 1}.</span>
                  <span style={{ flex: 1, userSelect: 'all', color: 'var(--text)' }}>{uuid}</span>
                  <button
                    onClick={() => copyToClipboard(uuid, idx)}
                    className="uuid-copy-btn"
                    title="Copy UUID"
                  >
                    {copiedIndex === idx ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                  </button>
                </div>
              ))
            ) : (
              <span className="placeholder-text" style={{ display: 'block', padding: '16px' }}>No UUIDs generated yet...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default UUIDGenerator;

import React, { useState } from 'react';
import { Copy, Check, Trash2, ArrowLeftRight } from 'lucide-react';

export const HTMLEntityTool: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [isDecode, setIsDecode] = useState<boolean>(false);
  const [encodeFull, setEncodeFull] = useState<boolean>(false); // Basic vs Full Unicode
  const [copied, setCopied] = useState<boolean>(false);

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Safe HTML encoding
  const htmlEncode = (str: string, full: boolean): string => {
    if (full) {
      // Encode HTML-special and every non-ASCII code point (including emoji) as numeric entities.
      return str.replace(/[<>&"']|[^\x20-\x7E\t\n\r]/gu, (char) => `&#${char.codePointAt(0)};`);
    }

    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, (char) => entities[char] || char);
  };

  // Decode entities only. A <textarea> in an inert document parses its content as
  // RCDATA, so tags in the input are kept as text and nothing is executed.
  const htmlDecode = (str: string): string => {
    const textarea = document.implementation.createHTMLDocument('').createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };

  const handleProcess = (value: string, decodeMode: boolean, fullMode: boolean = encodeFull) => {
    setInputText(value);
    if (!value) {
      setOutputText('');
      return;
    }

    if (decodeMode) {
      setOutputText(htmlDecode(value));
    } else {
      setOutputText(htmlEncode(value, fullMode));
    }
  };

  const handleModeToggle = () => {
    const nextMode = !isDecode;
    setIsDecode(nextMode);
    setInputText(outputText);
    handleProcess(outputText, nextMode);
  };

  const handleFullModeToggle = (checked: boolean) => {
    setEncodeFull(checked);
    handleProcess(inputText, isDecode, checked);
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">HTML Entity Encoder / Decoder</h2>
        <p className="tool-subtitle">
          Encode HTML special characters to numeric/named entities to prevent rendering issues, or decode entities back to plain text.
        </p>
      </div>

      <div className="card">
        {/* Header Controls */}
        <div className="card-header-row">
          <span className="card-title-text">HTML Entity Converter</span>
          <div className="toolbar-group">
            <button
              onClick={handleModeToggle}
              className="btn btn-secondary"
              style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'transparent' }}
            >
              <ArrowLeftRight size={12} />
              {isDecode ? 'Switch to Encode' : 'Switch to Decode'}
            </button>
            <button onClick={handleClear} className="btn btn-danger" style={{ padding: '8px' }} title="Clear Inputs">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Configurations (Only visible when encoding) */}
        {!isDecode && (
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)' }}>
              <input
                type="checkbox"
                checked={encodeFull}
                onChange={(e) => handleFullModeToggle(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Encode all non-ASCII characters (e.g. accents, symbols)
            </label>
          </div>
        )}

        {/* Inputs & Outputs */}
        <div className="grid-2">
          {/* Input Panel */}
          <div className="form-group">
            <label className="form-label">{isDecode ? 'Encoded Entities Input' : 'Raw Text Input'}</label>
            <textarea
              value={inputText}
              onChange={(e) => handleProcess(e.target.value, isDecode)}
              className="textarea code-editor"
              style={{ height: '220px', resize: 'none' }}
              placeholder={isDecode ? 'Enter encoded entities (e.g., &lt;div&gt;)...' : 'Enter plain text (e.g., <div>)...'}
            />
          </div>

          {/* Output Panel */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label className="form-label">{isDecode ? 'Decoded Text Output' : 'Encoded Entities Output'}</label>
              {outputText && (
                <button onClick={copyToClipboard} className="copy-link">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              )}
            </div>
            <textarea
              readOnly
              value={outputText}
              className="textarea code-editor"
              style={{ height: '220px', resize: 'none' }}
              placeholder={isDecode ? 'Decoded plain text will render here...' : 'Encoded entities will render here...'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default HTMLEntityTool;

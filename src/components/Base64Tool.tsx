import React, { useState } from 'react';
import { Upload, Copy, Check, Trash2, ArrowLeftRight, FileCode } from 'lucide-react';

export const Base64Tool: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [isDecode, setIsDecode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // File Encoder state
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [dataUrlCopied, setDataUrlCopied] = useState<boolean>(false);
  const [payloadCopied, setPayloadCopied] = useState<boolean>(false);
  const [fileType, setFileType] = useState<string>('');

  const copyToClipboard = (text: string, setCopiedFn: (val: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedFn(true);
      setTimeout(() => setCopiedFn(false), 2000);
    });
  };

  // Safe UTF-8 Base64 Encoding
  const utf8Btoa = (str: string): string => {
    try {
      const bytes = new TextEncoder().encode(str);
      const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
      return btoa(binString);
    } catch (e) {
      throw new Error('Failed to encode: ' + (e as Error).message, { cause: e });
    }
  };

  // Safe UTF-8 Base64 Decoding
  const utf8Atob = (str: string): string => {
    try {
      let normalized = str.replace(/-/g, '+').replace(/_/g, '/');
      while (normalized.length % 4) {
        normalized += '=';
      }
      const binString = atob(normalized);
      const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch (e) {
      throw new Error('Invalid Base64 string for decoding', { cause: e });
    }
  };

  const handleProcess = (value: string, decodeMode: boolean) => {
    setInputText(value);
    setError(null);
    if (!value) {
      setOutputText('');
      return;
    }

    try {
      if (decodeMode) {
        setOutputText(utf8Atob(value));
      } else {
        setOutputText(utf8Btoa(value));
      }
    } catch (e) {
      setOutputText('');
      setError((e as Error).message);
    }
  };

  const handleModeToggle = () => {
    const nextMode = !isDecode;
    setIsDecode(nextMode);
    setInputText(outputText);
    handleProcess(outputText, nextMode);
  };

  const handleClear = () => {
    setInputText('');
    setOutputText('');
    setError(null);
  };

  // File Drag-and-Drop handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    
    // Format size
    const bytes = file.size;
    if (bytes < 1024) setFileSize(`${bytes} B`);
    else if (bytes < 1024 * 1024) setFileSize(`${(bytes / 1024).toFixed(2)} KB`);
    else setFileSize(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        setFileBase64(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFileBase64('');
    setFileName('');
    setFileSize('');
    setFileType('');
  };

  // Extract raw base64 from Data URL
  const getRawFileBase64 = () => {
    if (!fileBase64) return '';
    const parts = fileBase64.split(',');
    return parts.length > 1 ? parts[1] : parts[0];
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">Base64 Encoder / Decoder</h2>
        <p className="tool-subtitle">
          Encode or decode text with full UTF-8 Unicode support, or convert files directly to Base64 data URIs.
        </p>
      </div>

      <div className="grid-2">
        {/* TEXT BASE64 SECTION */}
        <div className="card">
          <div className="card-header-row">
            <span className="card-title-text">Text Converter</span>
            <div className="toolbar-group">
              <button
                onClick={handleModeToggle}
                className="btn btn-secondary"
                style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-light)', borderColor: 'transparent' }}
              >
                <ArrowLeftRight size={12} />
                {isDecode ? 'Switch to Encode' : 'Switch to Decode'}
              </button>
              <button
                onClick={handleClear}
                className="btn btn-danger"
                style={{ padding: '8px' }}
                title="Clear content"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">
              {isDecode ? 'Base64 Input' : 'Plain Text Input'}
            </label>
            <textarea
              value={inputText}
              onChange={(e) => handleProcess(e.target.value, isDecode)}
              className="textarea code-editor"
              style={{ height: '120px' }}
              placeholder={isDecode ? 'Enter Base64 here...' : 'Enter text here...'}
            />
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', fontSize: '12px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', border: '1px solid hsla(346, 84%, 50%, 0.2)', borderRadius: '6px', marginBottom: '16px' }}>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
              <label className="form-label">
                {isDecode ? 'Decoded Plain Text Output' : 'Encoded Base64 Output'}
              </label>
              {outputText && (
                <button
                  onClick={() => copyToClipboard(outputText, setCopied)}
                  className="copy-link"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
            <textarea
              readOnly
              value={outputText}
              className="textarea code-editor"
              style={{ height: '120px' }}
              placeholder={isDecode ? 'Decoded text will show here...' : 'Encoded Base64 will show here...'}
            />
          </div>
        </div>

        {/* FILE BASE64 SECTION */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-row">
            <span className="card-title-text">File to Base64 Encoder</span>
          </div>

          {!fileBase64 ? (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="dropzone"
              style={{ flex: 1 }}
              onClick={() => document.getElementById('file-upload-input')?.click()}
            >
              <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Drag and drop file here</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>or click to browse local files</p>
              <input
                id="file-upload-input"
                type="file"
                className="hidden"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              {/* File Info */}
              <div className="file-info-bar">
                <div className="file-details">
                  <FileCode size={20} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                  <div style={{ overflow: 'hidden' }}>
                    <p className="file-details-title">{fileName}</p>
                    <p className="file-details-meta">
                      {fileType} • {fileSize}
                    </p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="btn btn-danger"
                  style={{ padding: '6px' }}
                  title="Remove file"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Output Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span className="form-label" style={{ fontSize: '9px' }}>Data URL Scheme (for HTML/CSS)</span>
                    <button
                      onClick={() => copyToClipboard(fileBase64, setDataUrlCopied)}
                      className="copy-link"
                      style={{ fontSize: '11px' }}
                    >
                      {dataUrlCopied ? <Check size={11} /> : <Copy size={11} />}
                      Copy Data URL
                    </button>
                  </div>
                  <input
                    readOnly
                    type="text"
                    value={fileBase64.substring(0, 100) + '...'}
                    className="input-text"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span className="form-label" style={{ fontSize: '9px' }}>Raw Base64 Payload</span>
                    <button
                      onClick={() => copyToClipboard(getRawFileBase64(), setPayloadCopied)}
                      className="copy-link"
                      style={{ fontSize: '11px' }}
                    >
                      {payloadCopied ? <Check size={11} /> : <Copy size={11} />}
                      Copy Payload
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={getRawFileBase64().substring(0, 200) + '...'}
                    className="textarea"
                    style={{ height: '70px', fontFamily: 'var(--font-mono)', fontSize: '11px', resize: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Base64Tool;

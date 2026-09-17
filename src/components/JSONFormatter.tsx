import React, { useState } from 'react';
import { Copy, Check, Trash2, Code2, Sparkles, AlertCircle } from 'lucide-react';
import yaml from 'js-yaml';
import CodeEditor from './CodeEditor';

export const JSONFormatter: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [outputHtml, setOutputHtml] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [indent, setIndent] = useState<number | string>(2);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Safe client-side JSON syntax highlighter using regex (used for output rendering)
  const syntaxHighlightJson = (jsonStr: string): string => {
    if (!jsonStr) return '';
    
    // Escape HTML special characters
    const escaped = jsonStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Match keys, strings, numbers, booleans, nulls
    return escaped.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = 'json-value-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-value-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-value-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-value-null';
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
  };

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadSample = () => {
    const sample = {
      name: "DevTools Suite",
      version: "1.0.0",
      description: "Secure, developer utilities operating 100% client-side",
      offlineReady: true,
      features: [
        "Swagger OpenAPI Editor",
        "JSON/YAML Formatter",
        "Base64 File Encoder",
        "JWT Expiration Debugger",
        "Epoch Converter"
      ],
      systemSpecs: {
        architecture: "browser-native",
        supportedBrowsers: ["Chrome", "Firefox", "Safari", "Edge"],
        encryption: "WebCrypto API"
      }
    };
    const sampleStr = JSON.stringify(sample, null, 2);
    setInput(sampleStr);
    handleFormat(sampleStr);
  };

  const handleFormat = (val: string = input) => {
    setError(null);
    if (!val.trim()) {
      setOutputHtml('');
      setOutputText('');
      return;
    }

    try {
      // Parse to ensure it is valid JSON
      const parsed = JSON.parse(val);
      const indentVal = indent === 'tab' ? '\t' : Number(indent);
      const formatted = JSON.stringify(parsed, null, indentVal);
      
      setOutputText(formatted);
      setOutputHtml(syntaxHighlightJson(formatted));
    } catch (e) {
      setOutputHtml('');
      setOutputText('');
      setError(`Invalid JSON: ${(e as Error).message}`);
    }
  };

  const handleMinify = () => {
    setError(null);
    if (!input.trim()) return;

    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      
      setOutputText(minified);
      setOutputHtml(syntaxHighlightJson(minified));
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
    }
  };

  const handleConvertToYAML = () => {
    setError(null);
    if (!input.trim()) return;

    try {
      const parsed = JSON.parse(input);
      const yamlStr = yaml.dump(parsed, { indent: 2, skipInvalid: true });
      
      setOutputText(yamlStr);
      // Renders text directly inside pre-tag for YAML
      setOutputHtml(yamlStr);
    } catch (e) {
      setError(`Invalid JSON to convert to YAML: ${(e as Error).message}`);
    }
  };

  const handleConvertFromYAML = () => {
    setError(null);
    if (!input.trim()) return;

    try {
      const parsed = yaml.load(input);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('YAML did not parse as a valid JSON object/array.');
      }
      const indentVal = indent === 'tab' ? '\t' : Number(indent);
      const formatted = JSON.stringify(parsed, null, indentVal);
      
      setOutputText(formatted);
      setOutputHtml(syntaxHighlightJson(formatted));
    } catch (e) {
      setError(`Invalid YAML to convert to JSON: ${(e as Error).message}`);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutputHtml('');
    setOutputText('');
    setError(null);
  };

  // Helper to detect if input looks like JSON or YAML
  const detectLanguage = (str: string): 'json' | 'yaml' => {
    const trimmed = str.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    return 'yaml';
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div className="tool-header-row">
        <div>
          <h2 className="tool-title">JSON / YAML Formatter & Validator</h2>
          <p className="tool-subtitle">
            Format, minify, validate, and convert JSON and YAML files fully client-side.
          </p>
        </div>
        <button
          onClick={loadSample}
          className="btn btn-secondary"
        >
          <Sparkles size={13} style={{ color: 'var(--accent-light)' }} />
          Load Sample JSON
        </button>
      </div>

      {/* Main Panel Controls */}
      <div className="row-toolbar">
        <div className="toolbar-group">
          {/* Format Buttons */}
          <button
            onClick={() => handleFormat()}
            className="btn btn-primary"
          >
            <Code2 size={13} />
            Format
          </button>
          <button
            onClick={handleMinify}
            className="btn btn-secondary"
          >
            Minify
          </button>
          
          <div className="divider-y" />

          {/* Conversion Toggles */}
          <button
            onClick={handleConvertToYAML}
            className="btn btn-secondary"
          >
            JSON ➔ YAML
          </button>
          <button
            onClick={handleConvertFromYAML}
            className="btn btn-secondary"
          >
            YAML ➔ JSON
          </button>
        </div>

        {/* Indent Selectors */}
        <div className="toolbar-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Tab Size:</span>
            <select
              value={indent}
              onChange={(e) => {
                const nextVal = e.target.value === 'tab' ? 'tab' : Number(e.target.value);
                setIndent(nextVal);
                // Trigger auto-format if input is present and valid
                if (input.trim()) {
                  try {
                    const parsed = JSON.parse(input);
                    const formatted = JSON.stringify(parsed, null, nextVal === 'tab' ? '\t' : nextVal);
                    setOutputText(formatted);
                    setOutputHtml(syntaxHighlightJson(formatted));
                  } catch {
                    // Suppress parsing error during typing/indent change
                  }
                }
              }}
              className="select"
              style={{ width: 'auto' }}
            >
              <option value={2}>2 Spaces</option>
              <option value={4}>4 Spaces</option>
              <option value="tab">Tabs</option>
            </select>
          </div>
          <button
            onClick={handleClear}
            className="btn btn-danger"
            style={{ padding: '8px' }}
            title="Clear Inputs"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Editor Space */}
      <div className="grid-2">
        {/* Input Block */}
        <div className="form-group">
          <label className="form-label">Input Area (JSON or YAML)</label>
          <CodeEditor
            value={input}
            onChange={setInput}
            language={detectLanguage(input)}
            height="420px"
            placeholder="Paste your JSON or YAML here..."
          />
        </div>

        {/* Output Block */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <label className="form-label">Result Output</label>
            {outputText && (
              <button
                onClick={copyToClipboard}
                className="copy-link"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>
          
          <div className="code-display-box" style={{ height: '420px', minHeight: 'auto' }}>
            {error ? (
              <div style={{ display: 'flex', gap: '8px', padding: '12px', fontSize: '12px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', border: '1px solid hsla(346, 84%, 50%, 0.2)', borderRadius: '6px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            ) : outputHtml ? (
              outputText.trim().startsWith('{') || outputText.trim().startsWith('[') ? (
                <pre 
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} 
                  dangerouslySetInnerHTML={{ __html: outputHtml }} 
                />
              ) : (
                <pre style={{ color: 'hsl(142, 70%, 60%)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{outputHtml}</pre>
              )
            ) : (
              <span className="placeholder-text">Formatted results will render here...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default JSONFormatter;

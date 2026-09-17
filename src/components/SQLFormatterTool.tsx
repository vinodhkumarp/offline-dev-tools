import React, { useState } from 'react';
import { Copy, Check, AlignLeft } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { formatSQL } from '../lib/sqlFormat';

export const SQLFormatterTool: React.FC = () => {
  const [inputSql, setInputSql] = useState<string>('');
  const [outputSql, setOutputSql] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleFormat = () => {
    setOutputSql(formatSQL(inputSql));
  };

  const copyToClipboard = () => {
    if (!outputSql) return;
    navigator.clipboard.writeText(outputSql).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const loadSample = () => {
    const sample = `select 'Main' as source,\n(select t1.code from public.tab1 t1) as code, (select t2.name from public.tab2 t2) as name\nfrom public.main;`;
    setInputSql(sample);
    setOutputSql(formatSQL(sample));
  };

  const handleClear = () => {
    setInputSql('');
    setOutputSql('');
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div className="tool-header-row">
        <div>
          <h2 className="tool-title">SQL Query Formatter</h2>
          <p className="tool-subtitle">
            Re-indent raw SQL queries client-side to make them readable. Literals, comments, and operators are preserved.
          </p>
        </div>
        <button onClick={loadSample} className="btn btn-secondary">
          Load Sample SQL
        </button>
      </div>

      {/* Toolbar */}
      <div className="row-toolbar">
        <div className="toolbar-group">
          <button onClick={handleFormat} className="btn btn-primary">
            <AlignLeft size={13} />
            Beautify SQL
          </button>
        </div>
        <div className="toolbar-group">
          <button onClick={handleClear} className="btn btn-danger" title="Clear queries">
            Clear
          </button>
        </div>
      </div>

      {/* Editor Panels */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Raw SQL Input</label>
          <CodeEditor
            value={inputSql}
            onChange={setInputSql}
            language="sql"
            height="350px"
            placeholder="Paste raw query here..."
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <label className="form-label">Formatted Result</label>
            {outputSql && (
              <button onClick={copyToClipboard} className="copy-link">
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                {isCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </div>
          <CodeEditor
            value={outputSql}
            onChange={() => {}}
            language="sql"
            height="350px"
            readOnly={true}
            placeholder="Formatted SQL will render here..."
          />
        </div>
      </div>
    </div>
  );
};
export default SQLFormatterTool;

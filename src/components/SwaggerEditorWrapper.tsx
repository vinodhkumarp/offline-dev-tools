import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, ShieldCheck } from 'lucide-react';

export const SwaggerEditorWrapper: React.FC = () => {
  const [specSize, setSpecSize] = useState<string>(() => {
    const spec = localStorage.getItem('swagger-editor-content') || '';
    const bytes = new Blob([spec]).size;
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  });
  const [iframeKey, setIframeKey] = useState<number>(0);

  // Function to calculate spec size in localStorage
  const updateSpecMetrics = () => {
    const spec = localStorage.getItem('swagger-editor-content') || '';
    const bytes = new Blob([spec]).size;
    if (bytes === 0) setSpecSize('0 B');
    else if (bytes < 1024) setSpecSize(`${bytes} B`);
    else setSpecSize(`${(bytes / 1024).toFixed(2)} KB`);
  };

  useEffect(() => {
    // Poll occasionally to update spec size metrics
    const interval = setInterval(updateSpecMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  // Export current spec to YAML file
  const handleExport = () => {
    const spec = localStorage.getItem('swagger-editor-content') || '';
    if (!spec) {
      alert('No specification content found to export!');
      return;
    }
    const blob = new Blob([spec], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openapi-spec.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Reset Swagger Editor content to default template
  const handleReset = () => {
    if (confirm('Are you sure you want to reset the editor? This will overwrite your current specification.')) {
      const defaultSpec = `openapi: 3.0.0
info:
  title: Private API Specification
  description: |
    This editor runs locally in your browser.
    Outbound requests are blocked by the editor frame's Content Security Policy.
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get users list (mock)
      responses:
        '200':
          description: Successful response
`;
      localStorage.setItem('swagger-editor-content', defaultSpec);
      setIframeKey(prev => prev + 1); // Force iframe to reload
      setTimeout(updateSpecMetrics, 500);
    }
  };

  return (
    <div className="tool-container animate-fade-in" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Control Banner */}
      <div className="row-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-icon" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-light)' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <h2 className="card-title-text" style={{ fontSize: '13px' }}>Secure OpenAPI / Swagger Editor</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Edits are saved to localStorage, and the editor frame blocks outbound connections. Size: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontWeight: 600 }}>{specSize}</span>
            </p>
          </div>
        </div>

        <div className="toolbar-group">
          <button
            onClick={handleExport}
            className="btn btn-secondary"
          >
            <Download size={13} />
            Export YAML
          </button>
          <button
            onClick={handleReset}
            className="btn btn-danger"
          >
            <RotateCcw size={13} />
            Reset Editor
          </button>
        </div>
      </div>

      {/* Editor Frame Container */}
      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        {/* IFrame embedding swagger editor dist */}
        <iframe
          key={iframeKey}
          src={`${import.meta.env.BASE_URL}swagger-editor/index.html`}
          title="Swagger Editor"
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
          sandbox="allow-scripts allow-same-origin allow-modals allow-downloads"
        />
      </div>
    </div>
  );
};
export default SwaggerEditorWrapper;

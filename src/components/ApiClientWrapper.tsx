import React, { useEffect, useRef, useState } from 'react';
import { Download, Network, RotateCcw } from 'lucide-react';

const API_CLIENT_STORAGE_KEY = 'apilab.v1';

export const ApiClientWrapper: React.FC = () => {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Keep the embedded client's light/dark theme in sync with the toolbox.
  const postTheme = () => {
    const theme = document.querySelector('.app-container')?.getAttribute('data-theme');
    if (theme === 'dark' || theme === 'light') {
      iframeRef.current?.contentWindow?.postMessage({ type: 'apilab-theme', theme }, window.location.origin);
    }
  };

  useEffect(() => {
    const el = document.querySelector('.app-container');
    if (!el) return;
    const observer = new MutationObserver(postTheme);
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Export every collection and environment saved by the API client.
  const handleExport = () => {
    let data: { collections?: unknown[]; envs?: unknown[] };
    try {
      data = JSON.parse(localStorage.getItem(API_CLIENT_STORAGE_KEY) || '{}');
    } catch {
      data = {};
    }
    const backup = { apilab: 1, collections: data.collections ?? [], envs: data.envs ?? [] };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-client-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (confirm('Delete all saved API client collections, environments, history and open tabs? This cannot be undone.')) {
      try {
        localStorage.removeItem(API_CLIENT_STORAGE_KEY);
      } catch {
        // Storage may be blocked; the reload below still gives a fresh frame.
      }
      setIframeKey(prev => prev + 1);
    }
  };

  return (
    <div className="tool-container animate-fade-in" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="row-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="brand-icon" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-light)' }}>
            <Network size={18} />
          </div>
          <div>
            <h2 className="card-title-text" style={{ fontSize: '13px' }}>API Client (Postman-style)</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Requests are sent by a small proxy on your own machine, not by this page. Start it with{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)', fontWeight: 600 }}>npm run api-proxy</span>.
            </p>
          </div>
        </div>

        <div className="toolbar-group">
          <button onClick={handleExport} className="btn btn-secondary">
            <Download size={13} />
            Export backup
          </button>
          <button onClick={handleReset} className="btn btn-danger">
            <RotateCcw size={13} />
            Reset client
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <iframe
          key={iframeKey}
          ref={iframeRef}
          onLoad={postTheme}
          src={`${import.meta.env.BASE_URL}api-lab/index.html`}
          title="API Client"
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', border: 'none', flex: 1 }}
          sandbox="allow-scripts allow-same-origin allow-modals allow-downloads"
        />
      </div>
    </div>
  );
};
export default ApiClientWrapper;

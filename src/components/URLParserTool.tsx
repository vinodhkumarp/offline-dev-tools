import React, { useState, useMemo } from 'react';
import { Copy, Check, Plus, Trash2 } from 'lucide-react';

interface QueryParam {
  key: string;
  value: string;
}

export const URLParserTool: React.FC = () => {
  const [urlInput, setUrlInput] = useState<string>('https://api.github.com/search/repositories?q=react&sort=stars&order=desc#results');

  const initialParsed = useMemo(() => {
    try {
      const parsed = new URL('https://api.github.com/search/repositories?q=react&sort=stars&order=desc#results');
      const parsedParams: QueryParam[] = [];
      parsed.searchParams.forEach((value, key) => {
        parsedParams.push({ key, value });
      });
      return {
        protocol: parsed.protocol,
        host: parsed.host,
        pathname: parsed.pathname,
        hash: parsed.hash,
        params: parsedParams,
        error: null as string | null
      };
    } catch {
      return {
        protocol: '',
        host: '',
        pathname: '',
        hash: '',
        params: [] as QueryParam[],
        error: 'Failed to parse'
      };
    }
  }, []);

  const [protocol, setProtocol] = useState<string>(initialParsed.protocol);
  const [host, setHost] = useState<string>(initialParsed.host);
  const [pathname, setPathname] = useState<string>(initialParsed.pathname);
  const [hash, setHash] = useState<string>(initialParsed.hash);
  const [params, setParams] = useState<QueryParam[]>(initialParsed.params);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(initialParsed.error);

  // Trigger parsing when input changes
  const handleParse = (urlStr: string) => {
    setUrlInput(urlStr);
    setParseError(null);
    if (!urlStr.trim()) {
      setProtocol('');
      setHost('');
      setPathname('');
      setHash('');
      setParams([]);
      return;
    }

    try {
      // Fix potential relative url missing protocol (e.g. example.com/path -> https://example.com/path)
      let targetUrl = urlStr;
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(targetUrl)) {
        targetUrl = 'https://' + targetUrl;
      }

      const parsed = new URL(targetUrl);
      setProtocol(parsed.protocol);
      setHost(parsed.host);
      setPathname(parsed.pathname);
      setHash(parsed.hash);

      const parsedParams: QueryParam[] = [];
      parsed.searchParams.forEach((value, key) => {
        parsedParams.push({ key, value });
      });
      setParams(parsedParams);
    } catch {
      setParseError('Failed to parse URL. Make sure it is a valid format (e.g., https://example.com/path).');
    }
  };

  // Re-build URL when parts are modified
  const rebuildUrl = (
    protoVal: string, 
    hostVal: string, 
    pathVal: string, 
    hashVal: string, 
    paramsList: QueryParam[]
  ): string => {
    try {
      if (!hostVal) return '';
      let urlString = `${protoVal || 'https:'}//${hostVal}${pathVal}`;
      
      const searchParams = new URLSearchParams();
      paramsList.forEach(p => {
        if (p.key.trim()) {
          searchParams.append(p.key, p.value);
        }
      });
      
      const searchStr = searchParams.toString();
      if (searchStr) {
        urlString += '?' + searchStr;
      }
      
      if (hashVal) {
        // Ensure single '#' prefix
        const hashStr = hashVal.startsWith('#') ? hashVal : '#' + hashVal;
        urlString += hashStr;
      }

      return urlString;
    } catch {
      return '';
    }
  };

  const handlePartChange = (part: 'protocol' | 'host' | 'pathname' | 'hash', val: string) => {
    let nextProto = protocol;
    let nextHost = host;
    let nextPath = pathname;
    let nextHash = hash;

    if (part === 'protocol') {
      nextProto = val.endsWith(':') ? val : val + ':';
      setProtocol(nextProto);
    }
    if (part === 'host') {
      nextHost = val;
      setHost(val);
    }
    if (part === 'pathname') {
      nextPath = val.startsWith('/') ? val : '/' + val;
      setPathname(nextPath);
    }
    if (part === 'hash') {
      nextHash = val;
      setHash(val);
    }

    const reassembled = rebuildUrl(nextProto, nextHost, nextPath, nextHash, params);
    setUrlInput(reassembled);
  };

  const handleParamChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...params];
    updated[index] = { ...updated[index], [field]: val };
    setParams(updated);
    
    const reassembled = rebuildUrl(protocol, host, pathname, hash, updated);
    setUrlInput(reassembled);
  };

  const handleAddParam = () => {
    const updated = [...params, { key: '', value: '' }];
    setParams(updated);
  };

  const handleDeleteParam = (index: number) => {
    const updated = params.filter((_, idx) => idx !== index);
    setParams(updated);
    
    const reassembled = rebuildUrl(protocol, host, pathname, hash, updated);
    setUrlInput(reassembled);
  };

  const copyUrl = () => {
    if (!urlInput) return;
    navigator.clipboard.writeText(urlInput).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };



  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">URL Parser & Builder</h2>
        <p className="tool-subtitle">
          Deconstruct URLs into editable parts, manage query strings inside a live grid, and rebuild URLs automatically.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label className="form-label">Full URL String</label>
          {urlInput && (
            <button onClick={copyUrl} className="copy-link">
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              {isCopied ? 'Copied!' : 'Copy URL'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => handleParse(e.target.value)}
            className="input-text"
            style={{ fontFamily: 'var(--font-mono)' }}
            placeholder="Paste URL here (e.g., https://example.com/search?q=test)..."
          />
        </div>
        {parseError && (
          <div style={{ padding: '10px', fontSize: '11px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', borderRadius: '6px' }}>
            {parseError}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Component Parts Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>URL Schema Component Breakdown</span>

          <div className="form-group">
            <label className="form-label">Protocol</label>
            <input
              type="text"
              value={protocol}
              onChange={(e) => handlePartChange('protocol', e.target.value)}
              className="input-text"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              placeholder="e.g. https:"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Host / Domain</label>
            <input
              type="text"
              value={host}
              onChange={(e) => handlePartChange('host', e.target.value)}
              className="input-text"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              placeholder="e.g. api.github.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pathname</label>
            <input
              type="text"
              value={pathname}
              onChange={(e) => handlePartChange('pathname', e.target.value)}
              className="input-text"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              placeholder="e.g. /search"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hash / Anchor</label>
            <input
              type="text"
              value={hash}
              onChange={(e) => handlePartChange('hash', e.target.value)}
              className="input-text"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              placeholder="e.g. #results"
            />
          </div>
        </div>

        {/* Query Builder Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-header-row" style={{ marginBottom: 0 }}>
            <span className="card-title-text" style={{ fontSize: '13px' }}>Query Parameters Builder</span>
            <button onClick={handleAddParam} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
              <Plus size={12} /> Add Param
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '310px', paddingRight: '4px' }}>
            {params.length > 0 ? (
              params.map((param, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={param.key}
                    onChange={(e) => handleParamChange(idx, 'key', e.target.value)}
                    className="input-text"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', flex: 1 }}
                    placeholder="Key"
                  />
                  <span style={{ color: 'var(--text-muted)' }}>=</span>
                  <input
                    type="text"
                    value={param.value}
                    onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                    className="input-text"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', flex: 1.5 }}
                    placeholder="Value"
                  />
                  <button
                    onClick={() => handleDeleteParam(idx)}
                    className="btn btn-danger"
                    style={{ padding: '8px', flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            ) : (
              <span className="placeholder-text" style={{ padding: '16px', display: 'block' }}>No query parameters found.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default URLParserTool;

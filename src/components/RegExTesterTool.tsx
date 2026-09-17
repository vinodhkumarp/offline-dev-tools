import React, { useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

interface MatchGroup {
  matchText: string;
  index: number;
  groups: string[];
}

const MAX_MATCHES = 1000;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const highlightMatches = (text: string, matches: MatchGroup[]) => {
  let cursor = 0;
  let highlighted = '';

  matches.forEach((match) => {
    highlighted += escapeHtml(text.slice(cursor, match.index));
    highlighted += `<span class="regex-match">${escapeHtml(match.matchText)}</span>`;
    cursor = match.index + match.matchText.length;
  });

  return highlighted + escapeHtml(text.slice(cursor));
};

export const RegExTesterTool: React.FC = () => {
  const [regexInput, setRegexInput] = useState<string>('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [testText, setTestText] = useState<string>('Please contact us at support@devtools.com or sales@enterprise.org for licenses.');
  const [flags, setFlags] = useState({
    g: true,
    i: true,
    m: false,
    s: false
  });

  const getFlagsString = React.useCallback(() => {
    let str = '';
    if (flags.g) str += 'g';
    if (flags.i) str += 'i';
    if (flags.m) str += 'm';
    if (flags.s) str += 's';
    return str;
  }, [flags]);

  const handleFlagToggle = (flag: 'g' | 'i' | 'm' | 's') => {
    setFlags(prev => ({ ...prev, [flag]: !prev[flag] }));
  };

  const regexResult = useMemo(() => {
    const escapedText = escapeHtml(testText);

    if (!regexInput.trim()) {
      return {
        highlightedHtml: escapedText,
        matches: [] as MatchGroup[],
        error: null as string | null
      };
    }

    try {
      const activeFlags = getFlagsString();
      const rx = new RegExp(regexInput, activeFlags);

      const foundMatches: MatchGroup[] = [];
      const toMatchGroup = (match: RegExpExecArray): MatchGroup => ({
        matchText: match[0],
        index: match.index,
        groups: match.slice(1).map((group) => group ?? '(not captured)')
      });

      let truncated = false;
      if (activeFlags.includes('g')) {
        let match: RegExpExecArray | null;
        while ((match = rx.exec(testText)) !== null) {
          if (foundMatches.length >= MAX_MATCHES) {
            truncated = true;
            break;
          }
          foundMatches.push(toMatchGroup(match));
          // Zero-length matches (e.g. ^, \b, a*) do not advance lastIndex on their own.
          if (match[0] === '') {
            rx.lastIndex++;
          }
        }
      } else {
        const match = rx.exec(testText);
        if (match) foundMatches.push(toMatchGroup(match));
      }

      return {
        highlightedHtml: highlightMatches(testText, foundMatches),
        matches: foundMatches,
        error: truncated ? `Showing the first ${MAX_MATCHES} matches only.` : null
      };
    } catch (e) {
      return {
        highlightedHtml: escapedText,
        matches: [],
        error: `Regex Error: ${(e as Error).message}`
      };
    }
  }, [regexInput, testText, getFlagsString]);

  const { highlightedHtml, matches, error } = regexResult;

  const loadSample = () => {
    setRegexInput('order-(\\d{3,5})');
    setTestText('Processing order-1049, order-209 and shipping invoice order-58931.');
    setFlags({ g: true, i: true, m: false, s: false });
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div className="tool-header-row">
        <div>
          <h2 className="tool-title">Regex Tester & Debugger</h2>
          <p className="tool-subtitle">
            Validate and test regular expressions client-side. Highlight matching terms and analyze capture groups in real time.
          </p>
        </div>
        <button onClick={loadSample} className="btn btn-secondary">
          Load Sample Regex
        </button>
      </div>

      <div className="grid-2">
        {/* Left Side: Inputs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Regex Configuration</span>

          {/* Pattern input */}
          <div className="form-group">
            <label className="form-label">Regex Pattern</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-muted)' }}>/</span>
              <input
                type="text"
                value={regexInput}
                onChange={(e) => setRegexInput(e.target.value)}
                className="input-text"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', flex: 1 }}
                placeholder="Enter regex pattern (e.g. [a-z]+)"
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-muted)' }}>/</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{getFlagsString()}</span>
            </div>
          </div>

          {/* Flags selections */}
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '10px' }}>Regex Flags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={flags.g} onChange={() => handleFlagToggle('g')} style={{ accentColor: 'var(--accent)' }} /> Global (g)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={flags.i} onChange={() => handleFlagToggle('i')} style={{ accentColor: 'var(--accent)' }} /> Case-insensitive (i)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={flags.m} onChange={() => handleFlagToggle('m')} style={{ accentColor: 'var(--accent)' }} /> Multiline (m)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: 'var(--text)' }}>
                <input type="checkbox" checked={flags.s} onChange={() => handleFlagToggle('s')} style={{ accentColor: 'var(--accent)' }} /> Dotall (s)
              </label>
            </div>
          </div>

          {/* Test Text input */}
          <div className="form-group">
            <label className="form-label">Test Text</label>
            <textarea
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="textarea"
              style={{ height: '140px', fontSize: '12px' }}
              placeholder="Enter text to match against the regex pattern..."
            />
          </div>
        </div>

        {/* Right Side: Output Details */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Matches & Results</span>

          {error && (
            <div style={{ display: 'flex', gap: '8px', padding: '12px', fontSize: '12px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', border: '1px solid hsla(346, 84%, 50%, 0.2)', borderRadius: '6px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{error}</span>
            </div>
          )}

          {/* Visual Highlight Output */}
          <div className="form-group">
            <label className="form-label">Highlighted Text matches</label>
            <div 
              className="code-display-box" 
              style={{ height: '120px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </div>

          {/* Captured details list */}
          <div className="form-group">
            <label className="form-label">Matches List ({matches.length})</label>
            <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', backgroundColor: 'var(--bg-input)' }}>
              {matches.length > 0 ? (
                matches.map((match, idx) => (
                  <div key={idx} style={{ padding: '6px 8px', borderBottom: idx < matches.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>Match {idx + 1}: "{match.matchText}"</span>
                      <span style={{ color: 'var(--text-muted)' }}>Index: {match.index}</span>
                    </div>
                    {match.groups.length > 0 && (
                      <div style={{ marginTop: '4px', paddingLeft: '8px', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                        {match.groups.map((group, gIdx) => (
                          <div key={gIdx}>Group {gIdx + 1}: "{group}"</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <span className="placeholder-text" style={{ padding: '8px', display: 'block' }}>No matches found.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RegExTesterTool;

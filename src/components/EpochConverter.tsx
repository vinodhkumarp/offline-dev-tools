import React, { useState, useEffect } from 'react';
import { Clock, Copy, Check, Info } from 'lucide-react';

// <input type="datetime-local"> expects local time, not UTC (toISOString).
const toLocalDateTimeInput = (date: Date): string => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().substring(0, 16);
};

export const EpochConverter: React.FC = () => {
  // Live ticking clock state
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [copiedClock, setCopiedClock] = useState<string | null>(null);

  // Conversion states
  const [epochInput, setEpochInput] = useState<string>(() => Math.floor(Date.now() / 1000).toString());
  const [epochResults, setEpochResults] = useState(() => {
    const initialSec = Math.floor(Date.now() / 1000);
    const date = new Date(initialSec * 1000);
    return {
      utc: date.toUTCString(),
      local: date.toLocaleString(),
      iso: date.toISOString(),
      relative: '0s ago'
    };
  });

  const [dateInput, setDateInput] = useState<string>(() => toLocalDateTimeInput(new Date()));
  // Seed from the same minute-precision value shown in the date picker.
  const [computedEpochMs, setComputedEpochMs] = useState<string>(() => new Date(toLocalDateTimeInput(new Date())).getTime().toString());
  const [computedEpochSec, setComputedEpochSec] = useState<string>(() => Math.floor(Number(computedEpochMs) / 1000).toString());

  const [copiedResult, setCopiedResult] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedClock(key);
      setCopiedResult(key);
      setTimeout(() => {
        setCopiedClock(null);
        setCopiedResult(null);
      }, 1500);
    });
  };

  // Live ticking update
  useEffect(() => {
    const timer = setInterval(() => {
      const ms = Date.now();
      setNowMs(ms);
      setNowSec(Math.floor(ms / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Epoch to Date
  const handleEpochConvert = (val: string = epochInput) => {
    setEpochInput(val);
    if (!val) {
      setEpochResults({ utc: '', local: '', iso: '', relative: '' });
      return;
    }

    try {
      const num = Number(val);
      if (isNaN(num)) {
        throw new Error('Invalid number');
      }

      // Check if it's seconds or milliseconds (standard guess: length >= 12 is milliseconds)
      const isMs = val.replace(/^-/, '').length >= 12;
      const date = new Date(isMs ? num : num * 1000);

      if (isNaN(date.getTime())) {
        throw new Error('Invalid Date range');
      }

      // Calculate relative time
      const diffMs = date.getTime() - Date.now();
      const diffSec = Math.floor(diffMs / 1000);
      let relative = '';
      if (Math.abs(diffSec) < 60) {
        relative = diffSec >= 0 ? `in ${diffSec}s` : `${Math.abs(diffSec)}s ago`;
      } else {
        const diffMins = Math.floor(diffSec / 60);
        if (Math.abs(diffMins) < 60) {
          relative = diffMins >= 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
        } else {
          const diffHours = Math.floor(diffMins / 60);
          if (Math.abs(diffHours) < 24) {
            relative = diffHours >= 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
          } else {
            const diffDays = Math.floor(diffHours / 24);
            relative = diffDays >= 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
          }
        }
      }

      setEpochResults({
        utc: date.toUTCString(),
        local: date.toLocaleString(),
        iso: date.toISOString(),
        relative
      });
    } catch {
      setEpochResults({
        utc: 'Invalid timestamp',
        local: 'Invalid timestamp',
        iso: 'Invalid timestamp',
        relative: 'Invalid timestamp'
      });
    }
  };

  // Convert human Date string to epoch
  const handleDateConvert = (val: string = dateInput) => {
    setDateInput(val);
    if (!val) return;

    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error();
      }
      const ms = date.getTime();
      setComputedEpochMs(ms.toString());
      setComputedEpochSec(Math.floor(ms / 1000).toString());
    } catch {
      setComputedEpochSec('Invalid date');
      setComputedEpochMs('Invalid date');
    }
  };



  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">Epoch Timestamp Converter</h2>
        <p className="tool-subtitle">
          Convert Unix epoch timestamps to human-readable dates (and vice versa) instantly in the browser.
        </p>
      </div>

      {/* Live Clock Card */}
      <div className="card grid-2" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', fontWeight: 600, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Clock size={12} /> Live Unix Epoch Time
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '28px', fontWeight: 700, color: 'var(--text)', marginTop: '4px', userSelect: 'all', display: 'block' }}>
            {nowSec}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Milliseconds: {nowMs}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignSelf: 'center', justifyContent: 'flex-start' }}>
          <button
            onClick={() => copyToClipboard('clock-sec', nowSec.toString())}
            className="btn btn-secondary"
            style={{ padding: '8px 14px' }}
          >
            {copiedClock === 'clock-sec' ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
            Copy Seconds
          </button>
          <button
            onClick={() => copyToClipboard('clock-ms', nowMs.toString())}
            className="btn btn-secondary"
            style={{ padding: '8px 14px' }}
          >
            {copiedClock === 'clock-ms' ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
            Copy Milliseconds
          </button>
        </div>
      </div>

      {/* Converter Interface */}
      <div className="grid-2">
        
        {/* Epoch to Date */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Epoch Timestamp to Human Date</span>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Unix Timestamp (Seconds or Milliseconds)</label>
            <input
              type="text"
              value={epochInput}
              onChange={(e) => handleEpochConvert(e.target.value)}
              className="input-text"
              style={{ fontFamily: 'var(--font-mono)' }}
              placeholder="e.g. 1779973200"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {/* UTC Result */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="form-label" style={{ fontSize: '9px' }}>UTC Time</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{epochResults.utc}</span>
              </div>
              <button
                onClick={() => copyToClipboard('utc', epochResults.utc)}
                className="copy-link"
                style={{ padding: '4px' }}
              >
                {copiedResult === 'utc' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Local Result */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="form-label" style={{ fontSize: '9px' }}>Local Time</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{epochResults.local}</span>
              </div>
              <button
                onClick={() => copyToClipboard('local', epochResults.local)}
                className="copy-link"
                style={{ padding: '4px' }}
              >
                {copiedResult === 'local' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="form-label" style={{ fontSize: '9px' }}>ISO 8601</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{epochResults.iso}</span>
              </div>
              <button
                onClick={() => copyToClipboard('iso', epochResults.iso)}
                className="copy-link"
                style={{ padding: '4px' }}
              >
                {copiedResult === 'iso' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Relative Result */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <span className="form-label" style={{ fontSize: '9px' }}>Relative</span>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-light)', marginTop: '2px', fontWeight: 600 }}>{epochResults.relative}</p>
            </div>
          </div>
        </div>

        {/* Date to Epoch */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Human Date to Epoch Timestamp</span>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Select Date / Time</label>
            <input
              type="datetime-local"
              value={dateInput}
              onChange={(e) => handleDateConvert(e.target.value)}
              className="input-text"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            {/* Epoch Seconds Result */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="form-label" style={{ fontSize: '9px' }}>Epoch Seconds</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{computedEpochSec}</span>
              </div>
              <button
                onClick={() => copyToClipboard('comp-sec', computedEpochSec)}
                className="copy-link"
                style={{ padding: '4px' }}
              >
                {copiedResult === 'comp-sec' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Epoch Milliseconds Result */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="form-label" style={{ fontSize: '9px' }}>Epoch Milliseconds</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text)', marginTop: '2px' }}>{computedEpochMs}</span>
              </div>
              <button
                onClick={() => copyToClipboard('comp-ms', computedEpochMs)}
                className="copy-link"
                style={{ padding: '4px' }}
              >
                {copiedResult === 'comp-ms' ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
              </button>
            </div>

            {/* Explainer note */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.12)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <Info size={16} style={{ color: 'var(--accent-light)', flexShrink: 0, marginTop: '1px' }} />
              <span>
                JavaScript uses milliseconds internally, whereas many server systems (like Unix commands, Python, or Go) reference timestamps in standard epoch seconds.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default EpochConverter;

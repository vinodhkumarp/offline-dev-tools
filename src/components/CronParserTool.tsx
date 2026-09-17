import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { describeCron, type CronExplanation } from '../lib/cron';

const DEFAULT_EXPRESSION = '*/15 9-17 * * 1-5';
const EMPTY: CronExplanation = { minute: '', hour: '', dayOfMonth: '', month: '', dayOfWeek: '', summary: '', notes: [] };

export const CronParserTool: React.FC = () => {
  const [cronInput, setCronInput] = useState<string>(DEFAULT_EXPRESSION);
  const [explanation, setExplanation] = useState<CronExplanation>(() => describeCron(DEFAULT_EXPRESSION));
  const [error, setError] = useState<string | null>(null);

  const handleParse = (expression: string) => {
    setCronInput(expression);
    setError(null);

    if (!expression.trim()) {
      setExplanation(EMPTY);
      return;
    }

    try {
      setExplanation(describeCron(expression));
    } catch (e) {
      setExplanation(EMPTY);
      setError(`Invalid cron expression: ${(e as Error).message}`);
    }
  };

  const loadPreset = (preset: string) => {
    handleParse(preset);
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="tool-title">Cron Expression Parser</h2>
        <p className="tool-subtitle">
          Validate standard 5-field crontab expressions and translate them into plain English client-side.
        </p>
      </div>

      {/* Preset selector bar */}
      <div className="row-toolbar">
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Common Presets:</span>
        <div className="toolbar-group">
          <button onClick={() => loadPreset('*/5 * * * *')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
            Every 5 mins
          </button>
          <button onClick={() => loadPreset('0 0 * * *')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
            Daily at midnight
          </button>
          <button onClick={() => loadPreset('0 9 * * 1-5')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
            Weekdays at 9AM
          </button>
          <button onClick={() => loadPreset('0 0 1 * *')} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '11px' }}>
            Monthly 1st
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Input Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Cron Expression Input</span>
          <div className="form-group">
            <label className="form-label">5-Field Crontab</label>
            <input
              type="text"
              value={cronInput}
              onChange={(e) => handleParse(e.target.value)}
              className="input-text"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.5px' }}
              placeholder="e.g. 0 * * * *"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Cron Order Format:</span>
              <span>1. Minute (0-59)</span>
              <span>2. Hour (0-23)</span>
              <span>3. Day of Month (1-31)</span>
              <span>4. Month (1-12)</span>
              <span>5. Day of Week (0-7 or SUN-SAT; 0 and 7 are Sunday)</span>
              <span>Month also accepts JAN-DEC. Macros such as @daily and @hourly are supported.</span>
            </div>
          </div>
        </div>

        {/* Translation Results */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="card-title-text" style={{ fontSize: '13px' }}>Human Readable Translation</span>
          
          {error ? (
            <div style={{ padding: '12px', fontSize: '12px', color: 'var(--danger)', backgroundColor: 'var(--danger-glow)', border: '1px solid hsla(346, 84%, 50%, 0.2)', borderRadius: '6px' }}>
              {error}
            </div>
          ) : explanation.summary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Summary Sentence */}
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: 'var(--accent-glow)', border: '1px solid var(--accent-glow-strong)', color: 'var(--text)', fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>
                {explanation.summary}
              </div>

              {explanation.notes.map((note) => (
                <div key={note} style={{ display: 'flex', gap: '8px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <Info size={14} style={{ color: 'var(--warning, var(--accent))', flexShrink: 0, marginTop: '1px' }} />
                  <span>{note}</span>
                </div>
              ))}

              {/* Individual Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Minutes:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{explanation.minute}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Hours:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{explanation.hour}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Day of Month:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{explanation.dayOfMonth}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Month:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{explanation.month}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Day of Week:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{explanation.dayOfWeek}</span>
                </div>
              </div>
            </div>
          ) : (
            <span className="placeholder-text">Please check cron inputs above...</span>
          )}
        </div>
      </div>
    </div>
  );
};
export default CronParserTool;

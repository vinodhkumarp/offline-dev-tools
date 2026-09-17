import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Info } from 'lucide-react';
import { clearAppStorage } from '../storage';

interface TerminalLine {
  type: 'cmd' | 'info' | 'success' | 'warn';
  text: string;
}

export const TerminalSandboxTool: React.FC = () => {
  const [logs, setLogs] = useState<TerminalLine[]>([
    { type: 'cmd', text: 'devtools diagnostics' },
    { type: 'success', text: '✔ Browser-local diagnostic console ready.' },
    { type: 'info', text: '▶ Commands inspect local metadata or run clearly labelled simulations. Type "help" for a list.' },
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [cmdInput, setCmdInput] = useState('');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (text: string, type: 'cmd' | 'info' | 'success' | 'warn' = 'info', delay = 0) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setLogs(prev => [...prev, { type, text }]);
        resolve();
      }, delay);
    });
  };

  const getContentSecurityPolicy = () =>
    document
      .querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]')
      ?.content.trim() || '';

  const executeCommand = async (commandLine: string) => {
    if (isScanning) return;
    setIsScanning(true);

    const trimmed = commandLine.trim();
    // Normalize command matching
    const normalized = trimmed.toLowerCase().replace(/^(devvault|devtools)\s+/, '');

    if (normalized === 'help') {
      await addLog('DevTools CLI commands list:', 'info', 100);
      await addLog('  devtools scan           - Inspects local sandbox configuration', 'info', 50);
      await addLog('  devtools show-policy    - Displays the document Content Security Policy', 'info', 50);
      await addLog('  devtools inspect-origin  - Displays active client sandbox metadata', 'info', 50);
      await addLog('  devtools test-leak      - Explains a simulated third-party request', 'info', 50);
      await addLog('  devtools wipe-cache     - Deletes this app\'s local storage entries', 'info', 50);
      await addLog('  clear                   - Clears terminal output logs', 'info', 50);
    } else if (normalized === 'scan' || normalized === 'scan --strict') {
      const policy = getContentSecurityPolicy();
      const swaggerFrame = document.querySelector<HTMLIFrameElement>('iframe[title="Swagger Editor"]');
      await addLog('⌛ Inspecting local sandbox configuration...', 'info', 250);
      await addLog(
        policy ? '✔ Document Content Security Policy found.' : '⚠ No meta Content Security Policy found.',
        policy ? 'success' : 'warn',
        200
      );
      await addLog(
        swaggerFrame?.sandbox.length
          ? `✔ Swagger Editor iframe sandbox tokens: ${swaggerFrame.sandbox.value}`
          : 'ℹ Swagger Editor iframe is not currently mounted.',
        swaggerFrame?.sandbox.length ? 'success' : 'info',
        200
      );
      await addLog('ℹ Configuration inspection complete; this is not a malware or live traffic scan.', 'warn', 250);
    } else if (normalized === 'show-policy' || normalized === 'csp') {
      const policy = getContentSecurityPolicy();
      if (!policy) {
        await addLog('⚠ No meta Content Security Policy is present in this document.', 'warn', 200);
      } else {
        await addLog('🔒 Active document Content Security Policy:', 'info', 200);
        for (const directive of policy.split(';').map((part) => part.trim()).filter(Boolean)) {
          await addLog(`  ${directive}`, directive.startsWith('connect-src') ? 'success' : 'info', 60);
        }
      }
    } else if (normalized === 'wipe-cache' || normalized === 'wipe') {
      await addLog('⚠️ Preparing to purge this app\'s local data...', 'warn', 200);
      clearAppStorage();
      await addLog('✔ Theme preferences and cached Swagger specifications cleared.', 'success', 250);
    } else if (normalized === 'inspect-origin' || normalized === 'inspect') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      let storageUsage = 0;
      
      for (const key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          storageUsage += (localStorage[key] || '').length * 2; // approximation (UTF-16)
        }
      }
      const kb = (storageUsage / 1024).toFixed(2);

      await addLog(`🌍 Context Host: ${host}`, 'info', 300);
      await addLog(`📡 Protocol: ${protocol} (${protocol === 'https:' || host.startsWith('localhost') ? 'secure' : 'insecure'})`, 'info', 200);
      await addLog(`📦 localStorage size: ~${kb} KB`, 'info', 200);
      await addLog(`🔐 Secure context: ${window.isSecureContext ? 'yes' : 'no'}`, window.isSecureContext ? 'success' : 'warn', 200);
      await addLog(`🧱 Cross-origin isolated: ${window.crossOriginIsolated ? 'yes' : 'no (requires COOP/COEP response headers)'}`, 'info', 200);
    } else if (normalized === 'test-leak' || normalized === 'test-leak --simulate' || normalized === 'leak') {
      const policy = getContentSecurityPolicy();
      const connectDirective = policy
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('connect-src'));
      await addLog('⚠️ Outbound request simulation (no network request will be sent).', 'warn', 200);
      await addLog('📡 Hypothetical destination: https://third-party.invalid/collect', 'info', 200);
      await addLog(
        connectDirective
          ? `✔ Policy evaluated: ${connectDirective}`
          : '⚠ No explicit connect-src directive was found.',
        connectDirective ? 'success' : 'warn',
        200
      );
      await addLog('ℹ This command explains policy only; browser developer tools are required to audit real traffic.', 'info', 250);
    } else if (normalized === 'clear') {
      setLogs([]);
    } else {
      await addLog(`Command not found: "${trimmed}". Type "help" for a list of valid commands.`, 'warn', 200);
    }

    setIsScanning(false);
  };

  const handleButtonClick = (commandText: string) => {
    if (isScanning) return;
    setLogs(prev => [...prev, { type: 'cmd', text: commandText }]);
    executeCommand(commandText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = cmdInput.trim();
      if (!val) return;
      setLogs(prev => [...prev, { type: 'cmd', text: val }]);
      setCmdInput('');
      executeCommand(val);
    }
  };

  return (
    <div className="tool-container animate-fade-in">
      <div>
        <h2 className="tool-title">Browser Sandbox Diagnostics</h2>
        <p className="tool-subtitle">
          Inspect this page's CSP and origin metadata, clear app-owned storage, and explore a clearly labelled outbound-request simulation.
        </p>
      </div>

      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        {/* Terminal window */}
        <div className="terminal-window" style={{ maxWidth: '680px', width: '100%', height: '380px' }}>
          <div className="terminal-header">
            <div className="terminal-dot red" />
            <div className="terminal-dot yellow" />
            <div className="terminal-dot green" />
            <div className="terminal-title">devtools-cli</div>
          </div>
          <div className="terminal-body" style={{ fontSize: '12px', display: 'flex', flexDirection: 'column' }}>
            {logs.map((log, idx) => (
              <div key={idx} className={`terminal-line ${log.type}`}>
                {log.text}
              </div>
            ))}
            {/* Live Typing Input Line */}
            <div className="terminal-line input-line" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-light)', marginTop: '4px' }}>
              <span style={{ fontWeight: 'bold', userSelect: 'none' }}>$</span>
              <input
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isScanning}
                placeholder={isScanning ? "Running task..." : "Type command here..."}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px'
                }}
              />
            </div>
            <div ref={terminalEndRef} />
          </div>
          <div className="terminal-actions-bar" style={{ justifyContent: 'center' }}>
            <button className="terminal-btn" onClick={() => handleButtonClick('devtools scan --strict')} disabled={isScanning}>
              Scan
            </button>
            <button className="terminal-btn" onClick={() => handleButtonClick('devtools show-policy')} disabled={isScanning}>
              CSP Rules
            </button>
            <button className="terminal-btn" onClick={() => handleButtonClick('devtools inspect-origin')} disabled={isScanning}>
              Inspect Origin
            </button>
            <button className="terminal-btn" onClick={() => handleButtonClick('devtools test-leak --simulate')} disabled={isScanning}>
              Simulate Leak
            </button>
            <button className="terminal-btn" onClick={() => handleButtonClick('help')} disabled={isScanning}>
              Help
            </button>
            <button className="terminal-btn" onClick={() => handleButtonClick('devtools wipe-cache')} disabled={isScanning} style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
              Wipe cache
            </button>
          </div>
        </div>

        {/* Informational specs below */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', width: '100%', maxWidth: '680px', marginTop: '10px' }}>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}>
            <Info size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600 }}>Interactive Diagnostic Console</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                Type commands directly or use the shortcuts to inspect browser-visible configuration and run local simulations.
              </p>
            </div>
          </div>
          <div className="card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-input)' }}>
            <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 600 }}>Functional Cache Control</h4>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                The wipe command removes only this app's known storage keys and leaves unrelated same-origin data untouched.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalSandboxTool;

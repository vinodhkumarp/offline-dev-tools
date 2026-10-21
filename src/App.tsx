import { useState, useMemo } from 'react';
import { 
  FileJson, 
  BookOpen, 
  Binary, 
  Key, 
  Hash, 
  UserCheck, 
  Clock, 
  Search, 
  ShieldCheck,
  Sun,
  Moon,
  Split,
  Link as LinkIcon,
  Calendar,
  AlignLeft,
  Filter,
  Trash2,
  ArrowLeft,
  Terminal,
  Code2,
  Send
} from 'lucide-react';
import JSONFormatter from './components/JSONFormatter';
import SwaggerEditorWrapper from './components/SwaggerEditorWrapper';
import ApiClientWrapper from './components/ApiClientWrapper';
import Base64Tool from './components/Base64Tool';
import JWTDebugger from './components/JWTDebugger';
import HashGenerator from './components/HashGenerator';
import UUIDGenerator from './components/UUIDGenerator';
import EpochConverter from './components/EpochConverter';

// New Tool Imports
import TextDiffTool from './components/TextDiffTool';
import URLParserTool from './components/URLParserTool';
import CronParserTool from './components/CronParserTool';
import SQLFormatterTool from './components/SQLFormatterTool';
import RegExTesterTool from './components/RegExTesterTool';
import HTMLEntityTool from './components/HTMLEntityTool';
import TerminalSandboxTool from './components/TerminalSandboxTool';
import { clearAppStorage } from './storage';

const DevToolsLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      
      <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>

    {/* Outer Shield with glowing cyan outline */}
    <path
      d="M16 2L27 6.5V16C27 22.5 22.2 26.5 16 28C9.8 26.5 5 22.5 5 16V6.5L16 2Z"
      fill="#0f172a"
      stroke="url(#shieldGrad)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* Tech Ring (Circular Circuit track) */}
    <circle
      cx="16"
      cy="15"
      r="7.5"
      stroke="var(--accent-light)"
      strokeWidth="0.75"
      strokeDasharray="4 2"
      opacity="0.8"
    />

    {/* Circuit Nodes */}
    <circle cx="16" cy="7.5" r="1" fill="var(--accent-light)" filter="url(#logoGlow)" />
    <circle cx="8.5" cy="15" r="1" fill="var(--accent-light)" filter="url(#logoGlow)" />
    <circle cx="23.5" cy="15" r="1" fill="var(--accent-light)" filter="url(#logoGlow)" />
    <circle cx="16" cy="22.5" r="1" fill="var(--accent-light)" filter="url(#logoGlow)" />
    
    {/* Connections */}
    <path d="M16 7.5V11M8.5 15H11.5M20.5 15H23.5M16 19V22.5" stroke="var(--accent-light)" strokeWidth="0.5" opacity="0.6" />

    {/* Central Keyhole containing the code brackets </> */}
    <path
      d="M14 12 C14 10.9 14.9 10 16 10 C17.1 10 18 10.9 18 12 C18 12.8 17.5 13.5 16.8 13.8 L 17.5 18 H 14.5 L 15.2 13.8 C 14.5 13.5 14 12.8 14 12 Z"
      fill="url(#shieldGrad)"
    />

    {/* Small Code Brackets inside keyhole/center */}
    <path
      d="M13.5 15.5L12 15L13.5 14.5M18.5 14.5L20 15L18.5 15.5"
      stroke="#ffffff"
      strokeWidth="0.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
}

export default function App() {
  const [activeTool, setActiveTool] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Theme state defaulting to light mode as requested
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // Storage can be unavailable (e.g. blocked site data); the theme still applies for this session.
    }
  };

  const handleClearAllData = () => {
    if (confirm('Clear this app\'s locally stored theme, Swagger specification and API client data? This cannot be undone.')) {
      clearAppStorage();
      window.location.reload();
    }
  };

  const tools: ToolItem[] = useMemo(() => [
    {
      id: 'swagger-editor',
      name: 'Swagger Editor',
      description: 'Edit and preview OpenAPI/Swagger specifications client-side.',
      category: 'API Tools',
      icon: BookOpen,
      component: SwaggerEditorWrapper
    },
    {
      id: 'api-client',
      name: 'API Client',
      description: 'Postman-style REST client: collections, environments, auth, tests. Sends requests via a local proxy.',
      category: 'API Tools',
      icon: Send,
      component: ApiClientWrapper
    },
    {
      id: 'json-formatter',
      name: 'JSON/YAML Formatter',
      description: 'Validate, format, minify, and convert JSON and YAML.',
      category: 'Data Formatters',
      icon: FileJson,
      component: JSONFormatter
    },
    {
      id: 'text-diff',
      name: 'Text Diff Checker',
      description: 'Compare text documents line-by-line and show differences.',
      category: 'Data Formatters',
      icon: Split,
      component: TextDiffTool
    },
    {
      id: 'sql-formatter',
      name: 'SQL Query Formatter',
      description: 'Format, beautify, and capitalize raw database SQL queries.',
      category: 'Data Formatters',
      icon: AlignLeft,
      component: SQLFormatterTool
    },
    {
      id: 'base64-tool',
      name: 'Base64 Encoder / Decoder',
      description: 'Convert text and files to/from Base64 data streams.',
      category: 'Converters',
      icon: Binary,
      component: Base64Tool
    },
    {
      id: 'url-parser',
      name: 'URL Parser & Builder',
      description: 'Deconstruct URL parts and build query parameter grids.',
      category: 'Converters',
      icon: LinkIcon,
      component: URLParserTool
    },
    {
      id: 'html-entities',
      name: 'HTML Entity Tool',
      description: 'Encode special characters to HTML entities, or decode them.',
      category: 'Converters',
      icon: Code2,
      component: HTMLEntityTool
    },
    {
      id: 'jwt-debugger',
      name: 'JWT Debugger',
      description: 'Decode JWTs and verify signatures (HMAC, RSA, ECDSA, EdDSA) and claims.',
      category: 'Security',
      icon: Key,
      component: JWTDebugger
    },
    {
      id: 'hash-generator',
      name: 'Hash Generator',
      description: 'Generate MD5, SHA-1, SHA-256, SHA-384, and SHA-512 hashes.',
      category: 'Security',
      icon: Hash,
      component: HashGenerator
    },
    {
      id: 'regex-tester',
      name: 'Regex Tester',
      description: 'Validate regular expressions, show matches, and group details.',
      category: 'Security',
      icon: Filter,
      component: RegExTesterTool
    },
    {
      id: 'sandbox-cli',
      name: 'Browser Sandbox Diagnostics',
      description: 'Inspect the active Content Security Policy, storage usage, and simulated leak checks.',
      category: 'Security',
      icon: Terminal,
      component: TerminalSandboxTool
    },
    {
      id: 'uuid-generator',
      name: 'UUID/GUID Generator',
      description: 'Generate single or bulk RFC 4122 compliant UUID v4 strings.',
      category: 'Utilities',
      icon: UserCheck,
      component: UUIDGenerator
    },
    {
      id: 'epoch-converter',
      name: 'Epoch Converter',
      description: 'Convert Unix epoch timestamps to human-readable dates.',
      category: 'Utilities',
      icon: Clock,
      component: EpochConverter
    },
    {
      id: 'cron-parser',
      name: 'Cron Parser',
      description: 'Translate crontab schedules to human-readable sentences.',
      category: 'Utilities',
      icon: Calendar,
      component: CronParserTool
    }
  ], []);

  const dashboardFilteredTools = useMemo(() => {
    return tools.filter(tool => {
      const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tool.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [tools, selectedCategory, searchQuery]);

  const ActiveComponent = useMemo(() => {
    const currentTool = tools.find(tool => tool.id === activeTool) || tools[0];
    return currentTool.component;
  }, [tools, activeTool]);

  return (
    <div className="app-container" data-theme={theme}>
      {/* MAIN VIEW AREA */}
      <div className="main-workspace">
        
        {/* TOP NAVBAR */}
        <header className="top-navbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="brand-section" onClick={() => setActiveTool('dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DevToolsLogo style={{ width: '28px', height: '28px', flexShrink: 0 }} />
              <div>
                <h1 className="brand-title" style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>DevTools</h1>
                <p className="brand-subtitle" style={{ fontSize: '9px', margin: 0, opacity: 0.8 }}>Secure Sandbox Utilities</p>
              </div>
            </div>

            {/* Quick Switcher dropdown when inside a tool */}
            {activeTool !== 'dashboard' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Quick Switch:</span>
                <select
                  value={activeTool}
                  onChange={(e) => {
                    setActiveTool(e.target.value);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="select"
                  style={{ padding: '6px 12px', fontSize: '12px', height: 'auto', width: 'auto', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', outline: 'none', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                >
                  {tools.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Privacy Status Badge & Theme Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="privacy-badge">
              <ShieldCheck size={12} style={{ flexShrink: 0 }} />
              <span>100% Client-Side Sandbox</span>
            </div>

            <button
              onClick={handleClearAllData}
              className="navbar-toggle"
              title="Clear this app's local data"
              aria-label="Clear this app's local data"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--danger)' }}
            >
              <Trash2 size={14} />
            </button>
            
            <button
              onClick={toggleTheme}
              className="navbar-toggle"
              title="Toggle Light/Dark Theme"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid var(--border)', borderRadius: '8px' }}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </header>

        {/* CONTAINER FOR ACTIVE TOOL */}
        <main className="main-content">
          <div className={activeTool === 'dashboard' ? 'content-wrapper' : 'content-wrapper-full'}>
            {activeTool === 'dashboard' ? (
              <div className="dashboard-container animate-fade-in">
                {/* HERO SECTION */}
                <section className="hero-section" style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Floating Background Glow Orbs */}
                  <div className="glow-orb glow-orb-1" />
                  <div className="glow-orb glow-orb-2" />
                  
                  {/* Gemini-style Hero Grid */}
                  <div className="hero-grid">
                    {/* Left Column: Text & Search */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', zIndex: 1 }}>
                      <div className="hero-badge-row" style={{ justifyContent: 'flex-start', marginBottom: 0 }}>
                        <div className="hero-badge">
                          <span>🔒 100% Client-Side Sandbox</span>
                        </div>
                        <div className="hero-badge highlight">
                          <span>⚡ No Telemetry. No Uploads.</span>
                        </div>
                        <div className="hero-badge">
                          <span>🛡️ Air-Gapped Intranet Ready</span>
                        </div>
                      </div>

                      <h2 className="hero-title" style={{ fontSize: '42px', textAlign: 'left', margin: 0 }}>
                        Secure by default.<br />
                        <span className="gemini-gradient-text">Local by design.</span>
                      </h2>
                      
                      <p className="hero-subtitle" style={{ textAlign: 'left', margin: '4px 0 12px 0', maxWidth: '580px' }}>
                        Stop pasting proprietary specifications, database queries, and private JWT keys into public online formatters. 
                        <strong> DevTools</strong> operates {tools.length} utilities entirely inside your browser. No application servers, analytics, or tracking.
                      </p>

                      <div className="dashboard-search-wrapper" style={{ margin: 0 }}>
                        <Search className="dashboard-search-icon" size={18} />
                        <input
                          type="text"
                          placeholder={`Search ${tools.length} sandboxed utilities...`}
                          aria-label="Search developer utilities"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="dashboard-search-input"
                        />
                      </div>
                    </div>

                    {/* Right Column: Glowing Logo Container */}
                    <div className="hero-visual">
                      <div className="glowing-logo-container">
                        <div className="logo-glow-aura" />
                        <img 
                          src={`${import.meta.env.BASE_URL}logo.png`} 
                          alt="DevTools Secure Emblem" 
                          className="glowing-logo-img" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Security specs inline grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', width: '100%', maxWidth: '1100px', marginTop: '48px', zIndex: 1 }}>
                    {/* Spec 1 */}
                    <div className="card glow-hover" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                        <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>Origin Sandbox</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>All utility executions run strictly client-side inside your browser thread.</p>
                    </div>
                    {/* Spec 2 */}
                    <div className="card glow-hover" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                        <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>Zero Callbacks</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>No remote databases, tracker telemetries, analytics, or remote API queries are loaded.</p>
                    </div>
                    {/* Spec 3 */}
                    <div className="card glow-hover" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                        <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>Storage Safety</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>Your Swagger specs and layout preferences persist strictly inside local origin storage.</p>
                    </div>
                    {/* Spec 4 */}
                    <div className="card glow-hover" style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', backgroundColor: 'var(--surface)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                        <ShieldCheck size={15} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 700 }}>Offline Deployable</span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>Compiles to a lightweight static asset folder, ready for private air-gapped intranets.</p>
                    </div>
                  </div>
                </section>

                {/* CATEGORY NAV & GRID */}
                <div>
                  <div className="category-nav">
                    {['All', 'API Tools', 'Data Formatters', 'Converters', 'Security', 'Utilities'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {dashboardFilteredTools.length > 0 ? (
                    <div className="cards-grid">
                      {dashboardFilteredTools.map((tool) => {
                        const Icon = tool.icon;
                        return (
                          <button
                            type="button"
                            key={tool.id}
                            onClick={() => {
                              setActiveTool(tool.id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="grid-card"
                          >
                            <div className="card-icon-wrapper">
                              <Icon size={20} />
                            </div>
                            <span className="card-tag">{tool.category}</span>
                            <h3 className="grid-card-title">{tool.name}</h3>
                            <p className="grid-card-desc">{tool.description}</p>
                            <div className="grid-card-footer">
                              <span>Launch Utility</span>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600 }}>No matching secure utilities found</p>
                      <p style={{ fontSize: '12px', marginTop: '4px' }}>Try searching another keyword or clearing your query.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setActiveTool('dashboard')}
                  className="back-to-dashboard-btn"
                >
                  <ArrowLeft size={13} />
                  Back to Dashboard
                </button>
                <ActiveComponent />
              </>
            )}
          </div>
        </main>
      </div>

    </div>
  );
}

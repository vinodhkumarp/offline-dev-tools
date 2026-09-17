import React, { useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  language: 'json' | 'yaml' | 'sql';
  height?: string;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  language,
  height = '300px',
  readOnly = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scroll positions
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    handleScroll();
  }, [value]);

  const highlight = (text: string) => {
    if (!text) return '';
    
    // Escape HTML characters
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    if (language === 'json') {
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
    }

    if (language === 'yaml') {
      return escaped.split('\n').map(line => {
        // Highlight comments
        if (line.trim().startsWith('#')) {
          return `<span style="color: var(--text-muted); font-style: italic;">${line}</span>`;
        }
        // Highlight keys and values (e.g. key: value or - key: value)
        return line.replace(/^(\s*[-\s]*)([a-zA-Z0-9_\-\s]+)(:)(.*)$/, (_, prefix, key, colon, value) => {
          const highlightedKey = `<span class="json-key">${key}</span>`;
          let highlightedValue = value;
          const trimmedVal = value.trim();
          if (trimmedVal) {
            if (/^(true|false|yes|no)$/i.test(trimmedVal)) {
              highlightedValue = value.replace(trimmedVal, `<span class="json-value-boolean">${trimmedVal}</span>`);
            } else if (/^-?\d+(\.\d+)?$/.test(trimmedVal)) {
              highlightedValue = value.replace(trimmedVal, `<span class="json-value-number">${trimmedVal}</span>`);
            } else if (trimmedVal.startsWith('"') || trimmedVal.startsWith("'")) {
              highlightedValue = value.replace(trimmedVal, `<span class="json-value-string">${trimmedVal}</span>`);
            } else {
              highlightedValue = value.replace(trimmedVal, `<span class="json-value-string">${trimmedVal}</span>`);
            }
          }
          return `${prefix}${highlightedKey}${colon}${highlightedValue}`;
        });
      }).join('\n');
    }

    if (language === 'sql') {
      const keywords = [
        'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 
        'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
        'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'ON', 'HAVING',
        'IN', 'AS', 'LIKE', 'IS', 'NULL', 'NOT', 'UNION', 'ALL', 'CREATE TABLE', 'DROP TABLE'
      ];
      
      // Highlight strings
      escaped = escaped.replace(/(['"])(.*?)\1/g, '<span class="sql-string">$1$2$1</span>');
      
      // Highlight numbers
      escaped = escaped.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');
      
      // Highlight keywords
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        // Keep the original casing so the highlight layer lines up with the textarea text.
        escaped = escaped.replace(regex, (match) => `<span class="sql-keyword">${match}</span>`);
      });
      
      return escaped;
    }

    return escaped;
  };

  return (
    <div style={{ position: 'relative', width: '100%', height, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--bg-input)' }}>
      {/* Background Pre block */}
      <pre
        ref={preRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: '12px',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: 'var(--text)',
          pointerEvents: 'none',
          boxSizing: 'border-box'
        }}
        dangerouslySetInnerHTML={{ __html: highlight(value) + '\n' }}
      />
      {/* Overlay Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        disabled={readOnly}
        placeholder={placeholder}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          padding: '12px',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'var(--text)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          lineHeight: '1.6',
          border: 'none',
          outline: 'none',
          resize: 'none',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          WebkitTextFillColor: 'transparent'
        }}
      />
    </div>
  );
};
export default CodeEditor;

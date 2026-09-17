import React, { useState, useMemo } from 'react';
import { ArrowLeftRight, Trash2 } from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lineNumA?: number;
  lineNumB?: number;
  wordDiffHtml?: string; // Highlighted HTML for modified words
}

// The LCS table is O(lines A x lines B); cap it so very large inputs cannot freeze the tab.
const MAX_LINE_CELLS = 4_000_000;
const MAX_WORD_CELLS = 250_000;

const countLines = (text: string) => text.split(/\r?\n/).length;

interface TokenDiff {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export const TextDiffTool: React.FC = () => {
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  // Token-level LCS Diff for words inside a modified line
  const diffWords = (strA: string, strB: string): { oldHtml: string; newHtml: string } => {
    const tokensA = strA.match(/(\s+|\w+|[^\w\s])/g) || [];
    const tokensB = strB.match(/(\s+|\w+|[^\w\s])/g) || [];
    const m = tokensA.length;
    const n = tokensB.length;
    if (m * n > MAX_WORD_CELLS) {
      return { oldHtml: '', newHtml: '' };
    }

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (tokensA[i - 1] === tokensB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const ops: TokenDiff[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
        ops.unshift({ type: 'unchanged', value: tokensA[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.unshift({ type: 'added', value: tokensB[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
        ops.unshift({ type: 'removed', value: tokensA[i - 1] });
        i--;
      }
    }

    const escapeHtml = (text: string) =>
      text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let oldHtml = '';
    ops.forEach((op) => {
      if (op.type === 'unchanged') {
        oldHtml += escapeHtml(op.value);
      } else if (op.type === 'removed') {
        oldHtml += `<span style="background-color: hsla(346, 84%, 50%, 0.28); border-radius: 2px; padding: 0px 2px; font-weight: 600; border-bottom: 1.5px solid var(--danger);">${escapeHtml(
          op.value
        )}</span>`;
      }
    });

    let newHtml = '';
    ops.forEach((op) => {
      if (op.type === 'unchanged') {
        newHtml += escapeHtml(op.value);
      } else if (op.type === 'added') {
        newHtml += `<span style="background-color: hsla(142, 70%, 45%, 0.28); border-radius: 2px; padding: 0px 2px; font-weight: 600; border-bottom: 1.5px solid var(--success);">${escapeHtml(
          op.value
        )}</span>`;
      }
    });

    return { oldHtml, newHtml };
  };

  // Line-level LCS Diff
  const computeDiff = (oldText: string, newText: string): DiffLine[] => {
    const linesA = oldText.split(/\r?\n/);
    const linesB = newText.split(/\r?\n/);
    const m = linesA.length;
    const n = linesB.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (linesA[i - 1] === linesB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: DiffLine[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
        result.unshift({
          type: 'unchanged',
          value: linesA[i - 1],
          lineNumA: i,
          lineNumB: j
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({
          type: 'added',
          value: linesB[j - 1],
          lineNumB: j
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
        result.unshift({
          type: 'removed',
          value: linesA[i - 1],
          lineNumA: i
        });
        i--;
      }
    }

    return result;
  };

  const diffTooLarge = useMemo(() => countLines(textA) * countLines(textB) > MAX_LINE_CELLS, [textA, textB]);

  const diff = useMemo(() => {
    if ((!textA && !textB) || diffTooLarge) {
      return [];
    }
    const diffResult = computeDiff(textA, textB);

    // Identify adjacent modified pairs and run word-level diffing
    for (let k = 0; k < diffResult.length - 1; k++) {
      if (diffResult[k].type === 'removed' && diffResult[k + 1].type === 'added') {
        const { oldHtml, newHtml } = diffWords(diffResult[k].value, diffResult[k + 1].value);
        if (oldHtml || newHtml) {
          diffResult[k].wordDiffHtml = oldHtml;
          diffResult[k + 1].wordDiffHtml = newHtml;
        }
      }
    }

    return diffResult;
  }, [textA, textB, diffTooLarge]);

  // Generate rows for Side-by-Side Split View
  const splitDiffRows = useMemo(() => {
    interface SplitRow {
      left: { type: 'removed' | 'unchanged' | 'empty'; value: string; lineNum?: number; html?: string };
      right: { type: 'added' | 'unchanged' | 'empty'; value: string; lineNum?: number; html?: string };
    }

    const rows: SplitRow[] = [];
    let i = 0;
    while (i < diff.length) {
      const current = diff[i];
      if (
        i < diff.length - 1 &&
        current.type === 'removed' &&
        diff[i + 1].type === 'added'
      ) {
        const next = diff[i + 1];
        rows.push({
          left: {
            type: 'removed',
            value: current.value,
            lineNum: current.lineNumA,
            html: current.wordDiffHtml
          },
          right: {
            type: 'added',
            value: next.value,
            lineNum: next.lineNumB,
            html: next.wordDiffHtml
          }
        });
        i += 2;
      } else if (current.type === 'removed') {
        rows.push({
          left: {
            type: 'removed',
            value: current.value,
            lineNum: current.lineNumA,
            html: current.wordDiffHtml
          },
          right: {
            type: 'empty',
            value: ''
          }
        });
        i++;
      } else if (current.type === 'added') {
        rows.push({
          left: {
            type: 'empty',
            value: ''
          },
          right: {
            type: 'added',
            value: current.value,
            lineNum: current.lineNumB,
            html: current.wordDiffHtml
          }
        });
        i++;
      } else {
        rows.push({
          left: {
            type: 'unchanged',
            value: current.value,
            lineNum: current.lineNumA
          },
          right: {
            type: 'unchanged',
            value: current.value,
            lineNum: current.lineNumB
          }
        });
        i++;
      }
    }
    return rows;
  }, [diff]);

  const loadSample = () => {
    const original = `{\n  "name": "DevTools",\n  "version": "1.0.0",\n  "offline": false,\n  "licence": "GPL"\n}`;
    const modified = `{\n  "name": "DevTools Suite",\n  "version": "1.1.0",\n  "offline": true,\n  "license": "Apache 2.0"\n}`;
    setTextA(original);
    setTextB(modified);
  };

  const handleClear = () => {
    setTextA('');
    setTextB('');
  };

  const handleSwap = () => {
    const temp = textA;
    setTextA(textB);
    setTextB(temp);
  };

  return (
    <div className="tool-container animate-fade-in">
      {/* Title */}
      <div className="tool-header-row">
        <div>
          <h2 className="tool-title">Text Diff Checker</h2>
          <p className="tool-subtitle">
            Compare two texts line-by-line. Modified words are highlighted at a granular level, similar to IntelliJ or Beyond Compare.
          </p>
        </div>
        <div className="toolbar-group">
          {/* View Mode Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px', backgroundColor: 'var(--bg-input)' }}>
            <button
              onClick={() => setViewMode('unified')}
              className={`btn ${viewMode === 'unified' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '11px', border: 'none', boxShadow: 'none', borderRadius: '6px' }}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`btn ${viewMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '11px', border: 'none', boxShadow: 'none', borderRadius: '6px' }}
            >
              Split View
            </button>
          </div>

          <button onClick={loadSample} className="btn btn-secondary">
            Load Sample
          </button>
          <button onClick={handleSwap} className="btn btn-secondary" title="Swap Texts">
            <ArrowLeftRight size={13} />
            Swap
          </button>
          <button onClick={handleClear} className="btn btn-danger" title="Clear Inputs">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Original Text (A)</label>
          <textarea
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            className="textarea code-editor"
            style={{ height: '180px', resize: 'none' }}
            placeholder="Paste original text here..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Modified Text (B)</label>
          <textarea
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            className="textarea code-editor"
            style={{ height: '180px', resize: 'none' }}
            placeholder="Paste modified text here..."
          />
        </div>
      </div>

      {/* Output Comparison View */}
      <div className="form-group">
        <label className="form-label">Comparison Output ({viewMode === 'split' ? 'Side-by-Side' : 'Unified'})</label>
        <div className="diff-container" style={{ height: '380px' }}>
          {diff.length > 0 ? (
            viewMode === 'split' ? (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {splitDiffRows.map((row, idx) => (
                  <div key={idx} className="diff-line-row" style={{ display: 'flex', width: '100%' }}>
                    {/* Left Pane (Original) */}
                    <div style={{ display: 'flex', flex: 1, borderRight: '1px solid var(--border)', overflow: 'hidden', minWidth: 0 }}>
                      <div className="diff-line-number">
                        {row.left.lineNum || ''}
                      </div>
                      {row.left.type === 'empty' ? (
                        <div className="diff-line-content empty" style={{ backgroundColor: 'var(--surface-hover)', width: '100%', opacity: 0.4 }}>&nbsp;</div>
                      ) : row.left.html ? (
                        <div className={`diff-line-content ${row.left.type}`} dangerouslySetInnerHTML={{ __html: '- ' + row.left.html }} style={{ width: '100%' }} />
                      ) : (
                        <div className={`diff-line-content ${row.left.type}`} style={{ width: '100%' }}>
                          {row.left.type === 'unchanged' ? '  ' + row.left.value : '- ' + row.left.value}
                        </div>
                      )}
                    </div>
                    {/* Right Pane (Modified) */}
                    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minWidth: 0 }}>
                      <div className="diff-line-number">
                        {row.right.lineNum || ''}
                      </div>
                      {row.right.type === 'empty' ? (
                        <div className="diff-line-content empty" style={{ backgroundColor: 'var(--surface-hover)', width: '100%', opacity: 0.4 }}>&nbsp;</div>
                      ) : row.right.html ? (
                        <div className={`diff-line-content ${row.right.type}`} dangerouslySetInnerHTML={{ __html: '+ ' + row.right.html }} style={{ width: '100%' }} />
                      ) : (
                        <div className={`diff-line-content ${row.right.type}`} style={{ width: '100%' }}>
                          {row.right.type === 'unchanged' ? '  ' + row.right.value : '+ ' + row.right.value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {diff.map((line, idx) => (
                  <div key={idx} className="diff-line-row">
                    <div className="diff-line-number">
                      {line.type === 'removed' ? line.lineNumA : line.type === 'added' ? '' : line.lineNumA}
                    </div>
                    <div className="diff-line-number" style={{ borderLeft: 'none' }}>
                      {line.type === 'removed' ? '' : line.type === 'added' ? line.lineNumB : line.lineNumB}
                    </div>
                    {line.wordDiffHtml ? (
                      <div 
                        className={`diff-line-content ${line.type}`}
                        dangerouslySetInnerHTML={{ 
                          __html: (line.type === 'added' ? '+ ' : '- ') + line.wordDiffHtml 
                        }}
                      />
                    ) : (
                      <div className={`diff-line-content ${line.type}`}>
                        {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                        {line.value || ' '}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic', color: 'var(--text-muted)' }}>
              {diffTooLarge
                ? 'These inputs are too large to compare in the browser. Try comparing smaller sections.'
                : 'Provide text in input panels to render visual diff calculations...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextDiffTool;

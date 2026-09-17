// Lightweight, dialect-agnostic SQL re-indenter. It is not a full SQL parser.

const TOKEN_PATTERN = new RegExp(
  [
    String.raw`--[^\n]*`, // line comment
    String.raw`/\*[\s\S]*?\*/`, // block comment
    String.raw`'(?:[^'\\]|\\.|'')*'`, // single-quoted literal ('' escapes)
    String.raw`"(?:[^"\\]|\\.|"")*"`, // double-quoted identifier
    '`[^`]*`', // MySQL identifier
    String.raw`\$\$[\s\S]*?\$\$`, // Postgres dollar-quoted body
    String.raw`[()]`,
    '[,;]',
    String.raw`<=|>=|<>|!=|::|\|\||->>|->`, // multi-character operators
    String.raw`:[\p{L}_][\p{L}\p{N}_]*`, // named parameter (:name)
    String.raw`[\p{L}\p{N}_*.$@#\[\]]+`, // words, identifiers, numbers, parameters
    String.raw`\s+`,
    String.raw`[^\s]`, // any other single character
  ].join('|'),
  'gu'
);

export const formatSQL = (sql: string): string => {
  if (!sql) return '';

  // Every non-whitespace character must land in a token so formatting never drops
  // part of the query. Comments, quoted literals/identifiers and multi-character
  // operators are kept intact.
  const tokens = sql.match(TOKEN_PATTERN) || [];
  const cleanTokens = tokens.map(t => t.trim()).filter(Boolean);

  let indent = 0;
  let output = '';
  const spacing = '    '; // 4 spaces as requested
  let inClause = false;
  const clauseStack: boolean[] = [];
  let inlineParenthesisDepth = 0;

  const getIndent = () => spacing.repeat(indent);

  // Helper to check if a parenthesized group is complex (contains subquery keywords)
  const isComplexGroup = (startIdx: number): boolean => {
    let depth = 1;
    let hasKeywords = false;
    
    for (let i = startIdx + 1; i < cleanTokens.length; i++) {
      const t = cleanTokens[i];
      if (t === '(') depth++;
      else if (t === ')') {
        depth--;
        if (depth === 0) break;
      }
      
      const tLower = t.toLowerCase();
      if (
        tLower === 'select' ||
        tLower === 'from' ||
        tLower === 'where' ||
        tLower === 'join' ||
        tLower === 'union' ||
        tLower === 'insert' ||
        tLower === 'update' ||
        tLower === 'delete'
      ) {
        hasKeywords = true;
      }
    }
    return hasKeywords;
  };

  for (let idx = 0; idx < cleanTokens.length; idx++) {
    const token = cleanTokens[idx];
    const tokenLower = token.toLowerCase();

    // Line comments must end the line, otherwise the following SQL would be commented out.
    if (token.startsWith('--')) {
      if (output.endsWith('\n')) {
        output += getIndent();
      } else if (output && !output.endsWith(' ')) {
        output += ' ';
      }
      output += token + '\n';
      continue;
    }

    // If we are inside an inline parenthesis, keep formatting simple
    if (inlineParenthesisDepth > 0) {
      if (token === '(') {
        inlineParenthesisDepth++;
        output += '(';
      } else if (token === ')') {
        inlineParenthesisDepth--;
        output += ')';
      } else if (token === ',') {
        output += ', ';
      } else {
        if (output && !output.endsWith('(') && !output.endsWith(' ')) {
          output += ' ';
        }
        output += token;
      }
      continue;
    }

    // Major SELECT clause commands
    if (
      tokenLower === 'select' || 
      tokenLower === 'from' || 
      tokenLower === 'where' || 
      tokenLower === 'having' ||
      tokenLower === 'limit'
    ) {
      if (inClause) {
        indent--;
      }
      if (output && !output.endsWith('\n')) {
        output += '\n';
      }
      output += getIndent() + tokenLower + '\n';
      indent++;
      inClause = true;
    }
    // GROUP BY keyword
    else if (tokenLower === 'group' && cleanTokens[idx + 1]?.toLowerCase() === 'by') {
      idx++; // consume 'by'
      if (inClause) {
        indent--;
      }
      if (output && !output.endsWith('\n')) {
        output += '\n';
      }
      output += getIndent() + 'group by\n';
      indent++;
      inClause = true;
    }
    // ORDER BY keyword
    else if (tokenLower === 'order' && cleanTokens[idx + 1]?.toLowerCase() === 'by') {
      idx++; // consume 'by'
      if (inClause) {
        indent--;
      }
      if (output && !output.endsWith('\n')) {
        output += '\n';
      }
      output += getIndent() + 'order by\n';
      indent++;
      inClause = true;
    }
    // JOIN keywords
    else if (
      tokenLower === 'join' || 
      tokenLower === 'left' || 
      tokenLower === 'right' || 
      tokenLower === 'inner' || 
      tokenLower === 'outer'
    ) {
      let fullJoin = tokenLower;
      let lookAhead = idx;
      while (true) {
        const next = cleanTokens[lookAhead + 1]?.toLowerCase();
        if (next === 'join' || next === 'left' || next === 'right' || next === 'inner' || next === 'outer') {
          fullJoin += ' ' + next;
          lookAhead++;
        } else {
          break;
        }
      }
      idx = lookAhead;

      if (inClause) {
        indent--;
      }
      if (output && !output.endsWith('\n')) {
        output += '\n';
      }
      output += getIndent() + fullJoin + '\n';
      indent++;
      inClause = true;
    }
    // Opening bracket
    else if (token === '(') {
      if (isComplexGroup(idx)) {
        if (output && !output.endsWith('\n') && !output.endsWith(' ')) {
          output += ' ';
        }
        if (output && !output.endsWith('\n')) {
          output += '\n';
        }
        output += getIndent() + '(\n';
        clauseStack.push(inClause);
        inClause = false;
        indent++;
      } else {
        const prevToken = idx > 0 ? cleanTokens[idx - 1].toLowerCase() : '';
        const needsSpace = prevToken && ['in', 'values', 'on', 'as', 'and', 'or', 'where', 'having', 'join', 'from', 'select'].includes(prevToken);
        if (output && !output.endsWith('\n') && !output.endsWith(' ') && !output.endsWith('(')) {
          if (needsSpace || !prevToken.match(/^[a-zA-Z0-9_]+$/)) {
            output += ' ';
          }
        }
        output += '(';
        inlineParenthesisDepth = 1;
      }
    }
    // Closing bracket
    else if (token === ')') {
      if (inClause) {
        indent--;
      }
      indent--; // decrease for the opening parenthesis
      if (output && !output.endsWith('\n')) {
        output += '\n';
      }
      output += getIndent() + ')';
      
      // Restore parent clause state
      if (clauseStack.length > 0) {
        inClause = clauseStack.pop() || false;
      }

      // Check if followed by inline alias or operator (e.g. as code, / +)
      let nextIdx = idx + 1;
      let aliasStr = '';
      while (nextIdx < cleanTokens.length) {
        const nextT = cleanTokens[nextIdx];
        const nextTLower = nextT.toLowerCase();
        
        if (nextTLower === 'as') {
          aliasStr += ' as';
          nextIdx++;
        } else if (nextTLower === ',' || nextTLower === ';') {
          break;
        } else if (
          ['select', 'from', 'where', 'group', 'order', 'having', 'join', 'left', 'right', 'inner', 'outer', '(', ')'].includes(nextTLower)
        ) {
          break;
        } else {
          aliasStr += ' ' + nextT;
          nextIdx++;
        }
      }
      output += aliasStr;
      idx = nextIdx - 1;
    }
    // Comma
    else if (token === ',') {
      output += ',\n';
    }
    // Semicolon
    else if (token === ';') {
      output += ';';
    }
    // Regular words / identifiers / operators
    else {
      if (output.endsWith('\n')) {
        output += getIndent();
      }
      if (
        output && 
        !output.endsWith('\n') && 
        !output.endsWith(' ') && 
        !output.endsWith('(')
      ) {
        output += ' ';
      }
      
      // Output lowercase keywords like 'as' or 'on'
      if (tokenLower === 'as' || tokenLower === 'on') {
        output += tokenLower;
      } else {
        output += token;
      }
    }
  }

  return output.trim();
};

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatSQL } from './sqlFormat.ts';

// Formatting may change whitespace and keyword casing, but never the query itself.
const significant = (sql: string) => sql.replace(/\s/g, '').toLowerCase();

test('preserves operators, literals, identifiers, and parameters', () => {
  const queries = [
    "SELECT a/b AS ratio, c % 2, x::int FROM t WHERE a >= 1 AND b <> 2 AND c != 3 AND name = 'it''s' AND d <= @param ORDER BY a DESC LIMIT 10;",
    "select `col`, j->>'k' from café where x || y = :v /* note */ group by 1",
    'select count(*) from orders o left outer join users u on u.id = o.user_id where o.id in (1,2,3)',
  ];
  for (const query of queries) {
    assert.equal(significant(formatSQL(query)), significant(query), query);
  }
});

test('line comments end their line so following SQL is not commented out', () => {
  const output = formatSQL('select a -- first column\n, b from t');
  const commentLine = output.split('\n').find((line) => line.includes('-- first column'));
  assert.ok(commentLine);
  assert.doesNotMatch(commentLine, /\bb\b|from/);
});

test('indents subqueries', () => {
  assert.equal(
    formatSQL('select (select id from t2) as x from t1'),
    'select\n    (\n        select\n            id\n        from\n            t2\n    ) as x\nfrom\n    t1',
  );
});

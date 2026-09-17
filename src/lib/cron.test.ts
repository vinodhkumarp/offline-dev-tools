import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCron } from './cron.ts';

test('describes common schedules', () => {
  assert.equal(describeCron('0 0 * * *').summary, 'Runs at 00:00.');
  assert.equal(describeCron('*/5 * * * *').summary, 'Runs every 5 minutes.');
  assert.equal(describeCron('@hourly').summary, 'Runs at minute 0 of every hour.');
  assert.match(describeCron('*/15 9-17 * * 1-5').summary, /Monday through Friday/);
  assert.match(describeCron('30 2 1 JAN,JUL *').summary, /January, July/);
});

test('handles stepped ranges', () => {
  assert.equal(describeCron('1-30/5 * * * *').minute, 'every 5 minutes from 1 through 30');
});

test('warns when day-of-month and day-of-week are both restricted', () => {
  assert.equal(describeCron('0 9 1 * 1').notes.length, 1);
});

test('rejects invalid expressions', () => {
  for (const expression of ['99 * * * *', '*/0 * * * *', '0 0 * * 8', 'a b c d e', '1,,2 * * * *', '0 0 * *', '5-1 * * * *']) {
    assert.throws(() => describeCron(expression), undefined, expression);
  }
});

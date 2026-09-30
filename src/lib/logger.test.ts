// Run: node --test --test-force-exit src/lib/logger.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logger } from './logger.ts';

function captureConsole(method: 'log' | 'warn' | 'error', fn: () => void): string {
  const original = console[method];
  let captured = '';
  console[method] = (line: string) => { captured = line; };
  try {
    fn();
  } finally {
    console[method] = original;
  }
  return captured;
}

test('info logs are valid JSON with a level, message, and timestamp', () => {
  const line = captureConsole('log', () => logger.info('hello', { roomId: 'ABC123' }));
  const parsed = JSON.parse(line);
  assert.equal(parsed.level, 'info');
  assert.equal(parsed.message, 'hello');
  assert.equal(parsed.roomId, 'ABC123');
  assert.equal(typeof parsed.time, 'string');
});

test('error logs serialize an Error in meta into name/message/stack', () => {
  const line = captureConsole('error', () => logger.error('boom', { error: new Error('bad') }));
  const parsed = JSON.parse(line);
  assert.equal(parsed.level, 'error');
  assert.equal(parsed.error.name, 'Error');
  assert.equal(parsed.error.message, 'bad');
  assert.equal(typeof parsed.error.stack, 'string');
});

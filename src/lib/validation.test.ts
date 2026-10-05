// Run: node --test --test-force-exit src/lib/validation.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containsProfanity, filterProfanity, validateUsername, validateRoomId, validateCustomWords } from './validation.ts';

test('containsProfanity catches obfuscated variants, not just exact words', () => {
  assert.equal(containsProfanity('this is a nice clean message'), false);
  assert.equal(containsProfanity('fuck this'), true);
  assert.equal(containsProfanity('sh1t happens'), true); // leetspeak
});

test('filterProfanity replaces matched spans and leaves clean text untouched', () => {
  assert.equal(filterProfanity('hello world'), 'hello world');
  assert.equal(filterProfanity('fuck this'), '*** this');
});

test('validateUsername rejects profane, malformed, or out-of-range names', () => {
  assert.equal(validateUsername('Player1').valid, true);
  assert.equal(validateUsername('').valid, false);
  assert.equal(validateUsername('a').valid, false); // too short
  assert.equal(validateUsername('x'.repeat(21)).valid, false); // too long
  assert.equal(validateUsername('bad<script>').valid, false); // disallowed chars
  assert.equal(validateUsername('fuck').valid, false); // profanity
});

test('validateRoomId enforces the 6-char uppercase alphanumeric format', () => {
  assert.equal(validateRoomId('AB12CD'), true);
  assert.equal(validateRoomId('ab12cd'), false); // must be uppercase
  assert.equal(validateRoomId('AB12C'), false); // too short
});

test('validateCustomWords trims, dedupes, and enforces bounds and content', () => {
  const ok = validateCustomWords(['Dragon', ' sandwich ', 'umbrella', 'dragon']);
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.words, ['dragon', 'sandwich', 'umbrella']); // deduped + lowercased

  assert.equal(validateCustomWords(['dragon', 'sandwich']).valid, false); // fewer than 3
  assert.equal(validateCustomWords(Array.from({ length: 101 }, (_, i) => `word${i}`)).valid, false); // too many
  assert.equal(validateCustomWords(['dragon', 'sand<wich>', 'umbrella']).valid, false); // bad chars
  assert.equal(validateCustomWords(['dragon', 'fuck', 'umbrella']).valid, false); // profanity
  assert.equal(validateCustomWords('not an array').valid, false);
});

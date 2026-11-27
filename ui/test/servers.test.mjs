import test from 'node:test';
import assert from 'node:assert/strict';
import { formToSpec, isFormEditable, parseJsonDoc, specToForm, validateDoc, formError, blankForm } from '../src/servers.js';

test('Servers edit merges over the original and keeps unknown fields', () => {
  const orig = { type: 'stdio', command: 'a', args: ['x'], allowed_tools: ['t'], cwd_app_dir: 'app' };
  const form = { ...specToForm('s', orig), command: 'b', enabled: false };
  const out = formToSpec(form, orig);
  assert.equal(out.command, 'b');
  assert.equal(out.enabled, false);
  assert.deepEqual(out.args, ['x']);
  assert.deepEqual(out.allowed_tools, ['t']);
  assert.equal(out.cwd_app_dir, 'app');
});

test('http spec round-trips headers and drops stdio keys', () => {
  const orig = { type: 'http', url: 'http://h', headers: { A: '1' }, extra: 1 };
  const out = formToSpec({ ...specToForm('s', orig), url: 'http://h2' }, orig);
  assert.deepEqual(out, { type: 'http', enabled: true, url: 'http://h2', headers: { A: '1' }, extra: 1 });
});

test('gateway and unknown types are JSON-only', () => {
  assert.equal(isFormEditable({ type: 'gateway', url: 'u' }), false);
  assert.equal(isFormEditable({ type: 'sse', url: 'u' }), false);
  assert.equal(isFormEditable({ command: 'c' }), true);
});

test('JSON validation rejects bad syntax and bad shapes', () => {
  assert.match(parseJsonDoc('{nope').error, /Invalid JSON/);
  assert.ok(parseJsonDoc('[]').error);
  assert.ok(parseJsonDoc('{"mcpServers":{"a":"x"}}').error);
  assert.ok(parseJsonDoc('{"mcpServers":{"a":{"type":"stdio"}}}').error);
  assert.ok(parseJsonDoc('{"mcpServers":{"a":{"type":"http"}}}').error);
  assert.ok(parseJsonDoc('{"mcpServers":{"a":{"type":"sse","url":"u"}}}').error);
  assert.equal(validateDoc({ mcpServers: { a: { command: 'c' } } }), null);
});

test('form validation', () => {
  assert.ok(formError({ ...blankForm(), name: '' }, [], true));
  assert.ok(formError({ ...blankForm(), name: 'a', command: 'c' }, ['a'], true));
  assert.equal(formError({ ...blankForm(), name: 'a', command: 'c' }, [], true), null);
});

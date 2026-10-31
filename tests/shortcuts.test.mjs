import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

function load(path) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => { throw new Error(name); } };
  vm.runInNewContext(output, context);
  return context.exports;
}
const { shortcutAction } = load('../src/utils/shortcuts.ts');
const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods });

test('teclas sueltas: nueva cobertura, traslado, agenda, secciones y ayuda', () => {
  assert.equal(shortcutAction(key('n'), false), 'coverage');
  assert.equal(shortcutAction(key('T'), false), 'transfer');
  assert.equal(shortcutAction(key('a'), false), 'agenda');
  assert.equal(shortcutAction(key('3'), false), 'transfers');
  assert.equal(shortcutAction(key('?'), false), 'help');
  assert.equal(shortcutAction(key('/'), false), 'search');
  assert.equal(shortcutAction(key('x'), false), null);
});

test('escribiendo o con Ctrl/⌘/Alt no se dispara nada, salvo Ctrl+K para buscar', () => {
  assert.equal(shortcutAction(key('n'), true), null);
  assert.equal(shortcutAction(key('/'), true), null);
  assert.equal(shortcutAction(key('n', { ctrlKey: true }), false), null);
  assert.equal(shortcutAction(key('1', { altKey: true }), false), null);
  assert.equal(shortcutAction(key('k', { ctrlKey: true }), true), 'search');
  assert.equal(shortcutAction(key('K', { metaKey: true }), false), 'search');
});

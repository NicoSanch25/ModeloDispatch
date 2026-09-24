import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

async function loadModule(path) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { localDate, periodStart, summarizeOperations } = await loadModule('../src/utils/statistics.ts');
const { safeWebUrl, csvCell } = await loadModule('../src/utils/security.ts');

test('Buenos Aires retains previous day at midnight UTC', () => {
  assert.equal(localDate(new Date('2026-09-25T01:30:00Z')), '2026-09-24');
  assert.equal(periodStart('2026-03-02', 7), '2026-02-24');
  assert.equal(periodStart('2024-03-01', 2), '2024-02-29');
});
test('period boundaries exclude future and older records; suspended excluded from rate', () => {
  const result = summarizeOperations([
    { date: '2026-09-18', status: 'Completed' },
    { date: '2026-09-24', status: 'Pending' },
    { date: '2026-09-24', status: 'Suspended' },
    { date: '2026-09-17', status: 'Completed' },
    { date: '2026-09-25', status: 'Completed' },
  ], [{ date: '2026-09-24', status: 'Completed' }, { date: '2026-09-25', status: 'Pending' }], [
    { date: '2026-09-24', liters: 12.5 }, { date: '2026-09-18', liters: 7.5 }, { date: '2026-09-17', liters: 100 },
  ], '2026-09-24', 7);
  assert.equal(result.coverage, 3);
  assert.equal(result.completionRate, 50);
  assert.equal(result.transfers, 1);
  assert.equal(result.liters, 20);
  assert.equal(result.series.length, 7);
  assert.deepEqual(result.series.at(-1), { date: '2026-09-24', coverage: 2, transfers: 1 });
});
test('empty periods and only suspended services have no invented completion rate', () => {
  assert.equal(summarizeOperations([], [], [], '2026-09-24', 30).completionRate, null);
  assert.equal(summarizeOperations([{ date: '2026-09-24', status: 'Suspended' }], [], [], '2026-09-24', 7).completionRate, null);
});
test('stored links reject executable schemes, credentials and malformed values', () => {
  for (const input of ['javascript:alert(1)', 'data:text/html,test', 'file:///secret', '//evil.test', 'https://user:pass@example.com', 'invalid', undefined]) {
    assert.equal(safeWebUrl(input), undefined);
  }
  assert.equal(safeWebUrl('https://maps.google.com/?q=Buenos%20Aires'), 'https://maps.google.com/?q=Buenos%20Aires');
});

test('CSV escapes delimiters and quotes and neutralizes formulas', () => {
  assert.equal(csvCell('Sede, "Norte"'), '"Sede, ""Norte"""');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('  @SUM(A1)'), '"\'  @SUM(A1)"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell('Normal'), '"Normal"');
});

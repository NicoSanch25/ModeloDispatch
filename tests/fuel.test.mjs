import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

async function loadModule(path) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { sortFuelRecords, shiftMonth, summarizeFuelMonth } = await loadModule('../src/utils/fuel.ts');

const records = [
  { id: 'c', date: '2026-10-01', ambulanceId: 'a1', liters: 40 },
  { id: 'a', date: '2026-10-20', ambulanceId: 'a2', liters: 30.5, items: 'Franela' },
  { id: 'b', date: '2026-09-30', ambulanceId: 'a1', liters: 50 },
  { id: 'd', date: '2026-10-20', ambulanceId: 'a1', liters: 0, items: 'Aceite' },
];

test('combustible ordenado por fecha, más reciente primero', () => {
  assert.deepEqual(sortFuelRecords(records).map(r => r.id), ['d', 'a', 'c', 'b']);
});
test('cambio de mes cruzando años', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-10', 0), '2026-10');
});
test('resumen del mes: el día 1 cuenta en su mes y se filtra por móvil', () => {
  const october = summarizeFuelMonth(records, '2026-10');
  assert.equal(october.liters, 70.5);
  assert.equal(october.loads, 2);
  assert.equal(october.purchases, 2);
  assert.deepEqual(october.byAmbulance, [{ ambulanceId: 'a1', liters: 40 }, { ambulanceId: 'a2', liters: 30.5 }]);
  assert.equal(summarizeFuelMonth(records, '2026-10', 'a1').rows.length, 2);
});

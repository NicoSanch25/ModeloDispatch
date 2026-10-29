import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

async function loadModule(path) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { sortFuelRecords, shiftMonth, summarizeFuelMonth, parseAmount, parseKm, lastOdometer, formatPesos } = await loadModule('../src/utils/fuel.ts');

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
  assert.deepEqual(october.byAmbulance, [{ ambulanceId: 'a1', liters: 40, amount: 0 }, { ambulanceId: 'a2', liters: 30.5, amount: 0 }]);
  assert.equal(summarizeFuelMonth(records, '2026-10', 'a1').rows.length, 2);
});

test('importes como se escriben en un ticket', () => {
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('45000'), 45000);
  assert.equal(parseAmount('45.000'), 45000);
  assert.equal(parseAmount('45.000,50'), 45000.5);
  assert.equal(parseAmount('$ 1.234.567,8'), 1234567.8);
  assert.equal(parseAmount('12.5'), 12.5);
  assert.ok(Number.isNaN(parseAmount('12,5,3')));
  assert.ok(Number.isNaN(parseAmount('-500')));
  assert.ok(Number.isNaN(parseAmount('abc')));
});

test('importes en pesos: sin centavos o con dos decimales', () => {
  const plain = value => formatPesos(value).replace(/\s/g, ' ');
  assert.equal(plain(45000), '$ 45.000');
  assert.equal(plain(98150.5), '$ 98.150,50');
  assert.equal(plain(0), '$ 0');
});

test('kilometraje entero, con o sin puntos', () => {
  assert.equal(parseKm(''), null);
  assert.equal(parseKm('125300'), 125300);
  assert.equal(parseKm('125.300'), 125300);
  assert.ok(Number.isNaN(parseKm('125,3')));
});

test('último kilometraje del móvil: hasta la fecha y sin el movimiento que se corrige', () => {
  const tickets = [
    { id: 't1', date: '2026-10-01', ambulanceId: 'a1', liters: 40, odometerKm: 120000 },
    { id: 't2', date: '2026-10-10', ambulanceId: 'a1', liters: 35, odometerKm: 120800 },
    { id: 't3', date: '2026-10-12', ambulanceId: 'a2', liters: 30, odometerKm: 50000 },
    { id: 't4', date: '2026-10-15', ambulanceId: 'a1', liters: 0, items: 'Franela' },
  ];
  assert.deepEqual(lastOdometer(tickets, 'a1', '2026-10-20'), { km: 120800, date: '2026-10-10' });
  assert.deepEqual(lastOdometer(tickets, 'a1', '2026-10-05'), { km: 120000, date: '2026-10-01' });
  assert.deepEqual(lastOdometer(tickets, 'a1', '2026-10-20', 't2'), { km: 120000, date: '2026-10-01' });
  assert.equal(lastOdometer(tickets, 'a3', '2026-10-20'), null);
});

test('resumen del mes con importes: total, por móvil y movimientos sin importe', () => {
  const tickets = [
    { id: 't1', date: '2026-10-01', ambulanceId: 'a1', liters: 40, amount: 52000 },
    { id: 't2', date: '2026-10-10', ambulanceId: 'a1', liters: 0, items: 'Franela', amount: 3500 },
    { id: 't3', date: '2026-10-12', ambulanceId: 'a2', liters: 30, amount: 39000.5 },
    { id: 't4', date: '2026-10-15', ambulanceId: 'a2', liters: 20 },
  ];
  const october = summarizeFuelMonth(tickets, '2026-10');
  assert.equal(october.amount, 94500.5);
  assert.equal(october.withoutAmount, 1);
  assert.deepEqual(october.byAmbulance, [{ ambulanceId: 'a2', liters: 50, amount: 39000.5 }, { ambulanceId: 'a1', liters: 40, amount: 55500 }]);
});

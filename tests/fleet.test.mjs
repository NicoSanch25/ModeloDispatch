import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, require: name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; } };
  vm.runInNewContext(output, context);
  return context.exports;
}
const licenses = load('../src/utils/licenses.ts');
const { currentKm, serviceStatus, serviceLabel } = load('../src/utils/fleet.ts', { './fuel': load('../src/utils/fuel.ts'), './licenses': licenses });

const today = '2026-10-31';
const ambulance = (maintenance = {}) => ({ id: 'a1', number: '2', isOutsourced: false, maintenance: { status: 'Active', ...maintenance } });
const status = (a, km) => { const s = serviceStatus(a, km, today); return { state: s.state, label: serviceLabel(a, s) }; };

test('kilometraje actual: el mayor entre el cargado en el móvil y el último ticket hasta hoy', () => {
  const fuel = [
    { id: 'f1', date: '2026-10-20', ambulanceId: 'a1', liters: 40, odometerKm: 121150 },
    { id: 'f2', date: '2026-11-05', ambulanceId: 'a1', liters: 40, odometerKm: 125000 },
  ];
  assert.equal(currentKm(ambulance({ mileage: '120.000' }), fuel, today), 121150);
  assert.equal(currentKm(ambulance({ mileage: '130000' }), fuel, today), 130000);
  assert.equal(currentKm(ambulance(), [], today), null);
});

test('service por kilometraje: al día, cerca (1.000 km) y vencido', () => {
  assert.deepEqual(status(ambulance({ nextServiceKm: 130000 }), 121000), { state: 'ok', label: 'Service a los 130.000 km' });
  assert.deepEqual(status(ambulance({ nextServiceKm: 121500 }), 121150), { state: 'soon', label: 'Service en 350 km' });
  assert.deepEqual(status(ambulance({ nextServiceKm: 121000 }), 121150), { state: 'expired', label: 'Service vencido hace 150 km' });
  assert.deepEqual(status(ambulance({ nextServiceKm: 121000 }), null), { state: 'ok', label: 'Service a los 121.000 km' });
});

test('service por fecha y por ambos: manda lo que venza primero', () => {
  assert.deepEqual(status(ambulance({ nextServiceDate: '2026-11-10' }), null), { state: 'soon', label: 'Service en 10 días' });
  assert.deepEqual(status(ambulance({ nextServiceDate: '2026-10-26' }), null), { state: 'expired', label: 'Service vencido hace 5 días' });
  assert.deepEqual(status(ambulance({ nextServiceKm: 140000, nextServiceDate: '2026-10-26' }), 121000), { state: 'expired', label: 'Service vencido hace 5 días' });
  assert.deepEqual(status(ambulance({ nextServiceKm: 121500, nextServiceDate: '2027-05-01' }), 121150), { state: 'soon', label: 'Service en 350 km' });
  assert.deepEqual(status(ambulance(), 121150), { state: 'missing', label: 'Service sin programar' });
});

test('seguro: vencimiento en masculino', () => {
  assert.equal(licenses.expiryLabel(licenses.licenseStatus('2026-10-28', today), 'Seguro', true), 'Seguro vencido hace 3 días');
  assert.equal(licenses.expiryLabel(licenses.licenseStatus('2026-10-30', today), 'VTV'), 'VTV vencida ayer');
});

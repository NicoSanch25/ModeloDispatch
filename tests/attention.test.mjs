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
const scheduling = load('../src/utils/scheduling.ts', { './statistics': load('../src/utils/statistics.ts') });
const agenda = load('../src/utils/agenda.ts', { './scheduling': scheduling, './status': load('../src/utils/status.ts') });
const { overdueServices, conflictedServices, blockedAssignments } = load('../src/utils/attention.ts', { './agenda': agenda });

// Los resultados vienen de otro contexto de vm: se comparan como datos planos.
const plain = value => JSON.parse(JSON.stringify(value));
const at = (date, time) => Date.parse(`${date}T${time}:00-03:00`);
const coverage = (values = {}) => ({ id: 'c', date: '2026-10-31', time: '10:00', durationMinutes: 90, location: 'Club', type: 'Evento', status: 'Confirmed', driverId: 'driver', ambulanceId: 'vehicle', ...values });
const transfer = (values = {}) => ({ id: 't', date: '2026-10-31', origin: 'Base', destination: 'Hospital', status: 'Pending', ...values });

test('servicio sin cerrar: avisa 30 minutos después del fin previsto', () => {
  const rows = agenda.buildAgenda([coverage()], []); // 10:00 a 11:30
  assert.equal(overdueServices(rows, '2026-10-31', at('2026-10-31', '11:55')).length, 0);
  assert.equal(overdueServices(rows, '2026-10-31', at('2026-10-31', '12:05')).length, 1);
});

test('servicio sin cerrar: cerrados y suspendidos no cuentan; sin horario de fin espera al día siguiente', () => {
  const rows = agenda.buildAgenda([coverage({ status: 'Completed' }), coverage({ id: 's', status: 'Suspended' })], [transfer({ departure_base_time: '08:00' })]);
  assert.equal(overdueServices(rows, '2026-10-31', at('2026-10-31', '23:00')).length, 0);
  const next = overdueServices(rows, '2026-11-01', at('2026-11-01', '08:00'));
  assert.deepEqual(plain(next.map(s => s.key)), ['transfer:t']);
});

test('cruces: sólo servicios abiertos de hoy en adelante', () => {
  const rows = agenda.buildAgenda([coverage(), coverage({ id: 'd', time: '11:00' }), coverage({ id: 'old', date: '2026-10-20' }), coverage({ id: 'old2', date: '2026-10-20' })], []);
  assert.deepEqual(plain(conflictedServices(rows, '2026-10-31', at('2026-10-31', '09:00')).map(s => s.key).sort()), ['coverage:c', 'coverage:d']);
});

test('móvil en taller o fuera de servicio con servicios asignados por delante', () => {
  const ambulances = [
    { id: 'vehicle', number: '2', isOutsourced: false, maintenance: { status: 'InRepair' } },
    { id: 'ok', number: '3', isOutsourced: false, maintenance: { status: 'Active' } },
  ];
  const rows = agenda.buildAgenda([coverage({ date: '2026-11-02' }), coverage({ id: 'past', date: '2026-10-20' }), coverage({ id: 'fine', ambulanceId: 'ok' }), coverage({ id: 'done', date: '2026-11-03', status: 'Completed' })], []);
  const blocked = blockedAssignments(rows, ambulances, '2026-10-31', at('2026-10-31', '09:00'));
  assert.deepEqual(plain(blocked.map(b => [b.service.key, b.ambulance.number])), [['coverage:c', '2']]);
});

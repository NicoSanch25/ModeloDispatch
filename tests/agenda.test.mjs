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
const { buildAgenda, servicesForDay, agendaConflicts, shiftAgendaDate } = load('../src/utils/agenda.ts', { './scheduling': scheduling });
const coverage = (values = {}) => ({ id: 'same-id', date: '2026-10-09', time: '18:00', durationMinutes: 90, extensionMinutes: 30, location: 'Club', type: 'Evento', status: 'Confirmed', driverId: 'driver', ambulanceId: 'vehicle', ...values });
const transfer = (values = {}) => ({ id: 'same-id', date: '2026-10-09', origin: 'Base', destination: 'Hospital', departure_base_time: '19:00', arrival_base_time: '21:00', status: 'Pending', driver_id: 'driver', ...values });

test('agenda joins both sources, namespaces IDs and never copies patient information into titles', () => {
  const rows = buildAgenda([coverage()], [transfer({ patient_name: 'Paciente sensible', document_number: '123456' })]);
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].key, rows[1].key);
  assert.equal(rows[1].title, 'Base → Hospital');
  assert.equal(rows[1].ambulanceId, undefined);
  assert.match(rows[1].warnings.join(), /sin reserva/);
  assert.equal(rows[1].source.patient_name, 'Paciente sensible'); // Detail remains in the authorized original record.
});

test('coverage and transfer share a driver; both directions detect the conflict', () => {
  const rows = buildAgenda([coverage()], [transfer()]);
  assert.equal(agendaConflicts(rows[0], rows).length, 1);
  assert.equal(agendaConflicts(rows[1], rows).length, 1);
  assert.equal(agendaConflicts(rows[1], rows)[0].possible, false);
  assert.equal(agendaConflicts(rows[1], rows)[0].staffIds[0], 'driver');
});

test('resource identity crosses crew roles and preserves the 15 minute buffer', () => {
  const rows = buildAgenda([coverage({ driverId: undefined, thirdCrewId: 'driver' })], [transfer({ departure_base_time: '20:14' })]);
  assert.equal(agendaConflicts(rows[0], rows).length, 1);
  const clear = buildAgenda([coverage()], [transfer({ departure_base_time: '20:15' })]);
  assert.equal(agendaConflicts(clear[0], clear).length, 0);
});

test('overnight trips appear on both days and conflict with next-day coverage', () => {
  const rows = buildAgenda([coverage({ date: '2026-10-10', time: '00:30' })], [transfer({ departure_base_time: '23:00', arrival_base_time: '01:00' })]);
  assert.equal(servicesForDay(rows, '2026-10-09').length, 1);
  assert.equal(servicesForDay(rows, '2026-10-10').length, 2);
  assert.equal(agendaConflicts(rows[0], rows).length, 1);
});

test('missing hours do not fabricate a return or hide an uncertain shared driver', () => {
  const rows = buildAgenda([coverage()], [transfer({ departure_base_time: undefined, arrival_base_time: undefined })]);
  const journey = rows.find(row => row.kind === 'transfer');
  assert.equal(journey.start, null);
  assert.equal(journey.end, null);
  assert.equal(agendaConflicts(journey, rows)[0].possible, true);
  assert.equal(servicesForDay(rows, '2026-10-09').length, 2);
  const later = buildAgenda([coverage()], [transfer({ departure_base_time: '21:00', arrival_base_time: undefined })]);
  assert.equal(agendaConflicts(later[0], later).length, 0);
});

test('two trips conflict, while cancelled and completed services never reserve resources', () => {
  const rows = buildAgenda([coverage({ status: 'Suspended' }), coverage({ id: 'done', status: 'Completed' })], [transfer(), transfer({ id: 'second', departure_base_time: '20:00' }), transfer({ id: 'cancel', status: 'Cancelled' })]);
  assert.equal(servicesForDay(rows, '2026-10-09').length, 2);
  assert.equal(servicesForDay(rows, '2026-10-09', true).length, 5);
  assert.equal(agendaConflicts(rows.find(row => row.key === 'transfer:same-id'), rows).length, 1);
});

test('midnight endpoint is exclusive; shifts work across month and year boundaries', () => {
  const rows = buildAgenda([coverage({ time: '23:00', durationMinutes: 60, extensionMinutes: 0 })], []);
  assert.equal(servicesForDay(rows, '2026-10-10').length, 0);
  assert.equal(shiftAgendaDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftAgendaDate('2026-03-01', -1), '2026-02-28');
  assert.equal(servicesForDay(rows, '').length, 0);
});

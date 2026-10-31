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
const { duplicateMatch, duplicateTransfer } = load('../src/utils/duplicate.ts', { './agenda': agenda });
const plain = value => JSON.parse(JSON.stringify(value));

test('duplicar cobertura: una semana después, pendiente, sin avisos ni reporte', () => {
  const copy = plain(duplicateMatch({ id: 'm1', version: 4, date: '2026-10-28', time: '15:00', location: 'Club', type: 'Partido de Polo', durationMinutes: 90, status: 'Completed',
    driverId: 'd', nurseId: 'n', ambulanceId: 'a', driverNotified: true, incidentReport: { hasIncident: true }, auditLog: [{ date: 'x', changes: 'y' }], suspensionReason: 'lluvia' }));
  assert.equal(copy.date, '2026-11-04');
  assert.equal(copy.status, 'Pending');
  assert.equal(copy.time, '15:00');
  assert.deepEqual([copy.driverId, copy.nurseId, copy.ambulanceId], ['d', 'n', 'a']);
  for (const key of ['id', 'version', 'driverNotified', 'incidentReport', 'auditLog', 'suspensionReason']) assert.equal(copy[key], undefined, key);
});

test('duplicar traslado: copia paciente y recorrido, no número de hoja, horas reales ni fecha de creación', () => {
  const copy = plain(duplicateTransfer({ id: 't1', version: 2, created_at: '2026-10-01T10:00:00Z', date: '2026-10-29', transfer_number: '0001', status: 'Completed',
    patient_name: 'Paciente', origin: 'Casa', destination: 'Clínica', driver_id: 'd', departure_base_time: '07:30', arrival_origin_time: '07:50', arrival_base_time: '10:00', kms_driven: 25, observations: 'Llovía',
    planned_start_at: '2026-10-29T07:30:00-03:00' }));
  assert.equal(copy.date, '2026-11-05');
  assert.equal(copy.status, 'Pending');
  assert.deepEqual([copy.patient_name, copy.origin, copy.destination, copy.driver_id, copy.departure_base_time], ['Paciente', 'Casa', 'Clínica', 'd', '07:30']);
  assert.equal(Date.parse(copy.planned_start_at), Date.parse('2026-11-05T07:30:00-03:00'));
  for (const key of ['id', 'version', 'created_at', 'transfer_number', 'arrival_origin_time', 'arrival_base_time', 'kms_driven', 'observations']) assert.equal(copy[key], undefined, key);
});

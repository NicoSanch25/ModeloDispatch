import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, setTimeout, clearTimeout, require: name => {
    if (!(name in dependencies)) throw new Error(`Missing test dependency: ${name}`);
    return dependencies[name];
  } };
  vm.runInNewContext(output, context);
  return context.exports;
}
const statistics = load('../src/utils/statistics.ts');
const scheduling = load('../src/utils/scheduling.ts', { './statistics': statistics });
const { withTimeout } = load('../src/utils/requests.ts');
const match = (changes = {}) => ({ id: 'a', date: '2026-10-09', time: '23:30', durationMinutes: 120, status: 'Confirmed', location: 'Club', fieldNumber: '1', ambulanceId: 'v1', driverId: 'p1', ...changes });

test('coverage conflict crosses midnight and roles, with a symmetric result', () => {
  const a = match();
  const b = match({ id: 'b', date: '2026-10-10', time: '00:15', ambulanceId: 'v2', driverId: undefined, thirdCrewId: 'p1' });
  assert.equal(scheduling.getConflicts(a, [a, b]).hard.length, 1);
  assert.equal(scheduling.getConflicts(b, [a, b]).hard.length, 1);
  assert.equal(scheduling.getConflicts(a, [b]).hard[0].resources[0], 'Chofer');
});
test('different fields cannot silently authorize duplicate resources', () => {
  const result = scheduling.getConflicts(match(), [match({ id: 'b', fieldNumber: '2' })]);
  assert.equal(result.hard.length, 1);
  assert.equal(result.shared.length, 0);
});
test('extension and transition buffer are applied; closed services and unassigned resources do not conflict', () => {
  const a = match({ time: '10:00', durationMinutes: 60, extensionMinutes: 30 });
  assert.equal(scheduling.getConflicts(a, [match({ id: 'b', time: '11:44' })]).hard.length, 1);
  assert.equal(scheduling.getConflicts(a, [match({ id: 'b', time: '11:45' })]).hard.length, 0);
  for (const status of ['Completed', 'Suspended']) assert.equal(scheduling.getConflicts(a, [match({ id: 'b', time: '10:00', status })]).hard.length, 0);
  assert.equal(scheduling.getConflicts(match({ ambulanceId: undefined, driverId: undefined }), [match({ id: 'b', ambulanceId: undefined, driverId: undefined })]).hard.length, 0);
});
test('fleet uses Argentine instants, overnight windows and excludes finished/suspended services', () => {
  const services = [match({ id: 'closed', status: 'Completed' }), match({ id: 'suspended', status: 'Suspended' }), match()];
  assert.equal(scheduling.activeCoverage('v1', services, new Date('2026-10-10T03:45:00Z')).id, 'a');
  assert.equal(scheduling.activeCoverage('v1', services, new Date('2026-10-10T04:30:00Z')), undefined);
  assert.equal(scheduling.activeCoverage('v1', services.slice(0, 2), new Date('2026-10-10T03:45:00Z')), undefined);
});
test('a stalled session check is bounded without disguising errors as success', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 5, 'Sesión sin respuesta'), /Sesión sin respuesta/);
  assert.equal(await withTimeout(Promise.resolve('ok'), 100, 'timeout'), 'ok');
  await assert.rejects(withTimeout(Promise.reject(new Error('network')), 100, 'timeout'), /network/);
});
test('general edit preserves incident and notice fields, while explicit clearing is honored', async () => {
  let payload;
  const fake = { from: () => ({ update: data => {
    payload = data;
    return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'a' }, error: null }) }) }) };
  } }) };
  const { matchesService } = load('../src/services/matches.ts', {
    '../lib/supabase': { supabase: fake }, '../utils/scheduling': scheduling, '../utils/statistics': statistics
  });
  await matchesService.saveMatch({ id: 'a', location: 'Club', type: 'Evento' });
  for (const key of ['has_incident', 'was_transferred', 'incident_details', 'driver_notified', 'nurse_notified', 'ambulance_id', 'driver_id']) assert.equal(Object.hasOwn(payload, key), false, key);
  await matchesService.saveMatch({ id: 'a', ambulanceId: '', driverNotified: false, incidentReport: { hasIncident: false, wasTransferred: false, details: '' } });
  assert.equal(payload.ambulance_id, null);
  assert.equal(payload.driver_notified, false);
  assert.equal(payload.incident_details, '');
});
test('a failed audit insert rejects instead of silently succeeding', async () => {
  const fake = { from: () => ({ insert: async () => ({ error: new Error('audit denied') }) }) };
  const { matchesService } = load('../src/services/matches.ts', {
    '../lib/supabase': { supabase: fake }, '../utils/scheduling': scheduling, '../utils/statistics': statistics
  });
  await assert.rejects(matchesService.addAuditLog('a', 'Cambio'), /audit denied/);
});

test('service helpers delegate to the same scheduling engine used by the dashboard', () => {
  const { matchHelpers } = load('../src/services/matches.ts', {
    '../lib/supabase': { supabase: {} }, '../utils/scheduling': scheduling
  });
  assert.equal(matchHelpers.getConflicts, scheduling.getConflicts);
  assert.equal(matchHelpers.getConflicts(match(), [match({ id: 'b', date: '2026-10-10', time: '00:15' })]).hard.length, 1);
});

test('updates affecting no visible record and failed notice updates reject', async () => {
  const fake = { from: () => ({ update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('not updated') }) }) }) }) }) };
  const { matchesService } = load('../src/services/matches.ts', {
    '../lib/supabase': { supabase: fake }, '../utils/scheduling': scheduling
  });
  await assert.rejects(matchesService.saveMatch({ id: 'missing', type: 'Evento' }), /not updated/);
  await assert.rejects(matchesService.setNotified('a', { driver_notified: true }), /not updated/);
});

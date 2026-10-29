import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

async function loadModule(path) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { searchAll, scoreText } = await loadModule('../src/utils/search.ts');

const data = {
  staff: [{ id: 's1', name: 'José Pérez', role: 'Chofer', phone: '11 5555' }, { id: 's2', name: 'Ana Gómez', role: 'Enfermero/a', phone: '' }],
  ambulances: [{ id: 'a1', number: '22', plate: 'AB123CD', isOutsourced: false }],
  locations: [{ id: 'l1', name: 'Club Palermo' }],
  clients: [{ id: 'c1', name: 'Asociación Polo' }],
  matches: [
    { id: 'm1', date: '2026-10-01', time: '10:00', location: 'Club Palermo', type: 'Evento', status: 'Completed', driverId: 's1' },
    { id: 'm2', date: '2026-10-30', time: '18:00', location: 'Club Palermo', type: 'Evento', status: 'Pending', ambulanceId: 'a1' },
  ],
  transfers: [{ id: 't1', date: '2026-10-29', origin: 'Hospital Italiano', destination: 'Domicilio', status: 'Pending', driver_id: 's1', transfer_number: '0042' }],
};

test('ignora acentos y mayúsculas, exige todas las palabras', () => {
  assert.ok(scoreText('José Pérez', 'jose') > 0);
  assert.equal(scoreText('José Pérez', 'jose gomez'), 0);
  assert.ok(scoreText('Club Palermo', 'pal') > 0);
});
test('busca en todas las entidades y pone primero los servicios próximos', () => {
  const results = searchAll(data, 'palermo', '2026-10-29');
  assert.deepEqual(results.map(r => r.id), ['l1', 'm2', 'm1']);
  assert.ok(searchAll(data, 'jose', '2026-10-29').some(r => r.kind === 'transfer'));
  assert.equal(searchAll(data, '0042', '2026-10-29')[0].id, 't1');
  assert.equal(searchAll(data, 'ab123', '2026-10-29')[0].kind, 'ambulance');
  assert.deepEqual(searchAll(data, 'p', '2026-10-29'), []);
});

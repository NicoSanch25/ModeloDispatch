import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

async function loadModule(path) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { licenseStatus, licenseLabel, licenseAlerts, driverOptionLabel } = await loadModule('../src/utils/licenses.ts');

test('licencia válida hasta el día de vencimiento inclusive', () => {
  assert.deepEqual(licenseStatus('2026-10-22', '2026-10-22'), { state: 'soon', days: 0 });
  assert.deepEqual(licenseStatus('2026-10-21', '2026-10-22'), { state: 'expired', days: -1 });
  assert.equal(licenseLabel(licenseStatus('2026-10-22', '2026-10-22')), 'Licencia vence hoy');
  assert.equal(licenseLabel(licenseStatus('2026-10-12', '2026-10-22')), 'Licencia vencida hace 10 días');
});
test('aviso a 30 días, cruzando meses y años bisiestos', () => {
  assert.equal(licenseStatus('2026-11-21', '2026-10-22').state, 'soon');
  assert.equal(licenseStatus('2026-11-22', '2026-10-22').state, 'ok');
  assert.deepEqual(licenseStatus('2028-03-01', '2028-02-28'), { state: 'soon', days: 2 });
  assert.equal(licenseStatus(undefined, '2026-10-22').state, 'missing');
  assert.equal(licenseStatus('', '2026-10-22').state, 'missing');
});
test('alertas sólo para choferes, ordenadas por urgencia', () => {
  const staff = [
    { id: '1', name: 'Ana', role: 'Chofer', licenseExpiration: '2026-10-01' },
    { id: '2', name: 'Beto', role: 'Chofer', licenseExpiration: '2026-09-01' },
    { id: '3', name: 'Caro', role: 'Chofer', licenseExpiration: '2026-11-01' },
    { id: '4', name: 'Dani', role: 'Chofer' },
    { id: '5', name: 'Eli', role: 'Enfermero/a', licenseExpiration: '2020-01-01' },
    { id: '6', name: 'Fede', role: 'Chofer', licenseExpiration: '2027-10-01' },
  ];
  const alerts = licenseAlerts(staff, '2026-10-22');
  assert.deepEqual(alerts.expired.map(a => a.person.name), ['Beto', 'Ana']);
  assert.deepEqual(alerts.soon.map(a => a.person.name), ['Caro']);
  assert.deepEqual(alerts.missing.map(a => a.person.name), ['Dani']);
});
test('la opción de chofer avisa si la licencia vence antes del servicio', () => {
  const person = { id: '1', name: 'Ana', role: 'Chofer', licenseExpiration: '2026-10-30' };
  assert.equal(driverOptionLabel(person, '2026-10-30'), 'Ana');
  assert.equal(driverOptionLabel(person, '2026-10-31'), 'Ana · ⚠ licencia vencida');
  assert.equal(driverOptionLabel({ ...person, isOutsourced: true }, '2026-10-31'), 'Ana (Ext) · ⚠ licencia vencida');
});
test('la migración agrega las columnas de licencia y es repetible', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`create table public.staff(id uuid primary key default gen_random_uuid(), name text, role text);`);
  const sql = readFileSync(new URL('../supabase/migrations/202610220004_staff_driver_license.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  await db.query(`insert into public.staff(name, role, license_number, license_category, license_expiration) values ('Ana', 'Chofer', '301', 'D1', '2026-10-30')`);
  const { rows } = await db.query(`select license_expiration::text as exp, license_category from public.staff`);
  assert.deepEqual(rows, [{ exp: '2026-10-30', license_category: 'D1' }]);
  await db.close();
});

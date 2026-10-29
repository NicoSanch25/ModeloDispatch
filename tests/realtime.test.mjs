import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('la migración de tiempo real publica las tablas existentes y es repetible', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  await db.exec(`create table public.matches(id int primary key); create table public.staff(id int primary key);`);
  const sql = readFileSync(new URL('../supabase/migrations/202610290005_realtime_publication.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  const { rows } = await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by tablename`);
  assert.deepEqual(rows.map(r => r.tablename), ['matches', 'staff']);
  await db.close();
});

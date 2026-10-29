// Used only by the isolated UI server. Never imported by the production build.
import { localDate } from '../../src/utils/statistics';

const params = new URLSearchParams(window.location.search);
const session = { user: { id: 'test-user', email: 'fixture@example.invalid' } };
const today = localDate();
const shift = (days: number) => localDate(new Date(Date.now() + days * 86_400_000));
const database: Record<string, any[]> = {
  staff: [
    { id: 'driver', name: 'Chofer de prueba', role: 'Chofer', license_number: '30111222', license_category: 'D1', license_expiration: shift(-12) },
    { id: 'driver-soon', name: 'Chofer por vencer', role: 'Chofer', license_category: 'D1', license_expiration: shift(9) },
    { id: 'driver-ok', name: 'Chofer al día', role: 'Chofer', license_category: 'D2', license_expiration: shift(400) },
    { id: 'nurse', name: 'Enfermero de prueba', role: 'Enfermero/a' },
    { id: 'doctor', name: 'Profesional de prueba', role: 'Médico/a' }
  ],
  ambulances: [{ id: 'vehicle', number: 'Prueba', maintenance_status: 'Active' }],
  locations: [{ id: 'location', name: 'Sede de prueba' }],
  clients: [{ id: 'client', name: 'Cliente de prueba' }],
  matches: [{ id: 'match', date: today, time: '18:00', duration_minutes: 90, extension_minutes: 30, location: 'Sede de prueba', field_number: '1', type: 'Evento', status: 'Confirmed', ambulance_id: 'vehicle', driver_id: 'driver', nurse_id: 'nurse', driver_notified: true, nurse_notified: true, has_incident: true, was_transferred: true, incident_details: 'Incidente ficticio conservado', audit_logs: [] }],
  fuel_records: [
    { id: 'f-b', date: shift(-1), ambulance_id: 'vehicle', driver_id: 'driver-ok', fuel_type: 'Euro Diesel', liters: 40, items: null },
    { id: 'f-a', date: today, ambulance_id: 'vehicle', driver_id: 'driver-soon', fuel_type: 'Euro Diesel', liters: 35.5, items: 'Agua destilada' },
    { id: 'f-c', date: shift(-20), ambulance_id: 'vehicle', driver_id: null, external_driver_name: 'Chofer externo', fuel_type: 'Diesel', liters: 0, items: 'Franela' }
  ], transfers: params.get('agenda') ? [
    { id: 'journey', date: today, transfer_number: 'PRUEBA-1', driver_id: 'driver', origin: 'Base de prueba', destination: 'Hospital de prueba', departure_base_time: '19:00', arrival_base_time: '21:00', status: 'Pending' },
    { id: 'unscheduled', date: today, transfer_number: 'PRUEBA-2', origin: 'Sede sin horario', destination: 'Destino de prueba', status: 'Pending' },
    { id: 'closed', date: today, origin: 'Traslado finalizado', destination: 'Base', status: 'Completed' }
  ] : [], audit_logs: []
};

class Query implements PromiseLike<any> {
  private action = 'read';
  private payload: any;
  private filters: [string, any][] = [];
  private one = false;
  constructor(private table: string) {}
  select(_columns?: string) { return this; }
  order(_column: string, _options?: any) { return this; }
  range(_start: number, _end: number) { return this; }
  eq(key: string, value: any) { this.filters.push([key, value]); return this; }
  update(payload: any) { this.action = 'update'; this.payload = payload; return this; }
  insert(payload: any) { this.action = 'insert'; this.payload = payload; return this; }
  delete() { this.action = 'delete'; return this; }
  single() { this.one = true; return this; }
  then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
  private async execute() {
    if (window.location.pathname.includes('business-harness')) return (await fetch(`/__business_fixture/table?name=${encodeURIComponent(this.table)}`)).json();
    if (this.action !== 'read') {
      await new Promise(resolve => setTimeout(resolve, params.get('delay') ? 1_000 : 10));
      if (params.get('fail') === this.table) return { data: null, error: new Error('Fallo ficticio de guardado') };
    }
    let rows = database[this.table] || [];
    const selected = rows.filter(row => this.filters.every(([key, value]) => row[key] === value));
    if (this.action === 'update') selected.forEach(row => Object.assign(row, this.payload));
    if (this.action === 'insert') {
      const values = Array.isArray(this.payload) ? this.payload : [this.payload];
      rows = values.map(value => ({ id: crypto.randomUUID(), ...value }));
      database[this.table].push(...rows);
    } else if (this.action === 'delete') {
      database[this.table] = rows.filter(row => !selected.includes(row));
    } else {
      rows = selected;
    }
    if (this.action !== 'read') {
      document.documentElement.dataset.fixtureWrites = String(Number(document.documentElement.dataset.fixtureWrites || 0) + 1);
      document.documentElement.dataset.fixtureIncident = database.matches[0]?.incident_details || '';
      document.documentElement.dataset.fixtureNotified = String(database.matches[0]?.driver_notified);
    }
    return { data: this.one ? rows[0] || null : rows, error: this.one && rows.length !== 1 ? new Error('Sin registro') : null };
  }
}

export const configurationError = false;
export const supabase = {
  rpc: async (action: string, payload: any) => (await fetch('/__business_fixture/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload})})).json(),
  from: (table: string) => new Query(table),
  auth: {
    getSession: async () => params.get('session') === 'stall' ? new Promise<any>(() => {}) : { data: { session }, error: null },
    onAuthStateChange: (callback: (event: string, value: any) => void) => {
      if (params.get('session') !== 'stall') queueMicrotask(() => callback('INITIAL_SESSION', session));
      return { data: { subscription: { unsubscribe() {} } } };
    },
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
    signInWithPassword: async () => ({ data: { session }, error: null }),
    signUp: async () => ({ data: { session }, error: null })
  }
};

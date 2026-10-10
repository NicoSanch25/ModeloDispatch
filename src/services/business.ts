import { supabase } from '../lib/supabase';
import { withTimeout } from '../utils/requests';

export type ServiceState = 'scheduled' | 'en_route' | 'in_service' | 'finished' | 'returning' | 'closed' | 'cancelled';
export interface Service {
 id: string; number: number; kind: 'coverage' | 'transfer'; coverage_id?: string; transfer_id?: string;
 title: string; date: string; start_at?: string; end_at?: string; client_id?: string;
 ambulance_id?: string; crew: string[]; state: ServiceState; performed: boolean; reviewed: boolean;
 agreed_cents: number | null; version: number;
}
export interface Cost { id: string; service_id: string; category: string; description: string; date: string; cents: number; voided: boolean; void_reason?: string }
export interface QuoteSnapshot {
 title: string; client_name?: string; client_id: string; kind: 'coverage' | 'transfer'; date: string; time: string;
 duration_minutes: number; origin?: string; destination?: string; terms?: string; valid_until: string;
 cents: number; estimated_cost_cents: number; kilometers?: string; km_rate?: string; hours?: string; hour_rate?: string; extras?: string; margin?: string;
}
export interface Quote { id: string; number: number; client_id: string; kind: 'coverage' | 'transfer'; state: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'; version: number; service_id?: string }
export interface QuoteVersion { quote_id: string; version: number; snapshot: QuoteSnapshot; cents: number; estimated_cost_cents: number; valid_until: string }
export interface BillingDocument { id: string; number: number; client_id: string; client_name: string; date: string; due_date: string; total_cents: number; external_reference?: string; voided: boolean; void_reason?: string }
export interface BillingLine { id: string; document_id: string; service_id: string; description: string; cents: number; active: boolean }
export interface Payment { id: string; document_id: string; date: string; cents: number; method: string; reference?: string; voided: boolean; void_reason?: string }
export interface ResourceBlock { id: string; ambulance_id?: string; staff_id?: string; start_at: string; end_at: string; reason: string; voided: boolean }
export interface ServiceEvent { id: string; service_id?: string; type: string; recorded_at: string; details: {state?: string; cents?: number; id?: string; before?: unknown; after?: unknown} }
export interface BusinessData { finance: boolean; services: Service[]; costs: Cost[]; quotes: Quote[]; versions: QuoteVersion[]; documents: BillingDocument[]; lines: BillingLine[]; payments: Payment[]; blocks: ResourceBlock[]; events: ServiceEvent[] }

const tables = ['services','service_costs','quotes','quote_versions','billing_documents','billing_lines','payments','resource_blocks','service_events'] as const;
// Supabase caps individual reads. Load explicit pages so growing records never silently disappear.
async function rows(table: string,columns='*') {
 const result: unknown[] = [];
 for (let offset=0; ; offset+=500) {
  const primary=table==='quote_versions'?'quote_id':'id';
  let query=supabase.from(table).select(columns).order(primary).range(offset,offset+499);
  if(table==='quote_versions') query=query.order('version');
  const {data,error}=await withTimeout(query,20_000,'La consulta tardó demasiado. Volvé a actualizar.');
  if(error) throw error;
  result.push(...(data??[]));
  if(!data || data.length<500) return result;
 }
}
export async function fetchServiceRegistry() { return await rows('services') as Service[]; }
export async function fetchOperationalTable(table: string,columns='*') {return {data:await rows(table,columns) as any[],error:null};}
export async function fetchBusiness(): Promise<BusinessData> {
 const {data:capabilities,error}=await withTimeout(supabase.rpc('dispatch_capabilities'),20_000,'No se pudieron verificar los permisos.');
 if(error) throw error;
 if(!capabilities?.operator) throw new Error('Tu cuenta no está habilitada para operar.');
 const [services,costs,quotes,versions,documents,lines,payments,blocks,events]=await Promise.all(tables.map(table=>rows(table)));
 return {finance:!!capabilities.finance,services,costs,quotes,versions,documents,lines,payments,blocks,events} as BusinessData;
}
export async function businessCommand(action: string, data: object, requestId: string) {
 const {data:result,error}=await withTimeout(supabase.rpc('dispatch_command',{p_action:action,p_data:data,p_request_id:requestId}),25_000,'No llegó la confirmación. Reintentá la misma operación para comprobarla sin duplicarla.');
 if(error) throw error;
 return result as {id: string; ok: boolean};
}
export const stateLabel: Record<ServiceState,string> = {scheduled:'Programado',en_route:'En camino',in_service:'En servicio',finished:'Finalizó · regreso pendiente',returning:'Regresando',closed:'Cerrado',cancelled:'Cancelado'};
export const nextStates: Record<ServiceState,ServiceState[]> = {scheduled:['en_route','in_service','cancelled'],en_route:['in_service','cancelled'],in_service:['finished','returning'],finished:['returning','closed'],returning:['closed'],closed:[],cancelled:[]};
export const quoteLabel: Record<Quote['state'],string> = {draft:'Borrador',sent:'Enviado',accepted:'Aceptado',rejected:'Rechazado',expired:'Vencido'};

export function cents(value: string): number {
 const normalized=value.trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new Error('Ingresá un importe positivo con hasta dos decimales, sin separador de miles.');
 const [whole,decimal='']=normalized.split('.');
 const n=Number(whole)*100+Number(decimal.padEnd(2,'0'));
 if(!Number.isSafeInteger(n) || n>100000000000000) throw new Error('Importe fuera de rango.');
 return n;
}
export function money(value: number | null | undefined) {return value==null?'Sin precio':new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(value/100);}
export function balance(document: BillingDocument,payments: Payment[]) {return document.voided?0:document.total_cents-payments.filter(p=>p.document_id===document.id&&!p.voided).reduce((sum,p)=>sum+p.cents,0);}
export function realCost(serviceId: string,costs: Cost[]) {return costs.filter(c=>c.service_id===serviceId&&!c.voided).reduce((sum,c)=>sum+c.cents,0);}
export function suggestedPrice(cost: number,margin: number) {
 if(!Number.isFinite(cost)||cost<0||!Number.isFinite(margin)||margin<0||margin>=100) throw new Error('El margen debe estar entre 0 y menos de 100%.');
 return Math.round(cost/(1-margin/100));
}

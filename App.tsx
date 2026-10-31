import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Ambulance, Users, Plus, AlertTriangle, Trash2, Edit2,
  Check, X, Calendar, MapPin, Filter, Truck,
  History, Car, Stethoscope, Phone, User,
  FileText, ClipboardCheck, AlertCircle,
  ArrowRightCircle, ClipboardList, Briefcase, History as HistoryIcon, ArrowRight,
  Fuel, ListPlus, UserPlus, 
  AlertOctagon, Building, FileSpreadsheet, Ban, Zap, Mail,
  Lock, LogIn, Loader2, Key, Eye, EyeOff, IdCard, Search, ShieldCheck, Wrench
} from 'lucide-react';
import {
  
  Staff as StaffModel,
  Ambulance as AmbulanceModel,
  Match as MatchModel,
  
  Location as LocationModel,
  
  IncidentReport as IncidentReportModel,
  
  FuelRecord as FuelRecordModel,
  Client as ClientModel,
  Transfer as TransferModel
} from './src/types';
import { supabase, configurationError } from './src/lib/supabase';
import { AttentionAlerts, OperationsInsights } from './src/components/OperationsInsights';
import { localDate } from './src/utils/statistics';
import { expiryLabel, licenseAlerts, licenseLabel, licenseStatus, needsLicense } from './src/utils/licenses';
import { getConflicts } from './src/utils/scheduling';
import { friendlyError, withTimeout } from './src/utils/requests';
import { mapMatchFromDB, matchesService } from './src/services/matches';
import { mapAmbulanceFromDB, mapClientFromDB, mapFuelFromDB, mapLocationFromDB, mapStaffFromDB } from './src/services/resources';
import { AgendaList } from './src/components/AgendaList';
import { applyServiceRegistry, buildAgenda, servicesForDay, type AgendaService } from './src/utils/agenda';
import { conflictedServices } from './src/utils/attention';
import { currentKm, EXPIRY_CHIP, serviceLabel, serviceStatus } from './src/utils/fleet';
import { fetchOperationalTable, fetchServiceRegistry, type Service } from './src/services/business';
import { csvCell } from './src/utils/security';

import { FuelList } from './src/components/FuelList';
import { EmptyState, LoadingSkeleton } from './src/components/ui/Skeleton';
import { FleetStatusWidget } from './src/components/FleetStatusWidget';
import { DashboardClock } from './src/components/DashboardClock';
import { MobileTabBar, SECTIONS, sectionTitle, type SectionId } from './src/components/AppNavigation';
import { TransfersList } from './src/components/TransfersList';
import type { SearchResult } from './src/utils/search';
import { StatusChip } from './src/components/ui/StatusChip';
import { MATCH_STATUS } from './src/utils/status';
const BusinessWorkspace = React.lazy(() => import('./src/components/BusinessWorkspace').then(module => ({ default: module.BusinessWorkspace })));
import type { QuickAddRow } from './src/components/modals/QuickAddModal';
import { askConfirm, FeedbackHost, notify, useSpanishValidation } from './src/components/ui/feedback';

// Los modales se descargan aparte: la pantalla principal aparece antes y se precargan en segundo plano.
const modalLoaders: (() => Promise<unknown>)[] = [];
function lazyModal<T extends React.ComponentType<any>>(load: () => Promise<T>): T {
  const Lazy = React.lazy(async () => ({ default: await load() }));
  modalLoaders.push(load);
  const Wrapped = (props: React.ComponentProps<T>) => <React.Suspense fallback={null}><Lazy {...props} /></React.Suspense>;
  return Wrapped as unknown as T;
}
const preloadModals = () => modalLoaders.forEach(load => load().catch(() => undefined));
const MatchModal = lazyModal(() => import('./src/components/modals/MatchModal').then(m => m.MatchModal));
const StaffModal = lazyModal(() => import('./src/components/modals/StaffModal').then(m => m.StaffModal));
const AmbulanceModal = lazyModal(() => import('./src/components/modals/AmbulanceModal').then(m => m.AmbulanceModal));
const LocationModal = lazyModal(() => import('./src/components/modals/LocationModal').then(m => m.LocationModal));
const LocationDetailModal = lazyModal(() => import('./src/components/modals/LocationDetailModal').then(m => m.LocationDetailModal));
const AmbulanceDetailModal = lazyModal(() => import('./src/components/modals/AmbulanceDetailModal').then(m => m.AmbulanceDetailModal));
const ClientModal = lazyModal(() => import('./src/components/modals/ClientModal').then(m => m.ClientModal));
const TransferModal = lazyModal(() => import('./src/components/modals/TransferModal').then(m => m.TransferModal));
const FuelBatchModal = lazyModal(() => import('./src/components/modals/FuelBatchModal').then(m => m.FuelBatchModal));
const AuditModal = lazyModal(() => import('./src/components/modals/AuditModal').then(m => m.AuditModal));
const ChangePasswordModal = lazyModal(() => import('./src/components/modals/ChangePasswordModal').then(m => m.ChangePasswordModal));
const IncidentModal = lazyModal(() => import('./src/components/modals/IncidentModal').then(m => m.IncidentModal));
const StaffHistoryModal = lazyModal(() => import('./src/components/modals/StaffHistoryModal').then(m => m.StaffHistoryModal));
const StaffScheduleModal = lazyModal(() => import('./src/components/modals/StaffScheduleModal').then(m => m.StaffScheduleModal));
const GlobalSearch = lazyModal(() => import('./src/components/GlobalSearch').then(m => m.GlobalSearch));
const OperationalAgendaModal = lazyModal(() => import('./src/components/modals/OperationalAgendaModal').then(m => m.OperationalAgendaModal));
const QuickAddModal = lazyModal(() => import('./src/components/modals/QuickAddModal').then(m => m.QuickAddModal));

// --- HELPERS ---
const formatDateFull = (dateStr?: string) => dateStr ? dateStr.slice(0, 10).split('-').reverse().join('/') : '--/--/----';

const formatDateAR = (dateStr?: string) => {
  if (!dateStr) return '--/--';
  const parts = dateStr.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
};

const getMonthLabel = (dateStr: string) => {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};

const formatTime24 = (timeStr?: string) => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const [h, m] = parts;
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
  return timeStr;
};

const timeToMinutes = (timeStr?: string) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const minutesToTime = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const calculateEndTime = (timeStr: string, durationMin: number, extensionMin: number = 0) => {
  const start = timeToMinutes(timeStr);
  const end = start + durationMin + extensionMin;
  return minutesToTime(end);
};


const downloadCSV = (data: any[], filename: string) => {
  const csvContent = '\uFEFF' + data.map(row => row.map(csvCell).join(',')).join('\r\n');
  const encodedUri = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(encodedUri), 1000);
};

// Returns an icon based on vehicle type
const getAmbulanceIcon = (vehicleType?: string, className: string = "w-6 h-6") => {
  const type = (vehicleType || '').toLowerCase();
  const smallVehicles = ['kangoo', 'partner', 'berlingo', 'caddy', 'fiorino', 'saveiro', 'courrier'];
  if (smallVehicles.some(v => type.includes(v))) {
    return <Car className={className} />;
  }
  return <Ambulance className={className} />;
};

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

const SectionHeader = ({ eyebrow, title, description, icon: Icon, actions }: SectionHeaderProps) => (
  <section className={`dispatch-section-header ${actions ? '' : 'hidden lg:flex'}`} aria-labelledby={`section-${eyebrow.replace(/\s+/g, '-').toLowerCase()}`}>
    <div className="hidden min-w-0 items-start gap-3 lg:flex">
      <div className="dispatch-section-icon"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="dispatch-eyebrow">{eyebrow}</p>
        <h2 id={`section-${eyebrow.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
    </div>
    <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
      {actions}
    </div>
  </section>
);

// LOGIN COMPONENT
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Internal helper to create the "fake" email Supabase needs
  const getInternalEmail = () => {
    // Sanitize username: remove spaces, lowercase, special chars
    const sanitizedUser = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    // Using @dispatch.app as per original SQL instructions to match manually created users
    return `${sanitizedUser}@dispatch.app`;
  };

  const handleAuth = async () => {
    if (!username.trim() || !password) { setError('Completá usuario y contraseña.'); return; }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: getInternalEmail(), password });
      if (error) { setError('No se pudo ingresar. Verificá tus credenciales o consultá al administrador.'); return; }
      onLogin();
    } catch {
      setError('No se pudo conectar. Intentá nuevamente.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-xl p-4">
            <img src="/logo.png" alt="Logo" className="h-24 w-auto object-contain" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Modelo Dispatch</h2>
        <p className="text-center text-slate-500 mb-8">Acceso al Sistema</p>

        {error && <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg text-center mb-6 border border-red-200 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                autoComplete="username"
                placeholder="NombreUsuario"
                autoCapitalize="none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                autoComplete="current-password"
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleAuth(); }}
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => handleAuth()}
              disabled={loading}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-bold hover:bg-emerald-800 transition-colors flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ingresar'}
            </button>
            <p className="text-center text-xs text-slate-500 mt-4">
              Sistema privado. Si necesita acceso, contacte al administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  useSpanishValidation();

  // Check auth session
  useEffect(() => {
    let mounted = true;
    let observedSession = false;
    if (configurationError) { setIsLoadingSession(false); return; }
    withTimeout(supabase.auth.getSession(), 12_000, 'La conexión no respondió').then(({ data: { session }, error }) => {
      if (!mounted || observedSession) return;
      if (error) throw error;
      setSession(session);
      setIsLoadingSession(false);
    }).catch(() => {
      if (!mounted || observedSession) return;
      setSessionError(true);
      setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      observedSession = true;
      setSession(session);
      setSessionError(false);
      setIsLoadingSession(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  if (configurationError) return <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-slate-50"><div className="max-w-md rounded-2xl border bg-white p-6"><h1 className="font-bold text-xl">Configuración pendiente</h1><p className="text-slate-600 mt-2">Falta configurar la conexión del sistema. Contactá al administrador.</p></div></div>;

  if (sessionError && !session) return <div role="alert" className="min-h-screen flex items-center justify-center p-6 bg-slate-50"><div className="max-w-md rounded-2xl border bg-white p-6"><h1 className="font-bold text-xl">No pudimos comprobar la sesión</h1><p className="text-slate-600 mt-2">Revisá la conexión y volvé a intentar.</p><button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white">Reintentar</button></div></div>;

  if (!session) return <LoginScreen onLogin={() => { 
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSession(session);
      else window.location.reload();
    });
  }} />;

  return <><MainApp key={session.user.id} session={session} /><FeedbackHost /></>;
}

function MainApp({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<SectionId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [matches, setMatches] = useState<MatchModel[]>([]);
  const [staff, setStaff] = useState<StaffModel[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceModel[]>([]);
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecordModel[]>([]);
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [transfers, setTransfers] = useState<TransferModel[]>([]);
  const [serviceRegistry, setServiceRegistry] = useState<Service[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  // Sólo la primera carga tapa la pantalla; al actualizar se mantiene lo visible.
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Modals State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Partial<TransferModel> | null>(null);

  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<MatchModel> | null>(null);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffModel> | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffModel | null>(null);

  const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<Partial<AmbulanceModel> | null>(null);

  // Dynamic Form State for Ambulance

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<LocationModel> | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClientModel> | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientModel | null>(null);

  const [viewingLocation, setViewingLocation] = useState<LocationModel | null>(null);
  const [viewingAmbulance, setViewingAmbulance] = useState<AmbulanceModel | null>(null);

  const [reportingMatch, setReportingMatch] = useState<MatchModel | null>(null);

  const [viewingAuditMatch, setViewingAuditMatch] = useState<MatchModel | null>(null);

  const [isBatchFuelModalOpen, setIsBatchFuelModalOpen] = useState(false);
  const [editingFuel, setEditingFuel] = useState<FuelRecordModel | null>(null);

  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [isStaffScheduleOpen, setIsStaffScheduleOpen] = useState(false);
  const [dailyAgendaDate, setDailyAgendaDate] = useState<string>(localDate());

  // Quick Add State
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string>('');
  const [quickAddRows, setQuickAddRows] = useState<QuickAddRow[]>([]);


  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userName: string = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || '';

  // «/» o Ctrl+K abren la búsqueda cuando no se está escribiendo en un campo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if ((event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
        if (document.querySelector('[aria-modal="true"]')) return;
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Filters State
  const [filters, setFilters] = useState({
    location: '',
    ambulance: '',
    outsourced: 'all' as 'all' | 'yes' | 'no',
    startDate: '',
    endDate: '',
    clientId: '',
    staffId: '',
    status: 'all' as 'all' | 'Pending' | 'Confirmed' | 'Completed' | 'Suspended'
  });

  const [showFilters, setShowFilters] = useState(false);

  // --- DATA LOADING ---
  // Una sola lectura a la vez: los pedidos que llegan mientras otra corre se agrupan en
  // una lectura siguiente, así nunca se pisa un dato nuevo con una respuesta vieja.
  const loader = useRef<{ current: Promise<void>; queued: Promise<void> | null }>({ current: Promise.resolve(), queued: null });
  const lastLoadedAt = useRef(0);
  const loadData = (silent?: unknown): Promise<void> => {
    const state = loader.current;
    if (state.queued) return state.queued;
    const next = state.current.then(() => { state.queued = null; return fetchAll(silent === true); });
    state.queued = next;
    state.current = next;
    return next;
  };
  const fetchAll = async (silent: boolean) => {
    if (!silent) setIsLoadingData(true);
    try {
      const [
        { data: staffData, error: e1 },
        { data: ambData, error: e2 },
        { data: locData, error: e3 },
        { data: clientData, error: e4 },
        { data: matchData, error: e5 },
        { data: fuelData, error: e6 },
        { data: transfersData, error: e7 }, registry
      ] = await withTimeout(Promise.all([
        fetchOperationalTable('staff'),
        fetchOperationalTable('ambulances'),
        fetchOperationalTable('locations'),
        fetchOperationalTable('clients'),
        fetchOperationalTable('matches','*, audit_logs(*)'),
        fetchOperationalTable('fuel_records'),
        fetchOperationalTable('transfers'),
        fetchServiceRegistry()
      ]), 20_000, 'No se pudieron actualizar los datos a tiempo.');

      if (e1 || e2 || e3 || e4 || e5 || e6 || e7) {
        throw new Error("Una de las consultas falló o la sesión expiró.");
      }

      if (staffData && staffData.length >= 0) setStaff(staffData.map(mapStaffFromDB));
      if (ambData && ambData.length >= 0) setAmbulances(ambData.map(mapAmbulanceFromDB));
      if (locData && locData.length >= 0) setLocations(locData.map(mapLocationFromDB));
      if (clientData && clientData.length >= 0) setClients(clientData.map(mapClientFromDB));
      if (matchData && matchData.length >= 0) setMatches(matchData.map(mapMatchFromDB));
      if (fuelData && fuelData.length >= 0) setFuelRecords(fuelData.map(mapFuelFromDB));
      if (transfersData && transfersData.length >= 0) setTransfers(transfersData as TransferModel[]);
      setServiceRegistry(registry);
      setDataError(null);
      lastLoadedAt.current = Date.now();
    } catch (error) {
      console.error("Error loading data:", error);
      setDataError("No se pudieron actualizar los datos. Revisá la conexión y tus permisos de acceso. Los datos visibles pueden estar desactualizados.");
    } finally {
      setIsLoadingData(false);
      setHasLoadedData(true);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(preloadModals, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Cambios de otros operadores: tiempo real si la base lo publica y, como respaldo,
  // relectura al volver a la pestaña y cada dos minutos mientras está visible.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { clearTimeout(timer); timer = setTimeout(() => loadData(true), 800); };
    const stale = () => document.visibilityState === 'visible' && Date.now() - lastLoadedAt.current > 30_000 && loadData(true);
    const channel = typeof supabase.channel === 'function'
      ? ['matches', 'transfers', 'staff', 'ambulances', 'fuel_records', 'locations', 'clients', 'services']
        .reduce((ch, table) => ch.on('postgres_changes' as any, { event: '*', schema: 'public', table }, soon), supabase.channel('dispatch-changes'))
        .subscribe()
      : null;
    const interval = setInterval(() => document.visibilityState === 'visible' && Date.now() - lastLoadedAt.current > 110_000 && loadData(true), 120_000);
    document.addEventListener('visibilitychange', stale);
    window.addEventListener('online', soon);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', stale);
      window.removeEventListener('online', soon);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // --- Derived Data ---
  const futureMatches = matches.filter(m => m.status !== 'Completed').sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const agendaServices = useMemo(() => applyServiceRegistry(buildAgenda(matches, transfers),serviceRegistry), [matches, transfers,serviceRegistry]);
  const openBusinessService = (service: Service) => {
    if (service.kind === 'coverage') {
      const source = matches.find(m => m.id === service.coverage_id);
      if (!source) { setDataError('El servicio no está en la vista actual. Actualizá los datos antes de editar.'); return; }
      setEditingMatch(source); setIsMatchModalOpen(true);
    } else {
      const source = transfers.find(t => t.id === service.transfer_id);
      if (!source) { setDataError('El traslado no está en la vista actual. Actualizá los datos antes de editar.'); return; }
      setEditingTransfer(source); setIsTransferModalOpen(true);
    }
  };
  const superpositionCount = useMemo(() => conflictedServices(agendaServices, localDate(), Date.now()).length, [agendaServices]);
  const openAgendaService = (service: AgendaService) => {
    setIsDailyAgendaOpen(false);
    if (service.kind === 'coverage') {
      setEditingMatch(service.source as MatchModel);
      setIsMatchModalOpen(true);
    } else {
      setEditingTransfer(service.source as TransferModel);
      setIsTransferModalOpen(true);
    }
  };

  // Cruces de coberturas activas, calculados una vez por cambio de datos y no en cada render de tarjeta.
  const coverageConflicts = useMemo(() => {
    const result = new Map<string, ReturnType<typeof getConflicts>>();
    matches.forEach(m => { if (m.status !== 'Completed' && m.status !== 'Suspended') result.set(m.id, getConflicts(m, matches)); });
    return result;
  }, [matches]);

  const filteredMatches = (activeTab === 'history' ? matches : futureMatches).filter(m => {
    if (activeTab === 'history' && m.status !== 'Completed' && m.status !== 'Suspended') return false;
    if (activeTab === 'matches' && m.status === 'Completed') return false;

    const amb = ambulances.find(a => a.id === m.ambulanceId);

    if (filters.location && !m.location.toLowerCase().includes(filters.location.toLowerCase())) return false;

    if (filters.ambulance) {
      if (!amb) return false;
      const label = `Móvil ${amb.number}`;
      if (!label.toLowerCase().includes(filters.ambulance.toLowerCase())) return false;
    }

    if (filters.outsourced !== 'all') {
      const isOut = amb?.isOutsourced || false;
      if (filters.outsourced === 'yes' && !isOut) return false;
      if (filters.outsourced === 'no' && isOut) return false;
    }

    if (filters.startDate && m.date < filters.startDate) return false;
    if (filters.endDate && m.date > filters.endDate) return false;
    if (filters.clientId && m.clientId !== filters.clientId) return false;
    if (filters.status !== 'all' && m.status !== filters.status) return false;
    if (filters.staffId) {
      if (m.driverId !== filters.staffId && m.nurseId !== filters.staffId && m.thirdCrewId !== filters.staffId) return false;
    }

    return true;
  });

  // --- Handlers ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleExportCSV = () => {
    const headers = ["Fecha", "Hora", "Lugar", "Cancha", "Tipo", "Cliente", "Estado", "Móvil", "Chofer", "Enfermero", "Incidente"];
    const rows = filteredMatches.map(m => {
      const amb = ambulances.find(a => a.id === m.ambulanceId);
      const drv = staff.find(s => s.id === m.driverId);
      const nur = staff.find(s => s.id === m.nurseId);
      const cli = clients.find(c => c.id === m.clientId);

      return [
        m.date,
        m.time,
        m.location,
        m.fieldNumber || '',
        m.type,
        cli?.name || m.hiredBy || '',
        m.status,
        amb ? `Móvil ${amb.number}` : '',
        drv?.name || '',
        nur?.name || '',
        m.incidentReport?.hasIncident ? 'SI' : 'NO'
      ];
    });

    downloadCSV([headers, ...rows], `reporte_dispatch_${localDate()}.csv`);
  };

  const handleToggleNotified = async (matchId: string, role: 'driver' | 'nurse' | 'third', currentVal: boolean) => {
    if (role === 'third') return;
    const flags = role === 'driver' ? { driver_notified: !currentVal } : { nurse_notified: !currentVal };
    try {
      await matchesService.setNotified(matchId, flags);
      setMatches(prev => prev.map(m => m.id !== matchId ? m : {
        ...m,
        driverNotified: flags.driver_notified ?? m.driverNotified,
        nurseNotified: flags.nurse_notified ?? m.nurseNotified
      }));
    } catch {
      notify.error('No se pudo guardar el estado del aviso. Revisá la conexión y volvé a intentar.');
    }
  };

  const handleMarkStaffNotifiedForDay = async (staffId: string, dayMatchesToUpdate: MatchModel[]) => {
    let failed = 0;
    for (const m of dayMatchesToUpdate) {
      const flags: { driver_notified?: boolean; nurse_notified?: boolean } = {};
      if (m.driverId === staffId) flags.driver_notified = true;
      if (m.nurseId === staffId) flags.nurse_notified = true;
      if (!Object.keys(flags).length) continue;
      try {
        await matchesService.setNotified(m.id, flags);
        setMatches(prev => prev.map(item => item.id !== m.id ? item : {
          ...item,
          driverNotified: flags.driver_notified ?? item.driverNotified,
          nurseNotified: flags.nurse_notified ?? item.nurseNotified
        }));
      } catch {
        failed++;
      }
    }
    if (failed) notify.error('No se pudo guardar el aviso en ' + failed + ' cobertura(s). Esas marcas quedaron pendientes.');
  };

  const handleDeleteMatch = async (matchId: string) => {
    if ((await askConfirm({ title: "¿Confirma ELIMINAR esta cobertura? No se podrá recuperar.", confirmLabel: 'Eliminar', danger: true }))) {
      try {
        const { error } = await supabase.from('matches').delete().eq('id', matchId);
        if (error) throw error;

        if (editingMatch?.id === matchId) {
          setIsMatchModalOpen(false);
          setEditingMatch(null);
        }

        await loadData();
        notify.success('Cobertura eliminada.');
      } catch (err: any) {
        notify.error("Error eliminando: " + friendlyError(err));
      }
    }
  };

  const handleSaveReport = async (report: IncidentReportModel) => {
    if (!reportingMatch) return;
    try {
      const { error } = await supabase.from('matches').update({
        has_incident: report.hasIncident,
        was_transferred: report.wasTransferred,
        incident_details: report.details,
        status: 'Completed'
      }).eq('id', reportingMatch.id);
      if (error) throw error;

      try {
        await matchesService.addAuditLog(reportingMatch.id, 'Reporte de incidente actualizado / Cobertura completada');
      } catch {
        notify.error('El reporte se guardó, pero no se pudo registrar el historial. Avisá al administrador.');
      }

      await loadData();
      setReportingMatch(null);
      notify.success('Cobertura finalizada.');
    } catch (err: any) {
      notify.error("Error guardando reporte: " + friendlyError(err));
    }
  };

  // --- TRANSFERS HANDLERS ---
  const handleSaveTransfer = async (payload: Partial<TransferModel>) => {
      const cleaned = { ...payload, driver_id: payload.driver_id || null, ambulance_id: payload.ambulance_id || null, nurse_id: payload.nurse_id || null, client_id: payload.client_id || null, planned_start_at: payload.planned_start_at || null, planned_end_at: payload.planned_end_at || null };
      delete cleaned.version;
      if (payload.id) {
        let query = supabase.from('transfers').update(cleaned).eq('id', payload.id);
        if (payload.version !== undefined) query = query.eq('version', payload.version);
        const { error } = await query.select('id').single();
        if (error) throw error;
      } else {
        const { error } = await supabase.from('transfers').insert([cleaned]);
        if (error) throw error;
      }
      await loadData();
      setIsTransferModalOpen(false);
      setEditingTransfer(null);
      notify.success(payload.id ? 'Traslado actualizado.' : 'Traslado registrado.');
  };

  // Cambios de estado en un toque: se actualiza la lista al instante y se refresca el resto en segundo plano.
  const completeTransfer = async (transfer: TransferModel) => {
    try {
      let query = supabase.from('transfers').update({ status: 'Completed' }).eq('id', transfer.id);
      if (transfer.version !== undefined) query = query.eq('version', transfer.version);
      const { data, error } = await query.select('*').single();
      if (error) throw error;
      setTransfers(prev => prev.map(t => t.id === transfer.id ? data as TransferModel : t));
      notify.success('Traslado finalizado.');
      loadData();
    } catch (err: any) {
      notify.error('No se pudo finalizar: ' + friendlyError(err));
    }
  };

  const confirmMatch = async (match: MatchModel) => {
    try {
      const saved = await matchesService.saveMatch({ id: match.id, version: match.version, status: 'Confirmed' });
      if (saved) setMatches(prev => prev.map(m => m.id === match.id ? saved : m));
      matchesService.addAuditLog(match.id, 'Estado: Pending -> Confirmed').catch(() => undefined);
      notify.success('Cobertura confirmada.');
      loadData();
    } catch (err: any) {
      notify.error('No se pudo confirmar: ' + friendlyError(err));
    }
  };

  const openSearchResult = (result: SearchResult) => {
    if (result.kind === 'coverage') { const m = matches.find(x => x.id === result.id); if (m) { setEditingMatch(m); setIsMatchModalOpen(true); } }
    if (result.kind === 'transfer') { const t = transfers.find(x => x.id === result.id); if (t) { setEditingTransfer(t); setIsTransferModalOpen(true); } }
    if (result.kind === 'staff') { const p = staff.find(x => x.id === result.id); if (p) { handleNav('staff'); setEditingStaff(p); setIsStaffModalOpen(true); } }
    if (result.kind === 'ambulance') { const a = ambulances.find(x => x.id === result.id); if (a) setViewingAmbulance(a); }
    if (result.kind === 'location') { const l = locations.find(x => x.id === result.id); if (l) setViewingLocation(l); }
    if (result.kind === 'client') { const c = clients.find(x => x.id === result.id); if (c) { handleNav('clients'); setViewingClient(c); } }
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!(await askConfirm({ title: '¿Seguro que deseas eliminar este traslado?', confirmLabel: 'Eliminar', danger: true }))) return;
    try {
      const { error } = await supabase.from('transfers').delete().eq('id', id);
      if (error) throw error;
      await loadData();
      setIsTransferModalOpen(false);
      setEditingTransfer(null);
      notify.success('Traslado eliminado.');
    } catch (err: any) {
      notify.error("Error al eliminar traslado: " + friendlyError(err));
    }
  };

  const saveQuickMatches = async () => {
    const newMatchesPayload = quickAddRows.map(row => ({
      date: quickAddDate,
      time: row.time,
      location: row.location,
      field_number: row.fieldNumber,
      type: row.type,
      ambulance_id: row.ambulanceId || null,
      driver_id: row.driverId || null,
      nurse_id: row.nurseId || null,
      status: 'Pending',
      duration_minutes: 90
    }));

    if (newMatchesPayload.length === 0) return;

    try {
      const { error } = await supabase.from('matches').insert(newMatchesPayload);
      if (error) throw error;
      await loadData();
      setIsQuickAddModalOpen(false);
      notify.success(newMatchesPayload.length === 1 ? 'Cobertura creada.' : `${newMatchesPayload.length} coberturas creadas.`);
    } catch (err: any) {
      notify.error("Error carga rápida: " + friendlyError(err));
    }
  };

  const handleNav = (tab: SectionId) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    // Cada sección arranca desde arriba; tocar la actual también vuelve al inicio.
    window.scrollTo({ top: 0 });
  };
  const showTodayCoverage = () => {
    setFilters({ ...filters, startDate: localDate(), endDate: localDate(), status: 'all', location: '', ambulance: '', outsourced: 'all', clientId: '', staffId: '' });
    handleNav('matches');
  };

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    // Si hay un modal abierto encima (p. ej. Cambiar Contraseña), Escape cierra sólo ese modal.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);


  return (
    <div className="dispatch-shell min-h-screen flex font-sans text-slate-900">

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col dispatch-sidebar text-white transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1.5" />
            <h1 className="text-xl font-bold tracking-tight">Modelo Dispatch</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Cerrar menú" className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav aria-label="Secciones" className="flex-1 overflow-y-auto p-4 space-y-1">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => handleNav(id)} aria-current={activeTab === id ? 'page' : undefined} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Icon className="w-5 h-5" /> {label}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2 border-t border-slate-800/60">
          <button onClick={() => setIsChangePasswordOpen(true)} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <Key className="w-4 h-4" /> Cambiar Contraseña
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <LogIn className="w-4 h-4 rotate-180" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dispatch-tabbar-offset flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30 px-4 md:px-6 py-2 flex items-center justify-between gap-3 shadow-sm">
          <h2 className="min-w-0 truncate text-lg font-bold text-slate-800 lg:text-xl">{sectionTitle(activeTab)}</h2>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buscar"
              title="Buscar (tecla /)"
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Search className="h-5 w-5 sm:h-4 sm:w-4" /> <span className="hidden md:inline">Buscar</span> <kbd className="hidden rounded border border-slate-200 px-1.5 text-xs text-slate-500 lg:inline">/</kbd>
            </button>
            <button
              onClick={() => { setDailyAgendaDate(localDate()); setIsDailyAgendaOpen(true); }}
              aria-label="Agenda Diaria"
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors"
            >
              <Calendar className="w-5 h-5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Agenda Diaria</span>
            </button>
            <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-indigo-200 bg-indigo-100 font-bold uppercase text-indigo-700 sm:flex" title={userName} aria-hidden="true">
              {userName.charAt(0) || '·'}
            </div>
          </div>
        </header>

          {dataError && (
            <div className="m-4 md:m-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div>
                <h4 className="font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" /> Sin conexión a la base de datos
                </h4>
                <p className="text-sm mt-1">{dataError}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadData} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors">
                  Reintentar
                </button>
                <button onClick={handleLogout} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors">
                  Cerrar Sesión
                </button>
              </div>
            </div>
          )}

          <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

          {isLoadingData && hasLoadedData && (
            <p className="fixed left-1/2 top-3 z-40 -translate-x-1/2 flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Actualizando…
            </p>
          )}
          {isLoadingData && !hasLoadedData ? (
            <LoadingSkeleton />
          ) : (
            <div key={activeTab} className="animate-section-in space-y-6">
              {/* DASHBOARD */}
              {activeTab === 'business' && <React.Suspense fallback={<p className="p-3 text-slate-500">Abriendo administración…</p>}><BusinessWorkspace revision={serviceRegistry.map(s=>`${s.id}:${s.version}`).join('|')} clients={clients} staff={staff} ambulances={ambulances} onChanged={loadData} onEdit={openBusinessService}/></React.Suspense>}
              {activeTab === 'dashboard' && (
                  <>
                    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                      <div>
                        <h2 className="text-lg md:text-xl font-bold text-slate-800">En operación</h2>
                        <DashboardClock />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingTransfer({ date: localDate() }); setIsTransferModalOpen(true); }} className="dispatch-secondary-action"><Truck className="h-4 w-4" /> Traslado</button>
                        <button onClick={() => { setEditingMatch({ date: localDate() }); setIsMatchModalOpen(true); }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Cobertura</button>
                      </div>
                    </div>
  
                    <AttentionAlerts matches={matches} ambulances={ambulances} staff={staff} services={agendaServices} fuelRecords={fuelRecords}
                      onAgenda={showTodayCoverage} onFleet={() => handleNav('fleet')} onStaff={() => handleNav('staff')}
                      onOpenService={openAgendaService} onNav={handleNav}
                      onOpenDay={date => { setDailyAgendaDate(date); setIsDailyAgendaOpen(true); }} />

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-4">
                      <div onClick={() => { setDailyAgendaDate(localDate()); setIsDailyAgendaOpen(true); }} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-blue-200 transition-colors active:scale-95 touch-manipulation">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                          <ClipboardCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 font-medium truncate">Pendientes hoy</p>
                          <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                            <p className="text-lg md:text-xl font-bold text-slate-800 leading-none mt-0.5">{agendaServices.filter(service => !service.closed && service.date === localDate()).length}</p>
                            <span className="text-xs text-slate-500 font-medium truncate mt-0.5">{agendaServices.filter(service => !service.closed && service.date > localDate()).length} más adelante</span>
                          </div>
                        </div>
                      </div>
                      
                      <div onClick={() => handleNav('staff')} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-emerald-200 transition-colors active:scale-95 touch-manipulation">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 font-medium truncate">Personal</p>
                          <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                            <p className="text-lg md:text-xl font-bold text-slate-800 leading-none mt-0.5">{staff.length}</p>
                            <span className="text-xs text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5">
                              <span className="flex items-center gap-0.5" title="Choferes"><Car className="w-3 h-3" /> {staff.filter(s => s.role === 'Chofer').length}</span>
                              <span className="flex items-center gap-0.5" title="Enfermeros"><Stethoscope className="w-3 h-3" /> {staff.filter(s => s.role === 'Enfermero/a').length}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div onClick={() => handleNav('fleet')} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-indigo-200 transition-colors active:scale-95 touch-manipulation">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <Ambulance className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 font-medium truncate">Móviles</p>
                          <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                            <p className="text-lg md:text-xl font-bold text-slate-800 leading-none mt-0.5">{ambulances.length}</p>
                            <span className="text-xs text-slate-500 font-medium truncate mt-0.5">{(n => `${n} ${n === 1 ? 'operativo' : 'operativos'}`)(ambulances.filter(a => a.maintenance?.status === 'Active').length)}</span>
                          </div>
                        </div>
                      </div>

                      <div onClick={() => { setDailyAgendaDate(localDate()); setIsDailyAgendaOpen(true); }} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-amber-200 transition-colors active:scale-95 touch-manipulation">
                        <div className={`p-2 rounded-lg shrink-0 ${superpositionCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 font-medium truncate">Conflictos</p>
                          <div className="flex flex-col md:flex-row md:items-baseline md:gap-2">
                            <p className={`text-lg md:text-xl font-bold leading-none mt-0.5 ${superpositionCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{superpositionCount}</p>
                            <span className={`text-xs font-medium truncate mt-0.5 ${superpositionCount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>{superpositionCount > 0 ? 'Revisar agenda' : 'Sin cruces'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-3 md:p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold">Servicios de hoy</h3>
                        <button onClick={() => { setDailyAgendaDate(localDate()); setIsDailyAgendaOpen(true); }} className="text-sm font-semibold text-indigo-700">Ver agenda</button>
                      </div>
                      <AgendaList services={servicesForDay(agendaServices, localDate()).slice(0, 5)} allServices={agendaServices} date={localDate()} staff={staff} ambulances={ambulances} onOpen={openAgendaService} />
                      {servicesForDay(agendaServices, localDate()).length > 5 && <button onClick={() => { setDailyAgendaDate(localDate()); setIsDailyAgendaOpen(true); }} className="mt-3 text-sm font-semibold text-indigo-700">Ver todos los servicios del día</button>}
                    </div>

                      <FleetStatusWidget 
                        services={agendaServices}
                        ambulances={ambulances} 
                        matches={matches} 
                        onAmbulanceClick={(amb) => setViewingAmbulance(amb)}
                      />
                    </div>
                    <OperationsInsights matches={matches} transfers={transfers} fuelRecords={fuelRecords} />
                  </>
                )}

              {/* MATCHES & HISTORY TABS */}
              {(activeTab === 'matches' || activeTab === 'history') && (
                <div className="space-y-6">
                  <SectionHeader
                    eyebrow={activeTab === 'matches' ? 'Planificación' : 'Archivo operativo'}
                    title={activeTab === 'matches' ? 'Agenda de coberturas' : 'Historial de servicios'}
                    description={activeTab === 'matches' ? 'Organizá recursos, detectá cruces y confirmá cada servicio.' : 'Consultá servicios cerrados y exportá la información visible.'}
                    icon={activeTab === 'matches' ? ClipboardCheck : History}
                  />
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setShowFilters(!showFilters)} className={`dispatch-secondary-action ${showFilters ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : ''}`}>
                          <Filter className="w-4 h-4" /> Filtros
                        </button>
                        {activeTab === 'history' && (
                          <button onClick={handleExportCSV} className="dispatch-secondary-action border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800">
                            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                          </button>
                        )}
                      </div>
                      {activeTab === 'matches' && (
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
                            setQuickAddDate(localDate(tmr));
                            setQuickAddRows([{ id: Math.random().toString(), time: '14:00', location: '', fieldNumber: '', ambulanceId: '', driverId: '', nurseId: '', type: 'Partido de Polo' }]);
                            setIsQuickAddModalOpen(true);
                          }} className="dispatch-secondary-action border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 whitespace-nowrap">
                            <Zap className="w-4 h-4 fill-white" /> Carga Rápida
                          </button>
                          <button onClick={() => { setEditingMatch(null); setIsMatchModalOpen(true); }} className="dispatch-primary-action whitespace-nowrap">
                            <Plus className="w-5 h-5" /> Nueva Cobertura
                          </button>
                        </div>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm md:grid-cols-4 animate-slide-down">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Rango de Fechas</label>
                          <div className="flex gap-2">
                            <input type="date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="w-full text-xs p-2 border rounded" />
                            <input type="date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="w-full text-xs p-2 border rounded" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Cliente</label>
                          <select value={filters.clientId} onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))} className="w-full text-sm p-2 border rounded bg-white">
                            <option value="">Todos</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Personal</label>
                          <select value={filters.staffId} onChange={(e) => setFilters(prev => ({ ...prev, staffId: e.target.value }))} className="w-full text-sm p-2 border rounded bg-white">
                            <option value="">Todos</option>
                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Estado / Lugar / Móvil</label>
                          <div className="flex gap-2">
                            <select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))} className="w-1/2 text-sm p-2 border rounded bg-white">
                              <option value="all">Todos</option>
                              <option value="Pending">Pendiente</option>
                              <option value="Confirmed">Confirmado</option>
                              <option value="Completed">Completado</option>
                              <option value="Suspended">Suspendido</option>
                            </select>
                            <input placeholder="Lugar o Móvil" value={filters.location} onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))} className="w-1/2 text-sm p-2 border rounded" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {filteredMatches.length === 0 && (() => {
                    const filtered = Object.entries(filters).some(([key, value]) => key === 'status' || key === 'outsourced' ? value !== 'all' : Boolean(value));
                    const clear = <button onClick={() => setFilters({ location: '', ambulance: '', outsourced: 'all', startDate: '', endDate: '', clientId: '', staffId: '', status: 'all' })} className="dispatch-secondary-action">Limpiar filtros</button>;
                    return activeTab === 'history'
                      ? <EmptyState icon={HistoryIcon} title={filtered ? 'Ningún servicio cerrado coincide con los filtros' : 'Todavía no hay servicios cerrados'} detail="Acá aparecen las coberturas completadas o suspendidas." action={filtered ? clear : undefined} />
                      : <EmptyState icon={Calendar} title={filtered ? 'Ninguna cobertura coincide con los filtros' : 'No hay coberturas próximas'} action={filtered ? clear : <button onClick={() => { setEditingMatch({ date: localDate() }); setIsMatchModalOpen(true); }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Cargar la primera</button>} />;
                  })()}
                  <div className="space-y-4">
                    {filteredMatches.map((match, index) => {
                      // ... [Mapping of Match Card remains the same]
                      const amb = ambulances.find(a => a.id === match.ambulanceId);
                      const driver = staff.find(s => s.id === match.driverId);
                      const nurse = staff.find(s => s.id === match.nurseId);
                      const third = staff.find(s => s.id === match.thirdCrewId);
                      const client = clients.find(c => c.id === match.clientId);

                      const { hard: conflicts, shared: sharedConflicts } = (activeTab === 'matches' && coverageConflicts.get(match.id)) || { hard: [], shared: [] };
                      const isConflicted = conflicts.length > 0;
                      const isShared = sharedConflicts.length > 0;
                      const endTime = calculateEndTime(match.time, match.durationMinutes, match.extensionMinutes);
                      const isSuspended = match.status === 'Suspended';

                      const currentMonth = getMonthLabel(match.date);
                      const prevMatch = filteredMatches[index - 1];
                      const prevMonth = prevMatch ? getMonthLabel(prevMatch.date) : '';
                      const showMonthHeader = currentMonth !== prevMonth;

                      return (
                        <React.Fragment key={match.id}>
                          {showMonthHeader && (
                            <div className="mt-6 mb-2 flex items-center gap-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                              <span>{currentMonth}</span><span className="h-px flex-1 bg-slate-200" />
                            </div>
                          )}

                          <div className={`dispatch-card overflow-hidden group ${isSuspended ? 'opacity-75 bg-slate-50' : ''}`}>
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-32 bg-slate-50 p-4 flex flex-row md:flex-col items-center md:justify-center justify-between border-b md:border-b-0 md:border-r border-slate-100 gap-2">
                                <div className="text-center">
                                  <span className={`block text-2xl font-bold ${isSuspended ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{formatDateAR(match.date).split('/')[0]}</span>
                                  <span className="block text-xs uppercase font-bold text-slate-500">{new Date(`${match.date}T12:00:00`).toLocaleString('es-AR', { month: 'short' })}</span>
                                </div>
                                <div className="text-center md:mt-2">
                                  <span className={`block text-xl font-bold ${isSuspended ? 'text-slate-500' : isConflicted ? 'text-red-600' : 'text-slate-800'}`}>{formatTime24(match.time)}</span>
                                  {!isSuspended && <span className="text-xs text-slate-500 block mt-1">fin ~{formatTime24(endTime)} {match.extensionMinutes ? `(+${match.extensionMinutes}m)` : ''}</span>}
                                </div>
                              </div>

                              <div className="flex-1 p-4 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <h3 className={`font-bold text-lg flex items-center gap-2 ${isSuspended ? 'text-slate-500' : 'text-slate-800'}`}>
                                      {match.location}
                                      <span className="font-normal text-slate-500 text-base">{match.fieldNumber ? `- ${match.fieldNumber}` : ''}</span>
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <StatusChip tone={(MATCH_STATUS[match.status] ?? MATCH_STATUS.Pending).tone} className="!py-0.5">{(MATCH_STATUS[match.status] ?? MATCH_STATUS.Pending).label}</StatusChip>
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">{match.type}</span>
                                      {!isSuspended && match.type !== 'Evento' && match.type !== 'Partido de Fútbol' && match.chukkers !== undefined && (
                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-medium border border-blue-100">{match.chukkers} Chukkers</span>
                                      )}
                                      {activeTab === 'history' && amb?.isOutsourced && (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">Terciarizada</span>
                                      )}
                                      {match.incidentReport?.hasIncident && (
                                        <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-xs font-medium border border-red-100 flex items-center gap-1">
                                          <AlertCircle className="w-3 h-3" /> Incidente
                                        </span>
                                      )}
                                      {match.incidentReport?.wasTransferred && (
                                        <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-medium border border-red-200 flex items-center gap-1">
                                          <ArrowRightCircle className="w-3 h-3" /> Traslado
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isConflicted && (
                                    <div className="flex flex-col items-end">
                                      <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                        <AlertTriangle className="w-3 h-3" /> Superposición
                                      </span>
                                      {conflicts.slice(0, 2).map((c, idx) => (
                                        <span key={idx} className="text-xs text-red-600 mt-1 max-w-[200px] text-right truncate font-medium">
                                          {c.resources.join(', ')} en {c.match.location} ({formatTime24(c.match.time)})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {isShared && (
                                    <div className="flex flex-col items-end mt-1">
                                      <span className="flex items-center gap-1 text-orange-600 text-xs font-bold bg-orange-50 px-2 py-1 rounded-full border border-orange-100" title="El recurso (Chofer/Móvil) está asignado a otro partido simultáneo en el mismo predio">
                                        <AlertOctagon className="w-3 h-3" /> Misma Sede / Distinta Cancha
                                      </span>
                                      {sharedConflicts.slice(0, 2).map((c, idx) => (
                                        <span key={idx} className="text-xs text-orange-600 mt-1 max-w-[200px] text-right truncate font-medium">
                                          {c.resources.join(', ')} comparte con {c.match.fieldNumber || 'otra cancha'}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {isSuspended ? (
                                  <div className="text-sm text-slate-500 italic mt-2 bg-slate-100 p-2 rounded">
                                    Motivo de suspensión: {match.suspensionReason || 'No especificado'}
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2 min-w-[140px]">
                                      {getAmbulanceIcon(amb?.vehicleType, "w-4 h-4 text-slate-500")}
                                      <span className={amb ? '' : 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs inline-flex items-center gap-1'}>
                                        {amb ? `Móvil ${amb.number} ${amb.isOutsourced ? `(${amb.plate || 'Ext'})` : ''}` : 'Falta Móvil'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-slate-500" />
                                      <div className="flex gap-2 items-center">
                                        {match.isSingleCrew ? (
                                          <span className="text-indigo-600 font-medium bg-indigo-50 px-2 rounded-full text-xs flex items-center">
                                            {driver?.name || nurse?.name || 'S/D'} <span className="ml-1 text-xs opacity-75">(Trip. Simple)</span>
                                            {(driver || nurse) && (
                                              <button onClick={(e) => { e.stopPropagation(); handleToggleNotified(match.id, driver ? 'driver' : 'nurse', driver ? !!match.driverNotified : !!match.nurseNotified); }} className="ml-1.5 focus:outline-none" title="Alternar estado de aviso">
                                                <Check className={`w-3.5 h-3.5 ${(driver ? match.driverNotified : match.nurseNotified) ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`} />
                                              </button>
                                            )}
                                          </span>
                                        ) : (
                                          <>
                                            <span className={driver ? 'flex items-center' : 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs inline-flex items-center gap-1'}>
                                              {driver?.name || 'Falta Chofer'}
                                              {driver && (
                                                <button onClick={(e) => { e.stopPropagation(); handleToggleNotified(match.id, 'driver', !!match.driverNotified); }} className="ml-1 focus:outline-none" title={match.driverNotified ? "Chofer avisado" : "Marcar chofer como avisado"}>
                                                  <Check className={`w-3.5 h-3.5 ${match.driverNotified ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`} />
                                                </button>
                                              )}
                                            </span>
                                            <span className="text-slate-300">/</span>
                                            <span className={nurse ? 'flex items-center' : 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs inline-flex items-center gap-1'}>
                                              {nurse?.name || 'Falta Enf.'}
                                              {nurse && (
                                                <button onClick={(e) => { e.stopPropagation(); handleToggleNotified(match.id, 'nurse', !!match.nurseNotified); }} className="ml-1 focus:outline-none" title={match.nurseNotified ? "Enfermero/a avisado" : "Marcar enfermero/a como avisado"}>
                                                  <Check className={`w-3.5 h-3.5 ${match.nurseNotified ? 'text-green-500' : 'text-slate-300 hover:text-green-400'}`} />
                                                </button>
                                              )}
                                            </span>
                                            {third && (
                                              <>
                                                <span className="text-slate-300">/</span>
                                                <span className="text-indigo-600">{third.name}</span>
                                              </>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {(match.clientId || match.hiredBy || match.incidentReport?.details) && (
                                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-col gap-1">
                                    {(match.clientId || match.hiredBy) && (
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="w-3 h-3 text-slate-500" />
                                        <span>Cliente: <strong className="text-slate-700">{client?.name || match.hiredBy}</strong></span>
                                        {(client?.contactPhone || match.hiredContact) && (
                                          <a href={`https://wa.me/${(client?.contactPhone || match.hiredContact || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="ml-2 bg-green-100 text-green-700 p-1 rounded hover:bg-green-200 transition-colors" title="Contactar">
                                            <Phone className="w-3 h-3" />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    {match.incidentReport?.details && (
                                      <div className="text-slate-600 italic mt-1 bg-slate-50 p-2 rounded border border-slate-200">
                                        <FileText className="w-3 h-3 inline mr-1 text-slate-500" />
                                        {match.incidentReport.details}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="p-3 flex md:flex-col gap-2 items-stretch justify-end border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50 md:bg-white md:w-36">
                                {activeTab === 'matches' && (
                                  <>
                                    {match.status === 'Pending' && (
                                      <button onClick={(e) => { e.stopPropagation(); confirmMatch(match); }} className="flex min-h-11 flex-1 md:flex-none items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-700">
                                        <Check className="h-4 w-4" /> Confirmar
                                      </button>
                                    )}
                                    {!isSuspended && (
                                      <button onClick={(e) => { e.stopPropagation(); setReportingMatch(match); }} className="flex min-h-11 flex-1 md:flex-none items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" title="Cerrar la cobertura con su reporte">
                                        <ClipboardList className="h-4 w-4" /> Finalizar
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setIsMatchModalOpen(true); }} className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Editar cobertura" title="Editar">
                                      <Edit2 className="h-4 w-4" /><span className="hidden md:inline text-sm">Editar</span>
                                    </button>
                                  </>
                                )}
                                {activeTab === 'history' && (
                                  <>
                                    {match.auditLog && match.auditLog.length > 0 && (
                                      <button onClick={(e) => { e.stopPropagation(); setViewingAuditMatch(match); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Historial de Cambios">
                                        <HistoryIcon className="w-5 h-5" />
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setIsMatchModalOpen(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalles / Editar">
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMatch(match.id); }} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" aria-label="Eliminar cobertura" title="Eliminar">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LOCATIONS, STAFF, FLEET, CLIENTS, FUEL... */}

              {activeTab === 'fleet' && (
                <div className="space-y-4">
                  <SectionHeader eyebrow="Recursos móviles" title="Flota de ambulancias" description="Estado operativo, mantenimiento y datos clave de cada unidad." icon={Truck} actions={
                    <button onClick={() => {
                      setEditingAmbulance(null);
                      setIsAmbulanceModalOpen(true);
                    }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Agregar móvil</button>
                  } />
                  {ambulances.length === 0 && <EmptyState icon={Truck} title="Todavía no hay móviles cargados" />}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ambulances.map(amb => {
                      const vtv = licenseStatus(amb.maintenance?.vtvExpiration, localDate());
                      const insurance = licenseStatus(amb.maintenance?.insuranceExpiration, localDate());
                      const service = serviceStatus(amb, currentKm(amb, fuelRecords, localDate()), localDate());
                      return (
                      <div key={amb.id} className="dispatch-card p-3 relative overflow-hidden group border-t-4 border-t-indigo-400">
                        <div className="flex justify-between items-start mb-2">
                          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">{getAmbulanceIcon(amb.vehicleType, "w-8 h-8")}</div>
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${amb.maintenance?.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : amb.maintenance?.status === 'InRepair' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {amb.maintenance?.status === 'Active' ? 'Operativo' : amb.maintenance?.status === 'InRepair' ? 'En Taller' : 'Fuera de Servicio'}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-slate-800">Móvil {amb.number}</h4>
                        <p className="text-sm text-slate-500 font-medium">{amb.vehicleType || 'Vehículo'} {amb.year ? `(${amb.year})` : ''}{amb.plate ? ` · ${amb.plate}` : ''}</p>
                        {!amb.isOutsourced && <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Vencimientos">
                          <p className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${EXPIRY_CHIP[vtv.state]}`}><ClipboardCheck className="h-3.5 w-3.5" /> {vtv.state === 'ok' ? `VTV hasta ${formatDateFull(amb.maintenance?.vtvExpiration)}` : expiryLabel(vtv, 'VTV')}</p>
                          <p className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${EXPIRY_CHIP[insurance.state]}`}><ShieldCheck className="h-3.5 w-3.5" /> {insurance.state === 'ok' ? `Seguro hasta ${formatDateFull(amb.maintenance?.insuranceExpiration)}` : expiryLabel(insurance, 'Seguro', true)}</p>
                          <p className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${EXPIRY_CHIP[service.state]}`}><Wrench className="h-3.5 w-3.5" /> {serviceLabel(amb, service)}</p>
                        </div>}
                        <button onClick={() => setViewingAmbulance(amb)} className="dispatch-secondary-action mt-3 w-full">
                          Ver detalles <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    ); })}
                  </div>
                </div>
              )}

              {/* Other tabs remain identical... */}
              {activeTab === 'staff' && (
                <div className="space-y-4">
                  <SectionHeader eyebrow="Equipo" title="Personal" description="Choferes, enfermería y profesionales disponibles para asignar." icon={Users} actions={
                    <button onClick={() => { setEditingStaff(null); setIsStaffModalOpen(true); }} className="dispatch-primary-action"><UserPlus className="h-4 w-4" /> Agregar personal</button>
                  } />
                  {(() => {
                    const alerts = licenseAlerts(staff, localDate());
                    const count = alerts.expired.length + alerts.soon.length;
                    return (alerts.expired.length > 0 || alerts.soon.length > 0 || alerts.missing.length > 0) && (
                      <div className="dispatch-card p-3 space-y-2" role="region" aria-label="Control de licencias">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <IdCard className="h-4 w-4 text-slate-500" />
                          <span className="font-semibold text-slate-800">Licencias de conducir</span>
                          {alerts.expired.length > 0 && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{alerts.expired.length} {alerts.expired.length === 1 ? 'vencida' : 'vencidas'}</span>}
                          {alerts.soon.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{alerts.soon.length} por vencer</span>}
                          {alerts.missing.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{alerts.missing.length} sin fecha</span>}
                        </div>
                        {count > 0 && <ul className="divide-y divide-slate-100 text-sm">
                          {[...alerts.expired, ...alerts.soon].map(({ person, status }) => (
                            <li key={person.id}>
                              <button onClick={() => { setEditingStaff(person); setIsStaffModalOpen(true); }} className="flex min-h-11 w-full items-center justify-between gap-3 py-1.5 text-left">
                                <span className="font-medium text-slate-800">{person.name}</span>
                                <span className={`text-xs font-semibold ${status.state === 'expired' ? 'text-rose-700' : 'text-amber-700'}`}>{licenseLabel(status)} · {formatDateFull(person.licenseExpiration)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>}
                      </div>
                    );
                  })()}
                  {staff.length === 0 && <EmptyState icon={Users} title="Todavía no hay personal cargado" detail="Cargá choferes y enfermería para poder asignarlos a los servicios." action={<button onClick={() => { setEditingStaff(null); setIsStaffModalOpen(true); }} className="dispatch-primary-action"><UserPlus className="h-4 w-4" /> Agregar personal</button>} />}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staff.map(s => {
                      const license = needsLicense(s) ? licenseStatus(s.licenseExpiration, localDate()) : null;
                      return (
                      <div key={s.id} onClick={() => setViewingStaff(s)} className="dispatch-card p-3 flex items-center gap-3 cursor-pointer relative group">
                        <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${s.role === 'Chofer' ? 'bg-slate-600' : s.role === 'Médico/a' ? 'bg-teal-500' : 'bg-indigo-500'}`}>{s.name.charAt(0)}</div>
                        <div className="min-w-0 flex-1 pr-9">
                          <h4 className="font-bold text-slate-800 truncate">{s.name}</h4>
                          <p className="text-xs text-slate-500 font-medium">{s.role}{s.isOutsourced ? ` · Externo${s.companyName ? ` (${s.companyName})` : ''}` : ''}</p>
                          {s.phone && <a href={`tel:${s.phone.replace(/[^0-9+]/g, '')}`} onClick={e => e.stopPropagation()} className="text-sm text-slate-600 inline-flex items-center gap-1 mt-0.5 hover:text-indigo-700"><Phone className="w-3.5 h-3.5" /> {s.phone}</a>}
                          {license && <p className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${license.state === 'expired' ? 'bg-rose-50 text-rose-700' : license.state === 'soon' ? 'bg-amber-50 text-amber-800' : license.state === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}><IdCard className="h-3.5 w-3.5" /> {license.state === 'ok' ? `Licencia hasta ${formatDateFull(s.licenseExpiration)}` : licenseLabel(license)}</p>}
                        </div>
                        <button aria-label={`Editar ${s.name}`} onClick={(e) => { e.stopPropagation(); setEditingStaff(s); setIsStaffModalOpen(true); }} className="absolute top-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    ); })}
                  </div>
                </div>
              )}
              {activeTab === 'locations' && (
                <div className="space-y-4">
                  <SectionHeader eyebrow="Cobertura territorial" title="Lugares y sedes" description="Accedé rápido a los puntos habituales y sus contactos operativos." icon={MapPin} actions={
                    <button onClick={() => { setEditingLocation(null); setIsLocationModalOpen(true); }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Agregar lugar</button>
                  } />
                  {locations.length === 0 && <EmptyState icon={MapPin} title="Todavía no hay lugares cargados" action={<button onClick={() => { setEditingLocation(null); setIsLocationModalOpen(true); }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Agregar lugar</button>} />}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map(l => (
                      <div key={l.id} onClick={() => setViewingLocation(l)} className="dispatch-card cursor-pointer p-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-600"><MapPin className="w-4 h-4" /></span> {l.name}</h4>
                        {l.contactName && <p className="text-sm text-slate-600 mt-2">Contacto: {l.contactName}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'clients' && (
                <div className="space-y-4">
                  <SectionHeader eyebrow="Relaciones" title="Clientes" description="Datos de contacto y responsables de cada organización." icon={Building} actions={
                    <button onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Agregar cliente</button>
                  } />
                  {clients.length === 0 && <EmptyState icon={Building} title="Todavía no hay clientes cargados" action={<button onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }} className="dispatch-primary-action"><Plus className="h-4 w-4" /> Agregar cliente</button>} />}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(c => (
                      <div key={c.id} onClick={() => setViewingClient(viewingClient?.id === c.id ? null : c)} className="dispatch-card p-4 cursor-pointer group relative">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-lg">{c.name}</h4>
                          <button onClick={(e) => { e.stopPropagation(); setEditingClient(c); setIsClientModalOpen(true); }} className="text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                        </div>
                        {viewingClient?.id === c.id && (c.contactName || c.contactPhone || c.email) && (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600 space-y-1" onClick={e => e.stopPropagation()}>
                            {c.contactName && <p className="flex items-center gap-2"><User className="w-4 h-4 text-slate-500" /> {c.contactName}</p>}
                            {c.contactPhone && <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-500" /> {c.contactPhone}</p>}
                            {c.email && <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-500" /> {c.email}</p>}
                            {c.contactPhone && (
                              <div className="flex items-center gap-2 mt-3 pt-2">
                                <a href={`tel:${c.contactPhone.replace(/[^0-9+]/g, '')}`} className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 rounded-lg font-medium transition-colors border border-slate-200">
                                  <Phone className="w-4 h-4" /> Llamar
                                </a>
                                <a href={`https://wa.me/${c.contactPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-1.5 rounded-lg font-medium transition-colors border border-green-200">
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg> WhatsApp
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'fuel' && (
                <div className="space-y-4">
                  <SectionHeader eyebrow="Consumo" title="Combustible y compras" description="Registrá cargas y compras de estación de forma rápida." icon={Fuel} actions={
                    <button onClick={() => { setEditingFuel(null); setIsBatchFuelModalOpen(true); }} className="dispatch-primary-action"><ListPlus className="h-4 w-4" /> Nueva carga</button>
                  } />
                  <FuelList records={fuelRecords} staff={staff} ambulances={ambulances} onEdit={rec => { setEditingFuel(rec); setIsBatchFuelModalOpen(true); }} />
                </div>
              )}
              {activeTab === 'transfers' && (
                <div className="space-y-4">
                  <SectionHeader eyebrow="Movimientos" title="Registro de traslados" description="Seguimiento de pacientes, recorridos y estado de cada traslado." icon={Ambulance} actions={
                    <button onClick={() => { setEditingTransfer(null); setIsTransferModalOpen(true); }} className="dispatch-primary-action"><Plus className="w-4 h-4"/> Nuevo traslado</button>
                  } />
                  <TransfersList
                    transfers={transfers}
                    staff={staff}
                    ambulances={ambulances}
                    onEdit={transfer => { setEditingTransfer(transfer); setIsTransferModalOpen(true); }}
                    onComplete={completeTransfer}
                  />
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <MobileTabBar
        active={activeTab}
        menuOpen={isMobileMenuOpen}
        onNavigate={handleNav}
        onMore={() => setIsMobileMenuOpen(open => !open)}
      />

      {/* Modals */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSave={handleSaveTransfer}
        onDelete={handleDeleteTransfer}
        transfer={editingTransfer}
        staff={staff}
        ambulances={ambulances}
        clients={clients}
      />
      
      <MatchModal
        isOpen={isMatchModalOpen}
        onClose={() => setIsMatchModalOpen(false)}
        onSaveSuccess={loadData}
        editingMatch={editingMatch}
        locations={locations}
        clients={clients}
        staff={staff}
        ambulances={ambulances}
      />


      <AuditModal isOpen={!!viewingAuditMatch} match={viewingAuditMatch} onClose={() => setViewingAuditMatch(null)} />
      {reportingMatch && <IncidentModal match={reportingMatch} onClose={() => setReportingMatch(null)} onSave={handleSaveReport} />}
      {isStaffScheduleOpen && (
        <StaffScheduleModal date={dailyAgendaDate} setDate={setDailyAgendaDate} matches={matches} staff={staff} ambulances={ambulances}
          onClose={() => setIsStaffScheduleOpen(false)} onBack={() => { setIsStaffScheduleOpen(false); setIsDailyAgendaOpen(true); }}
          onNotified={handleMarkStaffNotifiedForDay} />
      )}
      {isDailyAgendaOpen && <OperationalAgendaModal
        date={dailyAgendaDate} setDate={setDailyAgendaDate}
        onClose={() => setIsDailyAgendaOpen(false)} services={agendaServices}
        staff={staff} ambulances={ambulances} onOpen={openAgendaService}
        dataError={dataError} loading={isLoadingData} onRefresh={loadData}
        onStaffSchedule={() => { setIsDailyAgendaOpen(false); setIsStaffScheduleOpen(true); }}
        onCreate={kind => {
          setIsDailyAgendaOpen(false);
          if (kind === 'coverage') { setEditingMatch({ date: dailyAgendaDate }); setIsMatchModalOpen(true); }
          else { setEditingTransfer({ date: dailyAgendaDate }); setIsTransferModalOpen(true); }
        }}
      />}
      {isQuickAddModalOpen && (
        <QuickAddModal
          isOpen={isQuickAddModalOpen}
          onClose={() => setIsQuickAddModalOpen(false)}
          date={quickAddDate}
          setDate={setQuickAddDate}
          rows={quickAddRows}
          setRows={setQuickAddRows}
          onSave={saveQuickMatches}
          locations={locations}
          ambulances={ambulances}
          staff={staff}
          existingMatches={matches}
        />
      )}
      <FuelBatchModal
        isOpen={isBatchFuelModalOpen}
        onClose={() => { setIsBatchFuelModalOpen(false); setEditingFuel(null); }}
        onSaveSuccess={loadData}
        staff={staff}
        ambulances={ambulances}
        editing={editingFuel}
        records={fuelRecords}
      />
      {isSearchOpen && (
        <GlobalSearch data={{ matches, transfers, staff, ambulances, locations, clients }} onClose={() => setIsSearchOpen(false)} onSelect={openSearchResult} />
      )}
      {isChangePasswordOpen && <ChangePasswordModal onClose={() => setIsChangePasswordOpen(false)} />}
      <StaffHistoryModal isOpen={!!viewingStaff} staff={viewingStaff} matches={matches} ambulances={ambulances} onClose={() => setViewingStaff(null)} />
      {viewingAmbulance && (
        <AmbulanceDetailModal
          isOpen={!!viewingAmbulance}
          onClose={() => setViewingAmbulance(null)}
          ambulance={viewingAmbulance}
          matches={matches}
          fuelRecords={fuelRecords}
          onEdit={(amb) => {
            setEditingAmbulance(amb);
            setIsAmbulanceModalOpen(true);
          }}
        />
      )}
      <StaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSaveSuccess={loadData}
        editingStaff={editingStaff}
      />

      <AmbulanceModal
        isOpen={isAmbulanceModalOpen}
        onClose={() => setIsAmbulanceModalOpen(false)}
        onSaveSuccess={loadData}
        editingAmbulance={editingAmbulance}
        staff={staff}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSaveSuccess={loadData}
        editingLocation={editingLocation}
      />

      <LocationDetailModal
        isOpen={!!viewingLocation}
        onClose={() => setViewingLocation(null)}
        location={viewingLocation}
        matches={matches}
        onEdit={(loc) => {
          setEditingLocation(loc);
          setIsLocationModalOpen(true);
        }}
      />



      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSaveSuccess={loadData}
        editingClient={editingClient}
      />


    </div>
  );
}

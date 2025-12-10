import React, { useState, useEffect, useMemo } from 'react';
import {
  Ambulance, Users, LayoutDashboard, Plus, AlertTriangle, Trash2, Edit2,
  Check, Clock, Menu, X, Send, Siren, Calendar, MapPin, Filter, Truck,
  History, ExternalLink, Car, Stethoscope, ChevronDown, XCircle, Phone, User,
  Wrench, Gauge, Activity, FileText, Shield, ClipboardCheck, Hash, AlertCircle,
  ArrowRightCircle, ClipboardList, Briefcase, History as HistoryIcon, ArrowRight,
  Fuel, Droplet, ListPlus, Copy, FileStack, UserPlus, Clock4, BatteryCharging, Disc, Share2,
  AlertOctagon, Save, Building, FileSpreadsheet, Download, Ban, CalendarDays, Zap,
  Lock, Unlock, LogIn, Loader2, Key, Eye, EyeOff, HelpCircle
} from 'lucide-react';
import {
  Role,
  Staff as StaffModel,
  Ambulance as AmbulanceModel,
  Match as MatchModel,
  MatchType,
  Location as LocationModel,
  AmbulanceStatus,
  IncidentReport as IncidentReportModel,
  AuditLogEntry,
  FuelRecord as FuelRecordModel,
  Client as ClientModel
} from './src/types';
import { supabase } from './src/lib/supabase';
import { GeminiImageEditor } from './components/GeminiImageEditor';
import { MatchModal } from './src/components/modals/MatchModal';
import { StaffModal } from './src/components/modals/StaffModal';
import { AmbulanceModal } from './src/components/modals/AmbulanceModal';
import { LocationModal } from './src/components/modals/LocationModal';
import { LocationDetailModal } from './src/components/modals/LocationDetailModal';
import { AmbulanceDetailModal } from './src/components/modals/AmbulanceDetailModal';
import { ClientModal } from './src/components/modals/ClientModal';
import { FleetStatusWidget } from './src/components/FleetStatusWidget';
import { DashboardClock } from './src/components/DashboardClock';
import { QuickAddModal, QuickAddRow } from './src/components/modals/QuickAddModal';

// --- MAPPERS ---
// Convert DB (snake_case) to App (camelCase) and vice-versa

const mapStaffFromDB = (data: any): StaffModel => ({
  id: data.id,
  name: data.name,
  role: data.role,
  phone: data.phone || '',
  isOutsourced: data.is_outsourced,
  companyName: data.company_name
});

const mapAmbulanceFromDB = (data: any): AmbulanceModel => ({
  id: data.id,
  number: data.number,
  plate: data.plate,
  year: data.year,
  isOutsourced: data.is_outsourced,
  outsourcedCompanyName: data.outsourced_company_name,
  vehicleType: data.vehicle_type,
  coachBuilder: data.coach_builder,
  maintenance: {
    status: data.maintenance_status,
    mileage: data.mileage,
    mileageLastUpdate: data.mileage_last_update,
    vtvExpiration: data.vtv_expiration,
    insurance: data.insurance,
    mechanicNotes: data.mechanic_notes,
    tireType: data.tire_type,
    oilType: data.oil_type,
    batteryType: data.battery_type,
    batteryLastChange: data.battery_last_change,
    batteryPurchaseLocation: data.battery_purchase_location,
    workshopName: data.workshop_name,
    mechanicContact: data.mechanic_contact
  }
});

const mapLocationFromDB = (data: any): LocationModel => ({
  id: data.id,
  name: data.name,
  address: data.address,
  googleMapsUrl: data.google_maps_url,
  contactName: data.contact_name,
  contactPhone: data.contact_phone
});

const mapClientFromDB = (data: any): ClientModel => ({
  id: data.id,
  name: data.name,
  contactName: data.contact_name,
  contactPhone: data.contact_phone,
  email: data.email,
  notes: data.notes
});

const mapMatchFromDB = (data: any): MatchModel => ({
  id: data.id,
  date: data.date,
  time: data.time?.substring(0, 5), // Remove seconds if present
  location: data.location,
  fieldNumber: data.field_number,
  type: data.type,
  durationMinutes: data.duration_minutes,
  extensionMinutes: data.extension_minutes,
  chukkers: data.chukkers,
  status: data.status,
  suspensionReason: data.suspension_reason,
  isSingleCrew: data.is_single_crew,
  driverNotified: data.driver_notified,
  nurseNotified: data.nurse_notified,

  clientId: data.client_id,
  ambulanceId: data.ambulance_id,
  driverId: data.driver_id,
  nurseId: data.nurse_id,
  thirdCrewId: data.third_crew_id,

  hiredBy: data.hired_by,
  hiredContact: data.hired_contact,

  incidentReport: (data.has_incident || data.incident_details) ? {
    hasIncident: data.has_incident,
    wasTransferred: data.was_transferred,
    details: data.incident_details
  } : undefined,

  auditLog: data.audit_logs?.map((log: any) => ({
    date: log.date,
    changes: log.changes
  }))
});

const mapFuelFromDB = (data: any): FuelRecordModel => ({
  id: data.id,
  date: data.date,
  ambulanceId: data.ambulance_id,
  driverId: data.driver_id,
  fuelType: data.fuel_type,
  liters: Number(data.liters),
  items: data.items
});

// --- HELPERS ---
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

const subtractTime = (timeStr: string, minutesToSubtract: number) => {
  const start = timeToMinutes(timeStr);
  let newTime = start - minutesToSubtract;
  if (newTime < 0) newTime += 24 * 60;
  return minutesToTime(newTime);
};

const downloadCSV = (data: any[], filename: string) => {
  const csvContent = "data:text/csv;charset=utf-8,"
    + data.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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

interface ConflictDetail {
  match: MatchModel;
  resources: string[];
}

const getConflicts = (currentMatch: MatchModel, allMatches: MatchModel[]): { hard: ConflictDetail[], shared: ConflictDetail[] } => {
  if (currentMatch.status === 'Suspended') return { hard: [], shared: [] };

  const currentStart = timeToMinutes(currentMatch.time);
  const currentEnd = currentStart + (currentMatch.durationMinutes || 90) + (currentMatch.extensionMinutes || 0) + 15;

  const hard: ConflictDetail[] = [];
  const shared: ConflictDetail[] = [];

  const loc1 = (currentMatch.location || '').trim().toLowerCase();
  const field1 = (currentMatch.fieldNumber || '').trim().toLowerCase();

  allMatches.forEach(other => {
    if (other.id === currentMatch.id || other.date !== currentMatch.date) return;
    if (other.status === 'Suspended') return;

    const otherStart = timeToMinutes(other.time);
    const otherEnd = otherStart + (other.durationMinutes || 90) + (other.extensionMinutes || 0) + 15;

    if (!(currentStart < otherEnd && currentEnd > otherStart)) return;

    const conflictingResources: string[] = [];
    if (currentMatch.driverId && currentMatch.driverId === other.driverId) conflictingResources.push("Chofer");
    if (currentMatch.nurseId && currentMatch.nurseId === other.nurseId) conflictingResources.push("Enfermero/a");
    if (currentMatch.thirdCrewId && currentMatch.thirdCrewId === other.thirdCrewId) conflictingResources.push("Auxiliar");
    if (currentMatch.ambulanceId && currentMatch.ambulanceId === other.ambulanceId) conflictingResources.push("Móvil");

    if (conflictingResources.length > 0) {
      const loc2 = (other.location || '').trim().toLowerCase();
      const field2 = (other.fieldNumber || '').trim().toLowerCase();

      if (loc1 === loc2) {
        if (field1 && field2 && field1 !== field2) {
          shared.push({ match: other, resources: conflictingResources });
          return;
        }
      }
      hard.push({ match: other, resources: conflictingResources });
    }
  });

  return { hard, shared };
};

const checkSystemConflicts = (matches: MatchModel[]) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const relevantMatches = matches.filter(m => m.date >= todayStr && m.status !== 'Suspended');
  let count = 0;
  for (const match of relevantMatches) {
    if (getConflicts(match, matches).hard.length > 0) count++;
  }
  return count;
};



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

  const handleAuth = async (isRegister: boolean) => {
    if (!username || !password) {
      setError("Por favor complete usuario y contraseña");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError('');

    const email = getInternalEmail();

    try {
      if (isRegister) {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username: username.trim() } }
        });

        if (signUpError) throw signUpError;

        // If successful or waiting for confirmation (handled by next check)
        if (data.user && !data.session) {
          // This usually means email confirmation is ON in Supabase
          throw new Error("EMAIL_NOT_CONFIRMED");
        }
        if (data.session) onLogin();

      } else {
        // Log In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          console.error("Login failed for:", email);
          if (signInError.message.includes("Invalid login credentials")) {
            throw new Error("Usuario no encontrado o contraseña incorrecta.");
          } else if (signInError.message.includes("Email not confirmed")) {
            throw new Error("EMAIL_NOT_CONFIRMED");
          } else {
            throw signInError;
          }
        } else {
          onLogin();
        }
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.message === "EMAIL_NOT_CONFIRMED") {
        setError("EMAIL_NOT_CONFIRMED");
      } else if (err.message.includes("already registered")) {
        setError("Este usuario ya existe. Intenta el botón 'Ingresar'.");
      } else if (err.message.includes("Usuario no encontrado")) {
        setError("Credenciales incorrectas. Si es tu primera vez, usa 'Registrarse'.");
      } else {
        setError(err.message || "Error de conexión");
      }
    } finally {
      setLoading(false);
    }
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

        {error === "EMAIL_NOT_CONFIRMED" ? (
          <div className="bg-amber-50 text-amber-800 p-4 rounded-lg text-sm mb-6 border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-6 h-6 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">¡Atención! Configuración Requerida</p>
                <p className="mt-1">Tu usuario se creó, pero Supabase está esperando confirmación de email.</p>
                <p className="mt-2 font-bold">SOLUCIÓN:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Ve a tu proyecto en <strong>Supabase</strong>.</li>
                  <li>Menú: <strong>Authentication</strong> &gt; <strong>Providers</strong> &gt; <strong>Email</strong>.</li>
                  <li><span className="text-red-600 font-bold">DESACTIVA</span> la opción "Confirm email".</li>
                  <li>Guarda y vuelve a intentar entrar aquí.</li>
                </ol>
              </div>
            </div>
          </div>
        ) : error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-center mb-6 border border-red-200 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="NombreUsuario"
                autoCapitalize="none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pl-10 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <button
              onClick={() => handleAuth(false)}
              disabled={loading}
              className="w-full bg-emerald-700 text-white py-3 rounded-lg font-bold hover:bg-emerald-800 transition-colors flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ingresar'}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4">
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

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  if (!session) return <LoginScreen onLogin={() => { }} />;

  return <MainApp session={session} />;
}

function MainApp({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'matches' | 'history' | 'fleet' | 'staff' | 'locations' | 'fuel' | 'clients'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data State
  const [matches, setMatches] = useState<MatchModel[]>([]);
  const [staff, setStaff] = useState<StaffModel[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceModel[]>([]);
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelRecordModel[]>([]);
  const [clients, setClients] = useState<ClientModel[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modals State
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<MatchModel> | null>(null);
  const [isMatchReadOnly, setIsMatchReadOnly] = useState(false);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffModel> | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffModel | null>(null);

  const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<Partial<AmbulanceModel> | null>(null);

  // Dynamic Form State for Ambulance
  const [ambFormShowOutsourced, setAmbFormShowOutsourced] = useState(false);
  const [ambFormShowWorkshop, setAmbFormShowWorkshop] = useState(false);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Partial<LocationModel> | null>(null);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClientModel> | null>(null);
  const [viewingClient, setViewingClient] = useState<ClientModel | null>(null);

  const [viewingLocation, setViewingLocation] = useState<LocationModel | null>(null);
  const [viewingAmbulance, setViewingAmbulance] = useState<AmbulanceModel | null>(null);

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [reportingMatch, setReportingMatch] = useState<MatchModel | null>(null);
  const [incidentForm, setIncidentForm] = useState<IncidentReportModel>({ hasIncident: false, wasTransferred: false, details: '' });

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [viewingAuditMatch, setViewingAuditMatch] = useState<MatchModel | null>(null);

  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isBatchFuelModalOpen, setIsBatchFuelModalOpen] = useState(false);
  const [batchFuelRows, setBatchFuelRows] = useState<Partial<FuelRecordModel>[]>([]);

  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [dailyAgendaDate, setDailyAgendaDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Quick Add State
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<string>('');
  const [quickAddRows, setQuickAddRows] = useState<QuickAddRow[]>([]);

  const [isNewLocationPromptOpen, setIsNewLocationPromptOpen] = useState(false);
  const [pendingNewLocationName, setPendingNewLocationName] = useState('');

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

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
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [
        { data: staffData },
        { data: ambData },
        { data: locData },
        { data: clientData },
        { data: matchData },
        { data: fuelData }
      ] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('ambulances').select('*'),
        supabase.from('locations').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('matches').select('*, audit_logs(*)').order('date', { ascending: true }),
        supabase.from('fuel_records').select('*')
      ]);

      if (staffData) setStaff(staffData.map(mapStaffFromDB));
      if (ambData) setAmbulances(ambData.map(mapAmbulanceFromDB));
      if (locData) setLocations(locData.map(mapLocationFromDB));
      if (clientData) setClients(clientData.map(mapClientFromDB));
      if (matchData) setMatches(matchData.map(mapMatchFromDB));
      if (fuelData) setFuelRecords(fuelData.map(mapFuelFromDB));

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  // --- Derived Data ---
  const futureMatches = matches.filter(m => m.status !== 'Completed').sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  const superpositionCount = useMemo(() => checkSystemConflicts(matches), [matches]);

  const filteredMatches = (activeTab === 'history' ? matches : futureMatches).filter(m => {
    if (activeTab === 'history' && m.status !== 'Completed' && m.status !== 'Suspended') return false;
    if (activeTab === 'matches' && m.status === 'Completed') return false;

    const amb = ambulances.find(a => a.id === m.ambulanceId);

    if (filters.location && !m.location.toLowerCase().includes(filters.location.toLowerCase())) return false;

    if (filters.ambulance && amb) {
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

  const handleChangePassword = async (newPassword: string, newUsername?: string) => {
    const updates: any = {};
    if (newPassword) updates.password = newPassword;
    if (newUsername) updates.data = { username: newUsername };

    const { error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
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

    downloadCSV([headers, ...rows], `reporte_dispatch_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleSaveMatch = async (matchData: Partial<MatchModel>) => {
    const isPolo = matchData.type?.includes('Polo');
    const finalData = {
      ...matchData,
      chukkers: isPolo ? matchData.chukkers : null
    };

    // Prepare DB Payload (snake_case)
    const payload: any = {
      date: finalData.date,
      time: finalData.time,
      location: finalData.location,
      field_number: finalData.fieldNumber,
      type: finalData.type,
      duration_minutes: finalData.durationMinutes,
      extension_minutes: finalData.extensionMinutes,
      chukkers: finalData.chukkers,
      status: finalData.status,
      suspension_reason: finalData.suspensionReason,
      is_single_crew: finalData.isSingleCrew,
      driver_notified: finalData.driverNotified || false,
      nurse_notified: finalData.nurseNotified || false,
      client_id: finalData.clientId || null,
      ambulance_id: finalData.ambulanceId || null,
      driver_id: finalData.driverId || null,
      nurse_id: finalData.nurseId || null,
      third_crew_id: finalData.thirdCrewId || null,
      hired_by: finalData.hiredBy,
      hired_contact: finalData.hiredContact,
      // Incident details are flat columns in DB
      has_incident: finalData.incidentReport?.hasIncident || false,
      was_transferred: finalData.incidentReport?.wasTransferred || false,
      incident_details: finalData.incidentReport?.details || ''
    };

    try {
      let savedMatchId = editingMatch?.id;

      if (editingMatch?.id) {
        // Update
        const { error } = await supabase.from('matches').update(payload).eq('id', editingMatch.id);
        if (error) throw error;

        // Audit Log Generation
        const changes: string[] = [];
        const m = matches.find(x => x.id === editingMatch.id);
        if (m) {
          const norm = (val: any) => (val || '').toString().trim();
          if (norm(m.status) !== norm(finalData.status)) changes.push(`Estado: ${m.status} -> ${finalData.status}`);
          if (norm(m.time) !== norm(finalData.time)) changes.push(`Hora: ${m.time} -> ${finalData.time}`);
          if (norm(m.location) !== norm(finalData.location)) changes.push(`Lugar: ${m.location} -> ${finalData.location}`);
          if (norm(m.ambulanceId) !== norm(finalData.ambulanceId)) changes.push('Cambio de Móvil');
          if (norm(m.driverId) !== norm(finalData.driverId)) changes.push('Cambio de Chofer');
          if (m.isSingleCrew !== finalData.isSingleCrew) changes.push(`Tripulación: ${finalData.isSingleCrew ? 'Simple' : 'Completa'}`);
        }

        if (changes.length > 0) {
          await supabase.from('audit_logs').insert({
            match_id: editingMatch.id,
            changes: changes.join(', ')
          });
        }
      } else {
        // Insert
        const { data, error } = await supabase.from('matches').insert(payload).select();
        if (error) throw error;
        savedMatchId = data[0].id;
      }

      // Check for New Location
      if (finalData.location) {
        const locName = finalData.location.trim();
        const exists = locations.some(l => l.name.toLowerCase() === locName.toLowerCase());
        if (!exists) {
          setPendingNewLocationName(locName);
          await supabase.from('locations').insert({ name: locName });
          const { data: l } = await supabase.from('locations').select('*');
          if (l) setLocations(l.map(mapLocationFromDB));
        }
      }

      await loadData();
      setIsMatchModalOpen(false);
      setEditingMatch(null);

    } catch (err: any) {
      alert("Error guardando cobertura: " + err.message);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (window.confirm("¿Confirma ELIMINAR esta cobertura? No se podrá recuperar.")) {
      try {
        const { error } = await supabase.from('matches').delete().eq('id', matchId);
        if (error) throw error;

        if (editingMatch?.id === matchId) {
          setIsMatchModalOpen(false);
          setEditingMatch(null);
        }

        await loadData();
      } catch (err: any) {
        alert("Error eliminando: " + err.message);
      }
    }
  };

  const handleSaveReport = async () => {
    if (!reportingMatch) return;
    try {
      const payload = {
        has_incident: incidentForm.hasIncident,
        was_transferred: incidentForm.wasTransferred,
        incident_details: incidentForm.details,
        status: 'Completed'
      };

      const { error } = await supabase.from('matches').update(payload).eq('id', reportingMatch.id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        match_id: reportingMatch.id,
        changes: 'Reporte de incidente actualizado / Cobertura completada'
      });

      await loadData();
      setIsIncidentModalOpen(false);
      setReportingMatch(null);
    } catch (err: any) {
      alert("Error guardando reporte: " + err.message);
    }
  };

  const handleSaveFuelBatch = async () => {
    const newRecords = batchFuelRows.filter(r => r.liters && r.ambulanceId && r.driverId).map(r => ({
      date: r.date || new Date().toISOString().split('T')[0],
      ambulance_id: r.ambulanceId,
      driver_id: r.driverId,
      fuel_type: r.fuelType || 'Euro Diesel',
      liters: Number(r.liters),
      items: r.items
    }));

    if (newRecords.length === 0) return;

    try {
      const { error } = await supabase.from('fuel_records').insert(newRecords);
      if (error) throw error;
      await loadData();
      setIsBatchFuelModalOpen(false);
      setBatchFuelRows([]);
    } catch (err: any) {
      alert("Error guardando combustible: " + err.message);
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
    } catch (err: any) {
      alert("Error carga rápida: " + err.message);
    }
  };

  const handleNav = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (isMatchModalOpen && editingMatch?.status === 'Completed') {
      setIsMatchReadOnly(true);
    } else {
      setIsMatchReadOnly(false);
    }
  }, [isMatchModalOpen, editingMatch]);

  // --- Modal Forms for Entities ---
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const payload = {
      name: form.get('name'),
      role: form.get('role'),
      phone: form.get('phone'),
      is_outsourced: form.get('isOutsourced') === 'on',
      company_name: form.get('companyName')
    };

    try {
      if (editingStaff?.id) {
        await supabase.from('staff').update(payload).eq('id', editingStaff.id);
      } else {
        await supabase.from('staff').insert(payload);
      }
      await loadData();
      setIsStaffModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);

    const yearInput = form.get('year');
    let year: number | null = null;

    if (yearInput && yearInput.toString().trim() !== '') {
      year = parseInt(yearInput.toString(), 10);
      if (isNaN(year)) {
        alert("El año ingresado no es válido.");
        return;
      }
      // Validation for realistic years
      const currentYear = new Date().getFullYear();
      if (year < 1900 || year > currentYear + 1) {
        alert(`El año debe estar entre 1900 y ${currentYear + 1}`);
        return;
      }
    }

    const numberVal = form.get('number');
    if (!numberVal || numberVal.toString().trim() === '') {
      alert("El número de móvil es obligatorio.");
      return;
    }

    // Clean mileage input and ensure it's a number
    const mileageInput = form.get('mileage');
    const newMileageStr = (mileageInput && mileageInput.toString().trim() !== '')
      ? mileageInput.toString().replace(/[^0-9]/g, '')
      : null;

    // Parse to int to ensure correct DB type (avoiding strings in numeric columns)
    const newMileage = newMileageStr ? parseInt(newMileageStr, 10) : null;

    let mileageLastUpdate = editingAmbulance?.maintenance?.mileageLastUpdate;
    if (newMileage && newMileage !== Number(editingAmbulance?.maintenance?.mileage)) {
      mileageLastUpdate = new Date().toISOString().split('T')[0];
    } else if (!editingAmbulance && newMileage) {
      mileageLastUpdate = new Date().toISOString().split('T')[0];
    }

    const payload = {
      number: numberVal,
      plate: form.get('plate'),
      vehicle_type: form.get('vehicleType'),
      year: year,
      coach_builder: form.get('coachBuilder'),
      is_outsourced: form.get('isOutsourced') === 'on',
      outsourced_company_name: form.get('isOutsourced') === 'on' ? form.get('outsourcedCompanyName') : null,
      maintenance_status: form.get('maintenanceStatus') || 'Active',
      mileage: newMileage,
      mileage_last_update: mileageLastUpdate,
      vtv_expiration: form.get('vtvExpiration') ? form.get('vtvExpiration') : null,
      insurance: form.get('insurance'),
      mechanic_notes: form.get('mechanicNotes'),
      tire_type: form.get('tireType'),
      oil_type: form.get('oilType'),
      battery_type: form.get('batteryType'),
      battery_last_change: form.get('batteryLastChange') ? form.get('batteryLastChange') : null,
      battery_purchase_location: form.get('batteryPurchaseLocation'),
      workshop_name: form.get('workshopName'),
      mechanic_contact: form.get('mechanicContact')
    };

    try {
      if (editingAmbulance?.id) {
        const { error } = await supabase.from('ambulances').update(payload).eq('id', editingAmbulance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ambulances').insert(payload);
        if (error) throw error;
      }
      await loadData();
      setIsAmbulanceModalOpen(false);
    } catch (err: any) {
      console.error("Error saving ambulance:", err);
      let msg = "Error desconocido";
      if (typeof err === 'object' && err !== null) {
        // Handle specific Supabase schema errors (Code 42703 is undefined_column)
        if (err.code === '42703' || (err.message && err.message.toLowerCase().includes('column'))) {
          msg = "Faltan columnas en la base de datos. Por favor ejecuta el script SQL para agregar 'battery_type', 'oil_type', etc.";
        } else {
          msg = err.message || err.error_description || JSON.stringify(err);
        }
      } else {
        msg = String(err);
      }
      alert(`Error al guardar móvil: ${msg}`);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const payload = {
      name: form.get('name'),
      address: form.get('address'),
      google_maps_url: form.get('googleMapsUrl'),
      contact_name: form.get('contactName'),
      contact_phone: form.get('contactPhone')
    };

    try {
      if (editingLocation?.id) {
        await supabase.from('locations').update(payload).eq('id', editingLocation.id);
      } else {
        await supabase.from('locations').insert(payload);
      }
      await loadData();
      setIsLocationModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const payload = {
      name: form.get('name'),
      contact_name: form.get('contactName'),
      contact_phone: form.get('contactPhone'),
      email: form.get('email'),
      notes: form.get('notes')
    };

    try {
      if (editingClient?.id) {
        await supabase.from('clients').update(payload).eq('id', editingClient.id);
      } else {
        await supabase.from('clients').insert(payload);
      }
      await loadData();
      setIsClientModalOpen(false);
    } catch (err: any) { alert(err.message); }
  };

  const DailyAgendaModal = () => {
    // ... [No changes needed in logic here, just UI]
    const [citationTimes, setCitationTimes] = useState<Record<string, string>>({});
    const [useCitation, setUseCitation] = useState<Record<string, boolean>>({});

    const dayMatches = matches.filter(m => m.date === dailyAgendaDate && m.status !== 'Suspended').sort((a, b) => a.time.localeCompare(b.time));
    const activeStaffIds: string[] = Array.from(new Set(dayMatches.flatMap(m => [m.driverId, m.nurseId, m.thirdCrewId].filter((id): id is string => !!id))));

    useEffect(() => {
      const initialTimes: Record<string, string> = {};
      const initialUse: Record<string, boolean> = {};
      activeStaffIds.forEach(sid => {
        const firstMatch = dayMatches.find(m => m.driverId === sid || m.nurseId === sid || m.thirdCrewId === sid);
        if (firstMatch) {
          initialTimes[sid] = subtractTime(firstMatch.time, 60);
          initialUse[sid] = false;
        }
      });
      setCitationTimes(initialTimes);
      setUseCitation(initialUse);
    }, [dailyAgendaDate]);

    const generateIndividualText = (s: StaffModel) => {
      const staffMatches = dayMatches.filter(m => m.driverId === s.id || m.nurseId === s.id || m.thirdCrewId === s.id);
      const dateLabel = new Date(dailyAgendaDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

      let text = `👋 Hola *${s.name}*, tu cronograma para ${dateLabel}:\n\n`;

      if (useCitation[s.id] && citationTimes[s.id]) {
        text += `🕒 *Citación en Base:* ${formatTime24(citationTimes[s.id])} hs\n`;
        text += `--------------------------------\n`;
      }

      staffMatches.forEach(m => {
        const amb = ambulances.find(a => a.id === m.ambulanceId);
        const partners = [];
        if (m.driverId && m.driverId !== s.id) {
          const p = staff.find(st => st.id === m.driverId);
          if (p) partners.push(`${p.name} (Chofer)`);
        }
        if (m.nurseId && m.nurseId !== s.id) {
          const p = staff.find(st => st.id === m.nurseId);
          if (p) partners.push(`${p.name} (Enf)`);
        }
        if (m.thirdCrewId && m.thirdCrewId !== s.id) {
          const p = staff.find(st => st.id === m.thirdCrewId);
          if (p) partners.push(`${p.name} (Aux)`);
        }

        text += `🚑 *${formatTime24(m.time)} hs* | ${m.location}\n`;
        text += `   📝 ${m.type} ${m.fieldNumber ? `(${m.fieldNumber})` : ''}\n`;
        text += `   🚐 Móvil: ${amb ? amb.number : 'A designar'}\n`;
        if (m.isSingleCrew && partners.length === 0) {
          text += `   👤 Tripulación Simple\n`;
        } else {
          text += `   🤝 Con: ${partners.join(', ') || 'Nadie'}\n`;
        }
        text += `\n`;
      });
      return text;
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" /> Agenda Diaria por Personal
            </h3>
            <button onClick={() => setIsDailyAgendaOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
          </div>
          <div className="p-4 border-b bg-white">
            <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Fecha</label>
            <input
              type="date"
              value={dailyAgendaDate}
              onChange={(e) => setDailyAgendaDate(e.target.value)}
              className="w-full md:w-64 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="p-6 overflow-y-auto bg-slate-100 flex-1">
            {activeStaffIds.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No hay personal asignado para esta fecha.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeStaffIds.map(sid => {
                  const s = staff.find(st => st.id === sid);
                  if (!s) return null;
                  const msg = generateIndividualText(s);
                  const cleanPhone = s.phone.replace(/[^0-9]/g, '');
                  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;

                  return (
                    <div key={sid} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">{s.name}</h4>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{s.role}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={useCitation[sid] || false}
                              onChange={(e) => setUseCitation(prev => ({ ...prev, [sid]: e.target.checked }))}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                            />
                            <Clock4 className="w-3 h-3" /> Citar en Base
                          </label>
                          {useCitation[sid] && (
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                className="border rounded p-1 text-sm w-28 text-center bg-indigo-50 border-indigo-100 font-medium"
                                value={citationTimes[sid] || ''}
                                onChange={(e) => setCitationTimes(prev => ({ ...prev, [sid]: e.target.value }))}
                              />
                              <span className="text-[10px] text-slate-400 font-bold">HS</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-50 rounded p-2 mb-3 text-xs font-mono text-slate-600 whitespace-pre-wrap border border-slate-100 h-32 overflow-y-auto">
                        {msg}
                      </div>
                      <div className="flex gap-2">
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 text-sm transition-colors shadow-sm shadow-green-200">
                          <Send className="w-4 h-4" /> Enviar WhatsApp
                        </a>
                        <button onClick={() => { navigator.clipboard.writeText(msg); }} className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
            <button onClick={() => setIsDailyAgendaOpen(false)} className="px-6 py-2 bg-slate-800 text-white hover:bg-slate-700 rounded-lg">Cerrar</button>
          </div>
        </div>
      </div>
    );
  };

  const StaffHistoryModal = () => {
    if (!viewingStaff) return null;
    const staffMatches = matches.filter(m => m.driverId === viewingStaff.id || m.nurseId === viewingStaff.id || m.thirdCrewId === viewingStaff.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-indigo-600" /> Historial: {viewingStaff.name}
              </h3>
            </div>
            <button onClick={() => setViewingStaff(null)}><X className="w-6 h-6 text-slate-400" /></button>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Lugar</th>
                  <th className="p-3 text-left">Rol</th>
                  <th className="p-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffMatches.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-500">Sin historial registrado.</td></tr>
                ) : (
                  staffMatches.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{formatDateAR(m.date)}</div>
                        <div className="text-xs text-slate-500">{formatTime24(m.time)} hs</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{m.location}</div>
                        <div className="text-xs text-slate-500">{m.type} {m.fieldNumber && `- ${m.fieldNumber}`}</div>
                      </td>
                      <td className="p-3">
                        {m.driverId === viewingStaff.id ? 'Chofer' : m.nurseId === viewingStaff.id ? 'Enfermero/a' : 'Auxiliar'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs border ${m.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : m.status === 'Suspended' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {m.status === 'Suspended' ? 'Suspendido' : m.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const FuelBatchModal = () => {
    const addRow = () => {
      const lastRow = batchFuelRows[batchFuelRows.length - 1];
      setBatchFuelRows([...batchFuelRows, { date: lastRow?.date || new Date().toISOString().split('T')[0], fuelType: 'Euro Diesel', liters: 0 }]);
    };

    const updateRow = (index: number, field: keyof FuelRecordModel, value: any) => {
      const newRows = [...batchFuelRows];
      newRows[index] = { ...newRows[index], [field]: value };
      setBatchFuelRows(newRows);
    };

    const removeRow = (index: number) => {
      setBatchFuelRows(batchFuelRows.filter((_, i) => i !== index));
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ListPlus className="w-5 h-5 text-indigo-600" /> Carga Masiva de Combustible
            </h3>
            <button onClick={() => setIsBatchFuelModalOpen(false)}><X className="w-6 h-6" /></button>
          </div>
          <div className="p-4 overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="p-2 text-left rounded-l-lg">Fecha</th>
                  <th className="p-2 text-left">Móvil</th>
                  <th className="p-2 text-left">Chofer</th>
                  <th className="p-2 text-left">Combustible</th>
                  <th className="p-2 text-left">Litros</th>
                  <th className="p-2 text-left">Items Extra</th>
                  <th className="p-2 text-left rounded-r-lg"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batchFuelRows.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50">
                    <td className="p-2">
                      <input type="date" value={row.date} onChange={(e) => updateRow(idx, 'date', e.target.value)} className="w-32 border rounded p-1" />
                    </td>
                    <td className="p-2">
                      <select value={row.ambulanceId || ''} onChange={(e) => updateRow(idx, 'ambulanceId', e.target.value)} className="w-24 border rounded p-1">
                        <option value="">Sel...</option>
                        {ambulances.map(a => <option key={a.id} value={a.id}>{a.number}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.driverId || ''} onChange={(e) => updateRow(idx, 'driverId', e.target.value)} className="w-32 border rounded p-1">
                        <option value="">Sel...</option>
                        {staff.filter(s => s.role === 'Chofer').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.fuelType} onChange={(e) => updateRow(idx, 'fuelType', e.target.value)} className="w-32 border rounded p-1">
                        <option value="Euro Diesel">Euro Diesel</option>
                        <option value="Nafta Super">Nafta Super</option>
                        <option value="Nafta Premium">Nafta Premium</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input type="number" value={row.liters} onChange={(e) => updateRow(idx, 'liters', e.target.value)} className="w-20 border rounded p-1" step="0.1" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={row.items || ''} onChange={(e) => updateRow(idx, 'items', e.target.value)} placeholder="Ej: Aceite" className="w-32 border rounded p-1" />
                    </td>
                    <td className="p-2">
                      <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button onClick={addRow} className="mt-4 flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800">
              <Plus className="w-4 h-4" /> Agregar Fila
            </button>
          </div>
          <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
            <button onClick={() => setIsBatchFuelModalOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
            <button onClick={handleSaveFuelBatch} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Guardar Todo</button>
          </div>
        </div>
      </div>
    );
  };

  const AuditModal = () => {
    // ... [No changes needed]
    if (!isAuditModalOpen || !viewingAuditMatch) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <HistoryIcon className="w-5 h-5 text-slate-500" /> Historial de Cambios
            </h3>
            <button onClick={() => { setIsAuditModalOpen(false); setViewingAuditMatch(null); }}>
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          <div className="p-0 overflow-y-auto flex-1">
            {(!viewingAuditMatch.auditLog || viewingAuditMatch.auditLog.length === 0) ? (
              <div className="p-8 text-center text-slate-500">
                No hay cambios registrados para esta cobertura.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...viewingAuditMatch.auditLog].reverse().map((log, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">
                        {new Date(log.date).toLocaleString('es-AR')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{log.changes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
            <button onClick={() => { setIsAuditModalOpen(false); setViewingAuditMatch(null); }} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">Cerrar</button>
          </div>
        </div>
      </div>
    );
  };


  const ChangePasswordModal = () => {
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPass && newPass !== confirmPass) {
        setMsg('Las contraseñas no coinciden');
        setIsError(true);
        return;
      }
      if (newPass && newPass.length < 6) {
        setMsg('La contraseña debe tener al menos 6 caracteres');
        setIsError(true);
        return;
      }
      if (!newPass && !newUsername) {
        setMsg('Ingrese al menos un dato para actualizar (Usuario o Contraseña)');
        setIsError(true);
        return;
      }

      setLoading(true);
      setMsg('');
      try {
        await handleChangePassword(newPass, newUsername);
        setMsg('Datos actualizados correctamente');
        setIsError(false);
        setTimeout(() => setIsChangePasswordOpen(false), 2000);
      } catch (err: any) {
        setMsg(err.message);
        setIsError(true);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" /> Perfil de Usuario
              </h3>
              <button type="button" onClick={() => setIsChangePasswordOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-4 space-y-4">
              {msg && (
                <div className={`p-3 rounded-lg text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {msg}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nuevo nombre de usuario"
                />
              </div>
              <div className="border-t border-slate-100 my-2 pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña (Opcional)</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                  placeholder="Dejar vacía para no cambiar"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="px-4 py-2 text-slate-600">Cancelar</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Cambiar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain bg-white rounded-lg p-1.5" />
            <h1 className="text-xl font-bold tracking-tight">Modelo Dispatch</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <button onClick={() => handleNav('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" /> Tablero
          </button>
          <button onClick={() => handleNav('matches')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'matches' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ClipboardList className="w-5 h-5" /> Coberturas
          </button>
          <button onClick={() => handleNav('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <History className="w-5 h-5" /> Historial
          </button>
          <button onClick={() => handleNav('clients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'clients' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Building className="w-5 h-5" /> Clientes
          </button>
          <button onClick={() => handleNav('fleet')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'fleet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Truck className="w-5 h-5" /> Flota
          </button>
          <button onClick={() => handleNav('staff')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Users className="w-5 h-5" /> Personal
          </button>
          <button onClick={() => handleNav('locations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'locations' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <MapPin className="w-5 h-5" /> Lugares
          </button>
          <button onClick={() => handleNav('fuel')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'fuel' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Fuel className="w-5 h-5" /> Combustible
          </button>
        </nav>

        <div className="absolute bottom-4 left-0 w-full px-4 space-y-2">
          <button onClick={() => setIsChangePasswordOpen(true)} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <Key className="w-4 h-4" /> Cambiar Contraseña
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm">
            <LogIn className="w-4 h-4 rotate-180" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
          <button className="lg:hidden text-slate-500" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-bold text-slate-800 hidden lg:block">
            {activeTab === 'dashboard' && 'Tablero de Control'}
            {activeTab === 'matches' && 'Agenda de Coberturas'}
            {activeTab === 'history' && 'Historial de Servicios'}
            {activeTab === 'fleet' && 'Gestión de Flota'}
            {activeTab === 'staff' && 'Personal Médico y Choferes'}
            {activeTab === 'locations' && 'Lugares y Sedes'}
            {activeTab === 'fuel' && 'Control de Combustible'}
            {activeTab === 'clients' && 'Gestión de Clientes'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setDailyAgendaDate(new Date().toISOString().split('T')[0]); setIsDailyAgendaOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 text-sm font-medium transition-colors"
            >
              <Calendar className="w-4 h-4" /> Agenda Diaria
            </button>
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
              A
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
              <p>Cargando datos desde la base de datos...</p>
            </div>
          ) : (
            <>
              {/* DASHBOARD */}
              {activeTab === 'dashboard' && (
                <>
                  {/* ... [No changes here] ... */}
                  <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-700">Resumen Operativo</h2>
                      <p className="text-slate-500 text-sm">Bienvenido al panel de control</p>
                    </div>
                    <DashboardClock />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start md:gap-4 text-center md:text-left">
                      <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-lg mb-2 md:mb-0">
                        <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500 font-medium whitespace-nowrap">Pendientes</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800">{futureMatches.length}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start md:gap-4 text-center md:text-left">
                      <div className="p-2 md:p-3 bg-emerald-50 text-emerald-600 rounded-lg mb-2 md:mb-0">
                        <Users className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500 font-medium whitespace-nowrap">Personal</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800">{staff.length}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start md:gap-4 text-center md:text-left">
                      <div className="p-2 md:p-3 bg-violet-50 text-violet-600 rounded-lg mb-2 md:mb-0">
                        <Ambulance className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500 font-medium whitespace-nowrap">Móviles</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-800">{ambulances.filter(a => a.maintenance?.status === 'Active').length}</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center md:items-start md:gap-4 text-center md:text-left">
                      <div className={`p-2 md:p-3 rounded-lg mb-2 md:mb-0 ${superpositionCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
                        <AlertTriangle className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div>
                        <p className="text-xs md:text-sm text-slate-500 font-medium whitespace-nowrap">Conflictos</p>
                        <p className={`text-xl md:text-2xl font-bold ${superpositionCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{superpositionCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                      <h3 className="text-lg font-bold mb-4">Próximas Coberturas</h3>
                      <div className="space-y-3">
                        {futureMatches.filter(m => m.status !== 'Suspended').slice(0, 5).map(match => (
                          <div key={match.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center justify-center bg-white border border-slate-200 w-12 h-12 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                                <span>{formatDateAR(match.date).split('/')[0]}</span>
                                <span className="text-[10px] uppercase">{new Date(match.date).toLocaleString('es-AR', { month: 'short' })}</span>
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{match.location} {match.fieldNumber && <span className="text-slate-500 font-normal">- {match.fieldNumber}</span>}</p>
                                <p className="text-sm text-slate-500">{formatTime24(match.time)} hs - {match.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{match.status === 'Pending' ? 'Pendiente' : 'Confirmado'}</span>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteMatch(match.id); }} className="text-slate-400 hover:text-red-500 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {futureMatches.length === 0 && <p className="text-slate-400 text-center py-4">No hay coberturas próximas.</p>}
                      </div>
                    </div>

                    <FleetStatusWidget ambulances={ambulances} matches={matches} />
                  </div>
                </>
              )}

              {/* MATCHES & HISTORY TABS */}
              {(activeTab === 'matches' || activeTab === 'history') && (
                <div className="space-y-6">
                  {/* ... [Matches Code remains the same] ... */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700'}`}>
                          <Filter className="w-4 h-4" /> Filtros
                        </button>
                        {activeTab === 'history' && (
                          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                            <FileSpreadsheet className="w-4 h-4" /> Exportar Excel
                          </button>
                        )}
                      </div>
                      {activeTab === 'matches' && (
                        <div className="flex gap-2">
                          <button onClick={() => {
                            const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
                            setQuickAddDate(tmr.toISOString().split('T')[0]);
                            setQuickAddRows([{ id: Math.random().toString(), time: '14:00', location: '', fieldNumber: '', ambulanceId: '', driverId: '', nurseId: '', type: 'Partido de Polo' }]);
                            setIsQuickAddModalOpen(true);
                          }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 shadow-md transition-all font-medium whitespace-nowrap">
                            <Zap className="w-4 h-4 fill-white" /> Carga Rápida
                          </button>
                          <button onClick={() => { setEditingMatch(null); setIsMatchModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all shadow-indigo-200 font-medium whitespace-nowrap">
                            <Plus className="w-5 h-5" /> Nueva Cobertura
                          </button>
                        </div>
                      )}
                    </div>

                    {showFilters && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2">
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

                  <div className="space-y-4">
                    {filteredMatches.map((match, index) => {
                      // ... [Mapping of Match Card remains the same]
                      const amb = ambulances.find(a => a.id === match.ambulanceId);
                      const driver = staff.find(s => s.id === match.driverId);
                      const nurse = staff.find(s => s.id === match.nurseId);
                      const third = staff.find(s => s.id === match.thirdCrewId);
                      const client = clients.find(c => c.id === match.clientId);

                      const { hard: conflicts, shared: sharedConflicts } = activeTab === 'matches' ? getConflicts(match, matches) : { hard: [], shared: [] };
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
                            <div className="py-2 text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 mt-6 mb-2">
                              {currentMonth}
                            </div>
                          )}

                          <div className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow group ${isSuspended ? 'border-slate-200 opacity-75 bg-slate-50' : 'border-slate-100'}`}>
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-32 bg-slate-50 p-4 flex flex-row md:flex-col items-center md:justify-center justify-between border-b md:border-b-0 md:border-r border-slate-100 gap-2">
                                <div className="text-center">
                                  <span className={`block text-2xl font-bold ${isSuspended ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{formatDateAR(match.date).split('/')[0]}</span>
                                  <span className="block text-xs uppercase font-bold text-slate-500">{new Date(match.date).toLocaleString('es-AR', { month: 'short' })}</span>
                                </div>
                                <div className="text-center md:mt-2">
                                  <span className={`block text-xl font-bold ${isSuspended ? 'text-slate-400' : isConflicted ? 'text-red-600' : 'text-slate-800'}`}>{formatTime24(match.time)}</span>
                                  {!isSuspended && <span className="text-xs text-slate-400 block mt-1">fin ~{formatTime24(endTime)} {match.extensionMinutes ? `(+${match.extensionMinutes}m)` : ''}</span>}
                                </div>
                              </div>

                              <div className="flex-1 p-4 space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <h3 className={`font-bold text-lg flex items-center gap-2 ${isSuspended ? 'text-slate-500' : 'text-slate-800'}`}>
                                      {match.location}
                                      <span className="font-normal text-slate-500 text-base">{match.fieldNumber ? `- ${match.fieldNumber}` : ''}</span>
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">{match.type}</span>
                                      {isSuspended && (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-xs font-bold border border-slate-300 flex items-center gap-1">
                                          <Ban className="w-3 h-3" /> SUSPENDIDO
                                        </span>
                                      )}
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
                                        <span key={idx} className="text-[10px] text-red-600 mt-1 max-w-[200px] text-right truncate font-medium">
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
                                        <span key={idx} className="text-[10px] text-orange-600 mt-1 max-w-[200px] text-right truncate font-medium">
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
                                      {getAmbulanceIcon(amb?.vehicleType, "w-4 h-4 text-slate-400")}
                                      <span className={amb ? '' : 'text-slate-400 italic'}>
                                        {amb ? `Móvil ${amb.number} ${amb.isOutsourced ? `(${amb.plate || 'Ext'})` : ''}` : 'Sin Asignar'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-slate-400" />
                                      <div className="flex gap-2">
                                        {match.isSingleCrew ? (
                                          <span className="text-indigo-600 font-medium bg-indigo-50 px-2 rounded-full text-xs flex items-center">
                                            {driver?.name || nurse?.name || 'S/D'} <span className="ml-1 text-xs opacity-75">(Trip. Simple)</span>
                                          </span>
                                        ) : (
                                          <>
                                            <span className={driver ? '' : 'text-slate-400 italic'}>{driver?.name || 'Chofer --'}</span>
                                            <span className="text-slate-300">/</span>
                                            <span className={nurse ? '' : 'text-slate-400 italic'}>{nurse?.name || 'Enfermero --'}</span>
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
                                        <Briefcase className="w-3 h-3 text-slate-400" />
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
                                        <FileText className="w-3 h-3 inline mr-1 text-slate-400" />
                                        {match.incidentReport.details}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="p-4 flex md:flex-col gap-2 items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50 md:bg-white min-w-[60px]">
                                {activeTab === 'matches' && (
                                  <>
                                    {!isSuspended && (
                                      <button onClick={(e) => { e.stopPropagation(); setReportingMatch(match); setIncidentForm(match.incidentReport || { hasIncident: false, wasTransferred: false, details: '' }); setIsIncidentModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Reportar Incidente / Cerrar">
                                        <ClipboardList className="w-5 h-5" />
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setIsMatchModalOpen(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Editar">
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                {activeTab === 'history' && (
                                  <>
                                    {match.auditLog && match.auditLog.length > 0 && (
                                      <button onClick={(e) => { e.stopPropagation(); setViewingAuditMatch(match); setIsAuditModalOpen(true); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Historial de Cambios">
                                        <HistoryIcon className="w-5 h-5" />
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setEditingMatch(match); setIsMatchModalOpen(true); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Ver Detalles / Editar">
                                      <Edit2 className="w-5 h-5" />
                                    </button>
                                  </>
                                )}
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteMatch(match.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Cobertura">
                                  <Trash2 className="w-5 h-5" />
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
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Truck className="w-5 h-5" /> Flota de Ambulancias</h3>
                    <button onClick={() => {
                      setEditingAmbulance(null);
                      setAmbFormShowOutsourced(false);
                      setAmbFormShowWorkshop(false);
                      setIsAmbulanceModalOpen(true);
                    }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Agregar Móvil</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ambulances.map(amb => (
                      <div key={amb.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-2">
                          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">{getAmbulanceIcon(amb.vehicleType, "w-8 h-8")}</div>
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${amb.maintenance?.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : amb.maintenance?.status === 'InRepair' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {amb.maintenance?.status === 'Active' ? 'Operativo' : amb.maintenance?.status === 'InRepair' ? 'En Taller' : 'Fuera de Servicio'}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-slate-800">Móvil {amb.number}</h4>
                        <p className="text-sm text-slate-500 font-medium mb-3">{amb.vehicleType || 'Vehículo'} {amb.year ? `(${amb.year})` : ''}</p>
                        <button onClick={() => setViewingAmbulance(amb)} className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                          Ver Detalles
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other tabs remain identical... */}
              {activeTab === 'staff' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users className="w-5 h-5" /> Personal</h3>
                    <button onClick={() => { setEditingStaff(null); setIsStaffModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Agregar Personal</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staff.map(s => (
                      <div key={s.id} onClick={() => setViewingStaff(s)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer relative group">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${s.role === 'Chofer' ? 'bg-slate-600' : s.role === 'Médico/a' ? 'bg-teal-500' : 'bg-indigo-500'}`}>{s.name.charAt(0)}</div>
                        <div>
                          <h4 className="font-bold text-slate-800">{s.name}</h4>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.role} {s.isOutsourced ? '(Ext)' : ''}</p>
                          <p className="text-sm text-slate-600 flex items-center gap-1 mt-1"><Phone className="w-3 h-3" /> {s.phone}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setEditingStaff(s); setIsStaffModalOpen(true); }} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'locations' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-5 h-5" /> Lugares</h3>
                    <button onClick={() => { setEditingLocation(null); setIsLocationModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Agregar Lugar</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {locations.map(l => (
                      <div key={l.id} onClick={() => setViewingLocation(l)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {l.name}</h4>
                        {l.contactName && <p className="text-sm text-slate-600 mt-2">Contacto: {l.contactName}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'clients' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Building className="w-5 h-5" /> Clientes</h3>
                    <button onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Agregar Cliente</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map(c => (
                      <div key={c.id} onClick={() => setViewingClient(c)} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer group">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-800 text-lg">{c.name}</h4>
                          <button onClick={(e) => { e.stopPropagation(); setEditingClient(c); setIsClientModalOpen(true); }} className="text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'fuel' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2"><Fuel className="w-5 h-5" /> Registro de Combustible</h3>
                    <button onClick={() => setIsBatchFuelModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Carga Masiva</button>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                        <tr>
                          <th className="p-3 text-left">Fecha</th>
                          <th className="p-3 text-left">Móvil</th>
                          <th className="p-3 text-left">Chofer</th>
                          <th className="p-3 text-left">Litros</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[...fuelRecords].reverse().map(rec => {
                          const amb = ambulances.find(a => a.id === rec.ambulanceId);
                          const drv = staff.find(s => s.id === rec.driverId);
                          return (
                            <tr key={rec.id} className="hover:bg-slate-50">
                              <td className="p-3">{formatDateAR(rec.date)}</td>
                              <td className="p-3 font-medium text-slate-800">Móvil {amb?.number || '--'}</td>
                              <td className="p-3">{drv?.name || '--'}</td>
                              <td className="p-3 font-mono">{rec.liters.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* Modals */}
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

      {isAuditModalOpen && <AuditModal />}
      {isDailyAgendaOpen && <DailyAgendaModal />}
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
        />
      )}
      {isBatchFuelModalOpen && <FuelBatchModal />}
      {isChangePasswordOpen && <ChangePasswordModal />}
      {viewingStaff && <StaffHistoryModal />}
      {viewingAmbulance && (
        <AmbulanceDetailModal
          isOpen={!!viewingAmbulance}
          onClose={() => setViewingAmbulance(null)}
          ambulance={viewingAmbulance}
          matches={matches}
          fuelRecords={fuelRecords}
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
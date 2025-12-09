
export type Role = 'Chofer' | 'Enfermero/a' | 'Médico/a';

export interface Staff {
  id: string;
  name: string;
  role: Role;
  phone: string;
  isOutsourced?: boolean; // If staff is external
  companyName?: string; // Name of the external company
}

export type AmbulanceStatus = 'Active' | 'InRepair' | 'OutOfService';

export interface Ambulance {
  id: string;
  number: string; // e.g., "2", "22", or "T-1"
  plate?: string; // Patente / Dominio
  year?: number; // Vehicle Year
  isOutsourced: boolean;
  outsourcedCompanyName?: string; // New: Name of owner/company if outsourced
  notes?: string;
  vehicleType?: string; // e.g., "Ford Transit", "Kangoo"
  coachBuilder?: string; // Carrocera e.g., "Vallé", "Colcar"
  maintenance?: {
    status: AmbulanceStatus;
    mileage?: string;
    mileageLastUpdate?: string; // Date of last mileage check
    lastServiceDate?: string;
    nextServiceDate?: string;
    mechanicNotes?: string;
    vtvExpiration?: string; // Vencimiento VTV
    insurance?: string; // Compañía de Seguro
    tireType?: string; // Tipo de Cubierta e.g., "Michelin 225/70 R15"
    oilType?: string; // New: Tipo de Aceite
    batteryLastChange?: string; // Date of last battery change
    batteryType?: string; // e.g. "12V 110Ah"
    batteryPurchaseLocation?: string; // e.g. "Baterías Warnes"
    workshopName?: string; // New: Name of workshop if InRepair
    mechanicContact?: string; // New: Contact of mechanic if InRepair
  };
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  notes?: string;
}

export interface Location {
  id: string;
  name: string; // e.g., "Cancha 1 - Palermo"
  address?: string;
  googleMapsUrl?: string; // Google Maps Link
  notes?: string;
  contactName?: string;
  contactPhone?: string;
}

export type MatchType = 'Partido de Polo' | 'Práctica de Polo' | 'Triangular de Polo' | 'Partido de Fútbol' | 'Evento';

export interface IncidentReport {
  hasIncident: boolean;
  wasTransferred: boolean;
  details: string;
}

export interface AuditLogEntry {
  date: string; // ISO String
  changes: string; // Text description of changes
}

export interface Match {
  id: string;
  location: string; // Venue name
  fieldNumber?: string; // Specific field number or detail (e.g. "Cancha 2", "Principal")
  date: string; // ISO Date string YYYY-MM-DD
  time: string; // HH:mm (Start Time)
  endTime?: string; // HH:mm (End Time - specific for Events)
  type: MatchType;
  durationMinutes: number; // Avg 90 or calculated
  extensionMinutes?: number; // Extra time added
  chukkers?: number; // Specific for Polo
  
  // Client / Contractor Info
  clientId?: string; // New: Link to Client ID
  hiredBy?: string;  // Legacy: string name
  hiredContact?: string;

  // Assignments (Optional because they might be pending)
  ambulanceId?: string;
  driverId?: string;
  nurseId?: string;
  thirdCrewId?: string; // Optional 3rd member (Doctor or helper)
  isSingleCrew?: boolean; // If true, only 1 person is sent
  
  // Notification Status
  driverNotified?: boolean;
  nurseNotified?: boolean;
  
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Suspended'; // New: Suspended status
  suspensionReason?: string; // New: Reason for suspension

  // Post-match report
  incidentReport?: IncidentReport;

  // Change Log
  auditLog?: AuditLogEntry[];
}

export interface FuelRecord {
  id: string;
  date: string; // YYYY-MM-DD
  ambulanceId: string;
  driverId: string;
  fuelType: string; // 'Euro Diesel', 'Nafta Super', etc.
  liters: number;
  items?: string; // Extra items like "Franela", "Aceite"
}

export interface AppState {
  matches: Match[];
  staff: Staff[];
  ambulances: Ambulance[];
  locations: Location[];
  fuelRecords: FuelRecord[];
  clients: Client[];
}

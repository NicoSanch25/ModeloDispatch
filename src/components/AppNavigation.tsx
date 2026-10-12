import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Ambulance, Building, ClipboardCheck, Fuel, History, LayoutDashboard,
  MapPin, Menu, ReceiptText, Truck, Users
} from 'lucide-react';

export type SectionId =
  | 'dashboard' | 'matches' | 'transfers' | 'history' | 'clients'
  | 'business' | 'fleet' | 'staff' | 'locations' | 'fuel';

interface Section {
  id: SectionId;
  /** Nombre corto: menú lateral y barra inferior. */
  label: string;
  /** Título del encabezado. */
  title: string;
  icon: LucideIcon;
}

/** Secciones en el orden del menú lateral. Única fuente para menú, encabezado y barra inferior. */
export const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Tablero', title: 'Tablero de Control', icon: LayoutDashboard },
  { id: 'matches', label: 'Coberturas', title: 'Agenda de Coberturas', icon: ClipboardCheck },
  { id: 'transfers', label: 'Traslados', title: 'Registro de Traslados', icon: Ambulance },
  { id: 'history', label: 'Historial', title: 'Historial de Servicios', icon: History },
  { id: 'clients', label: 'Clientes', title: 'Gestión de Clientes', icon: Building },
  { id: 'business', label: 'Administración', title: 'Administración de servicios', icon: ReceiptText },
  { id: 'fleet', label: 'Flota', title: 'Gestión de Flota', icon: Truck },
  { id: 'staff', label: 'Personal', title: 'Personal Médico y Choferes', icon: Users },
  { id: 'locations', label: 'Lugares', title: 'Lugares y Sedes', icon: MapPin },
  { id: 'fuel', label: 'Combustible', title: 'Control de Combustible', icon: Fuel }
];

/** Secciones de uso diario con acceso directo en la barra inferior del celular. */
const PRIMARY: SectionId[] = ['dashboard', 'matches', 'transfers', 'fleet'];

export const sectionTitle = (id: SectionId) => SECTIONS.find(s => s.id === id)?.title ?? '';

const TabButton: React.FC<{ icon: LucideIcon; label: string; current: boolean; onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>> =
  ({ icon: Icon, label, current, onClick, ...rest }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors touch-manipulation ${current ? 'text-indigo-700' : 'text-slate-500 active:text-slate-800'}`}
      {...rest}
    >
      <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${current ? 'bg-indigo-100' : ''}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      {label}
    </button>
  );

interface MobileTabBarProps {
  active: SectionId;
  menuOpen: boolean;
  onNavigate: (id: SectionId) => void;
  onMore: () => void;
}

/**
 * Barra inferior para celular (oculta desde `lg`). Las secciones restantes,
 * cambiar contraseña y cerrar sesión siguen en el menú que abre «Más».
 */
export const MobileTabBar: React.FC<MobileTabBarProps> = ({ active, menuOpen, onNavigate, onMore }) => (
  <nav aria-label="Secciones principales" className="dispatch-tabbar fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
    <ul className="mx-auto grid max-w-lg grid-cols-5">
      {PRIMARY.map(id => {
        const section = SECTIONS.find(s => s.id === id)!;
        return (
          <li key={id}>
            <TabButton
              icon={section.icon}
              label={section.label}
              current={active === id}
              aria-current={active === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            />
          </li>
        );
      })}
      <li>
        <TabButton
          icon={Menu}
          label="Más"
          current={!PRIMARY.includes(active)}
          aria-expanded={menuOpen}
          aria-label={PRIMARY.includes(active) ? 'Más secciones' : `Más secciones (actual: ${SECTIONS.find(s => s.id === active)?.label})`}
          onClick={onMore}
        />
      </li>
    </ul>
  </nav>
);

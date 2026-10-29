import React, { useState } from 'react';
import { Key, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ModalShell } from '../ui/ModalShell';
import { notify } from '../ui/feedback';

interface ChangePasswordModalProps {
  onClose: () => void;
}

const field = 'h-11 w-full rounded-lg border border-slate-300 px-3 outline-none focus:ring-2 focus:ring-indigo-500';

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password && !username.trim()) return setError('Ingresá un nuevo usuario o una nueva contraseña.');
    if (password && password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (password && password !== confirm) return setError('Las contraseñas no coinciden.');
    setSaving(true);
    setError('');
    try {
      const updates: { password?: string; data?: { username: string } } = {};
      if (password) updates.password = password;
      if (username.trim()) updates.data = { username: username.trim() };
      const { error: updateError } = await supabase.auth.updateUser(updates);
      if (updateError) throw updateError;
      notify.success('Perfil actualizado.');
      onClose();
    } catch (err: any) {
      setError(err.message || 'No se pudo actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} busy={saving} labelledBy="password-title">
      <div className="dispatch-modal-panel w-full max-w-sm rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex items-center justify-between rounded-t-2xl border-b bg-slate-50 p-4">
            <h3 id="password-title" className="flex items-center gap-2 font-bold text-slate-800"><Key className="h-5 w-5 text-indigo-600" /> Perfil de usuario</h3>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4 p-4">
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Nombre de usuario</span>
              <input value={username} onChange={e => setUsername(e.target.value)} className={field} placeholder="Dejar vacío para no cambiar" autoComplete="username" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Nueva contraseña</span>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={field} placeholder="Dejar vacía para no cambiar" autoComplete="new-password" />
            </label>
            {password && (
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Repetir contraseña</span>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} className={field} autoComplete="new-password" />
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <button type="button" onClick={onClose} className="h-11 rounded-lg px-4 text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="h-11 rounded-lg bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

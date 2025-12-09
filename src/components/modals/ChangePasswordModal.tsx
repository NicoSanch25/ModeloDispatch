import React, { useState } from 'react';
import { Key, X } from 'lucide-react';
import { authService } from '../../services/auth';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPass !== confirmPass) {
            setMsg('Las contraseñas no coinciden');
            setIsError(true);
            return;
        }
        if (newPass.length < 6) {
            setMsg('La contraseña debe tener al menos 6 caracteres');
            setIsError(true);
            return;
        }
        setLoading(true);
        setMsg('');
        try {
            await authService.updatePassword(newPass);
            setMsg('Contraseña actualizada correctamente');
            setIsError(false);
            setTimeout(() => onClose(), 2000);
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
                            <Key className="w-5 h-5 text-indigo-600" /> Cambiar Contraseña
                        </h3>
                        <button type="button" onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="p-4 space-y-4">
                        {msg && (
                            <div className={`p-3 rounded-lg text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {msg}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={newPass}
                                onChange={e => setNewPass(e.target.value)}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                                required
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
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
                            {loading ? 'Guardando...' : 'Cambiar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

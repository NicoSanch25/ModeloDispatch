import React, { useState } from 'react';
import { authService } from '../../services/auth';
import { Ambulance, AlertCircle, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginScreenProps {
    onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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

        try {
            if (isRegister) {
                await authService.register(username, password);
                // If successful, and no error thrown, we might need to check if session was established
                // But authService.register throws EMAIL_NOT_CONFIRMED if no session.
                const session = await authService.getSession();
                if (session) onLogin();
                else throw new Error("EMAIL_NOT_CONFIRMED"); // Fallback check

            } else {
                await authService.login(username, password);
                onLogin();
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
                    <div className="bg-indigo-600 p-3 rounded-xl">
                        <Ambulance className="w-10 h-10 text-white" />
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
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Ingresar'}
                        </button>

                        <button
                            onClick={() => handleAuth(true)}
                            disabled={loading}
                            className="w-full bg-white border border-slate-300 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
                        >
                            ¿Usuario nuevo? Registrarse
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

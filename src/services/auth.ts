import { supabase } from '../lib/supabase';

// Internal helper to create the "fake" email Supabase needs
const getInternalEmail = (username: string) => {
    // Sanitize username: remove spaces, lowercase, special chars
    const sanitizedUser = username.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    // Using @dispatch.app as per original SQL instructions to match manually created users
    return `${sanitizedUser}@dispatch.app`;
};

export const authService = {
    async login(username: string, password: string) {
        const email = getInternalEmail(username);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Login failed for:", email);
            if (error.message.includes("Invalid login credentials")) {
                throw new Error("Usuario no encontrado o contraseña incorrecta.");
            } else if (error.message.includes("Email not confirmed")) {
                throw new Error("EMAIL_NOT_CONFIRMED");
            } else {
                throw error;
            }
        }
        return data;
    },

    async register(username: string, password: string) {
        const email = getInternalEmail(username);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username: username.trim() } }
        });

        if (error) throw error;

        if (data.user && !data.session) {
            throw new Error("EMAIL_NOT_CONFIRMED");
        }
        return data;
    },

    async logout() {
        return await supabase.auth.signOut();
    },

    async updatePassword(password: string) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
    },

    async getSession() {
        const { data } = await supabase.auth.getSession();
        return data.session;
    },

    onAuthStateChange(callback: (session: any) => void) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            callback(session);
        });
        return subscription;
    }
};

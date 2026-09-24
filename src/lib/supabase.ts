import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configurationError = !url || !key;
// A public key identifies the project; database RLS must authorize every operation.
export const supabase = createClient(url || 'https://unconfigured.supabase.co', key || 'unconfigured');

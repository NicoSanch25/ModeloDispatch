import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwshkajufwzebphmgpdk.supabase.co';
const supabaseKey = 'sb_publishable_rnPaV7Ejqr_axrcxrKnoPQ_hW5_gOQK';

export const supabase = createClient(supabaseUrl, supabaseKey);
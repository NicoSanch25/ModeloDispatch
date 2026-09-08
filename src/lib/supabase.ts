import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iwshkajufwzebphmgpdk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c2hrYWp1Znd6ZWJwaG1ncGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNDk2MTcsImV4cCI6MjA4MDYyNTYxN30.uv-HR-BWPzlkLUwWSCeLSRVgcLdkHMNq_gUi6u_6k8o';

export const supabase = createClient(supabaseUrl, supabaseKey);
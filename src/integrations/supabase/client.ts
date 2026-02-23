import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// URL و Keys الجديدة
const SUPABASE_URL = 'https://puyugteuduuuvjijurjh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QlRPCimPLxvpzRKiBchZSA_dHKRrulq';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1eXVndGV1ZHV1dXZqaWp1cmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjMxMzMsImV4cCI6MjA4NTI5OTEzM30.wZpkRxuEt7aa4Qc5nxWLAAAVOski7qAJzHhjLvWhIvg';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

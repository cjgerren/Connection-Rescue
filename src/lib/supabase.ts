import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Configure the frontend env before using database-backed features.'
  );
}

const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'public-anon-key-not-configured'
);


export { supabase };

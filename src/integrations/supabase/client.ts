import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { ENV } from '@/config/environment';

const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = ENV.SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// ✅ ✅ ✅ ИЗМЕНЕНИЯ: Добавлена конфигурация auth ✅ ✅ ✅
export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    }
  }
);
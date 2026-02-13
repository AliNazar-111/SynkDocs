import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials are missing. Check your environment variables.');
}

// Type-safe Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'sb-auth-token',
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: {
            'x-application-name': 'SynkDocs',
        },
    },
});

// Export types for convenience
export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];

export type Insertable<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];

export type Updatable<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];

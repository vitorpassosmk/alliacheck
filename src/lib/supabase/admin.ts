import { createClient as supabaseCreateClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Service role client — usar APENAS em API Routes, nunca expor no cliente
export const createAdminClient = () =>
  supabaseCreateClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

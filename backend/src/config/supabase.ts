import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias.')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey)
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Supabase yapılandırılmadıysa null; uygulama localStorage fallback'a düşer (Faz 2 test)
export const supabaseEnabled = Boolean(url && anon && !url.includes('YOUR-PROJECT'))

// Oturum tarayıcıda kalıcı: localStorage'da saklanır, token süresi dolunca
// arka planda kendiliğinden yenilenir. Böylece kullanıcı çıkış yapana kadar
// tekrar tekrar login'e atılmaz. (storageKey'e dokunma — değiştirmek mevcut
// oturumları düşürür.)
export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

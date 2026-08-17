import { create } from 'zustand'
import { supabase, supabaseEnabled } from '@/lib/supabase'

export interface AuthUser {
  id: string
  email: string | null
  isAdmin: boolean
}

// Kullanıcının DM (admin) olup olmadığını profiles'tan oku. Hata/eksikte false.
async function fetchIsAdmin(id: string): Promise<boolean> {
  if (!supabase) return false
  const { data } = await supabase.from('profiles').select('is_admin').eq('id', id).maybeSingle()
  return Boolean(data?.is_admin)
}

interface AuthState {
  user: AuthUser | null
  ready: boolean
  init: () => Promise<void>
  signInPassword: (email: string, password: string) => Promise<string | null>
  signUpPassword: (email: string, password: string) => Promise<string | null>
  signInGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
}

const LOCAL_USER: AuthUser = { id: 'local-dev', email: 'yerel@mythweaver', isAdmin: false }

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,

  init: async () => {
    if (!supabaseEnabled || !supabase) {
      // Supabase yok: yerel geliştirme kullanıcısı (RLS ileri fazda)
      set({ user: LOCAL_USER, ready: true })
      return
    }
    const { data } = await supabase.auth.getSession()
    const sUser = data.session?.user
    set({
      user: sUser ? { id: sUser.id, email: sUser.email ?? null, isAdmin: await fetchIsAdmin(sUser.id) } : null,
      ready: true,
    })
    supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user
      set({ user: u ? { id: u.id, email: u.email ?? null, isAdmin: await fetchIsAdmin(u.id) } : null })
    })
  },

  signInPassword: async (email, password) => {
    if (!supabase) return null
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signUpPassword: async (email, password) => {
    if (!supabase) return null
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  },

  signInGoogle: async () => {
    if (!supabase) return null
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    return error?.message ?? null
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut()
    set({ user: supabaseEnabled ? null : LOCAL_USER })
  },
}))

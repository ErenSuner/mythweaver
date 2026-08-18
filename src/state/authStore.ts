import { create } from 'zustand'
import { supabase, supabaseEnabled } from '@/lib/supabase'

export interface AuthUser {
  id: string
  email: string | null
  isAdmin: boolean // kurucu (platform sahibi): tam erişim
  isDm: boolean // campaign yürütebilen DM (kurucu da DM sayılır)
}

// Rolleri oku: is_admin profiles'tan; DM'lik ise bir campaign'e atanmış olmaktan türer
// (dm_user_id = kullanıcı). Kurucu her zaman DM sayılır.
async function fetchRoles(id: string): Promise<{ isAdmin: boolean; isDm: boolean }> {
  if (!supabase) return { isAdmin: false, isDm: false }
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', id).maybeSingle()
  const isAdmin = Boolean(prof?.is_admin)
  if (isAdmin) return { isAdmin: true, isDm: true }
  const { data: camp } = await supabase.from('campaigns').select('id').eq('dm_user_id', id).limit(1)
  return { isAdmin: false, isDm: (camp?.length ?? 0) > 0 }
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

const LOCAL_USER: AuthUser = { id: 'local-dev', email: 'yerel@mythweaver', isAdmin: false, isDm: false }

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
      user: sUser ? { id: sUser.id, email: sUser.email ?? null, ...(await fetchRoles(sUser.id)) } : null,
      ready: true,
    })
    supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user
      set({ user: u ? { id: u.id, email: u.email ?? null, ...(await fetchRoles(u.id)) } : null })
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

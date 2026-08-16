import { create } from 'zustand'
import { supabase, supabaseEnabled } from '@/lib/supabase'

export interface AuthUser {
  id: string
  email: string | null
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

const LOCAL_USER: AuthUser = { id: 'local-dev', email: 'yerel@mythweaver' }

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
    set({ user: data.session ? { id: data.session.user.id, email: data.session.user.email ?? null } : null, ready: true })
    supabase.auth.onAuthStateChange((_e, session) => {
      set({ user: session ? { id: session.user.id, email: session.user.email ?? null } : null })
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

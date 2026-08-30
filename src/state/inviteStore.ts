// Gelen campaign davetleri — TEK kaynak. Zil (InviteMenu), /davetler sayfası,
// /campaign işaretçi paneli ve /hesap satırı hepsi buradan okur; bir yerde
// kabul/red edilince hepsi birden düşer.
// Tazeleme Supabase realtime ile: campaign_invites tablosunda kendi satırlarımız
// değişince liste yeniden çekilir (0008_invites_realtime.sql).
import { create } from 'zustand'
import { supabase, supabaseEnabled } from '@/lib/supabase'
import { listMyInvites, type MyInvite } from '@/lib/social'

interface InviteState {
  invites: MyInvite[]
  /** İlk yükleme tamamlandı mı — kutuda "yükleniyor" ile "boş" ayrımı için. */
  loaded: boolean
  refresh: () => Promise<void>
  /** Realtime aboneliği kurar; temizleyici döner. */
  subscribe: (userId: string | null) => () => void
  reset: () => void
}

export const useInviteStore = create<InviteState>((set, get) => ({
  invites: [],
  loaded: false,

  refresh: async () => {
    if (!supabaseEnabled) {
      set({ invites: [], loaded: true })
      return
    }
    try {
      set({ invites: await listMyInvites(), loaded: true })
    } catch (e) {
      // Ağ/oturum hatası listeyi silmesin; bir sonraki tazelemede toparlanır.
      console.error('[invite] liste hatası', e)
      set({ loaded: true })
    }
  },

  subscribe: (userId) => {
    if (!(supabaseEnabled && supabase) || !userId) return () => {}
    const sb = supabase
    const channel = sb
      .channel(`invites:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_invites', filter: `invitee_id=eq.${userId}` },
        () => {
          // Ham satırda campaign_name / inviter_username yok — RPC'yi yeniden çağır.
          void get().refresh()
        },
      )
      .subscribe()
    return () => {
      void sb.removeChannel(channel)
    }
  },

  reset: () => set({ invites: [], loaded: false }),
}))

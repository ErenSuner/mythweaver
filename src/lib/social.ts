// Sosyal katman veri erişimi: username, kullanıcı arama, campaign daveti, DM devri.
// Tüm yetki Supabase RLS + security-definer RPC ile (0006_usernames_invites_handoff.sql).
import { supabase, supabaseEnabled } from './supabase'

function ensure() {
  if (!(supabaseEnabled && supabase)) throw new Error('Sosyal özellikler yalnız Supabase modunda çalışır')
  return supabase
}

export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/

export interface UserSearchResult {
  id: string
  username: string
}

export interface MyInvite {
  inviteId: string
  campaignId: string
  campaignName: string
  inviterUsername: string | null
  createdAt: string
}

export interface CampaignInvite {
  inviteId: string
  inviteeId: string
  inviteeUsername: string | null
  status: string
  createdAt: string
}

// ---- Username ----

/** Oturumdaki kullanıcının username'i (null = henüz belirlenmemiş). */
export async function getMyUsername(): Promise<string | null> {
  const sb = ensure()
  const { data: auth, error: uerr } = await sb.auth.getUser()
  if (uerr) throw uerr
  if (!auth.user) return null
  const { data, error } = await sb.from('profiles').select('username').eq('id', auth.user.id).maybeSingle()
  if (error) throw error
  return (data?.username as string | null) ?? null
}

/** username belirle/değiştir. Benzersizlik/format DB'de zorlanır. */
export async function setUsername(username: string): Promise<void> {
  const sb = ensure()
  const { data: auth, error: uerr } = await sb.auth.getUser()
  if (uerr) throw uerr
  if (!auth.user) throw new Error('Oturum bulunamadı')
  const { error } = await sb.from('profiles').update({ username }).eq('id', auth.user.id)
  if (error) throw error
}

// ---- Kullanıcı arama ----

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const sb = ensure()
  const { data, error } = await sb.rpc('search_users', { query })
  if (error) throw error
  return (data || []) as UserSearchResult[]
}

// ---- Davet (DM tarafı) ----

export async function sendInvite(campaignId: string, inviteeId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.rpc('send_invite', { p_campaign_id: campaignId, p_invitee_id: inviteeId })
  if (error) throw error
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.rpc('cancel_invite', { p_invite_id: inviteId })
  if (error) throw error
}

export async function listCampaignInvites(campaignId: string): Promise<CampaignInvite[]> {
  const sb = ensure()
  const { data, error } = await sb.rpc('list_campaign_invites', { p_campaign_id: campaignId })
  if (error) throw error
  return ((data || []) as Array<Record<string, unknown>>).map((r) => ({
    inviteId: r.invite_id as string,
    inviteeId: r.invitee_id as string,
    inviteeUsername: (r.invitee_username as string | null) ?? null,
    status: r.status as string,
    createdAt: r.created_at as string,
  }))
}

// ---- Davet (davetli tarafı) ----

export async function listMyInvites(): Promise<MyInvite[]> {
  const sb = ensure()
  const { data, error } = await sb.rpc('list_my_invites')
  if (error) throw error
  return ((data || []) as Array<Record<string, unknown>>).map((r) => ({
    inviteId: r.invite_id as string,
    campaignId: r.campaign_id as string,
    campaignName: r.campaign_name as string,
    inviterUsername: (r.inviter_username as string | null) ?? null,
    createdAt: r.created_at as string,
  }))
}

export async function acceptInvite(inviteId: string, characterId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.rpc('accept_invite', { p_invite_id: inviteId, p_character_id: characterId })
  if (error) throw error
}

export async function declineInvite(inviteId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.rpc('decline_invite', { p_invite_id: inviteId })
  if (error) throw error
}

// ---- DM devri ----

export async function transferDm(campaignId: string, newDmUserId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.rpc('transfer_dm', { p_campaign_id: campaignId, p_new_dm: newDmUserId })
  if (error) throw error
}

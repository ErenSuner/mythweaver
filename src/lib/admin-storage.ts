// DM (admin) veri katmanı. Yalnız is_admin kullanıcı için anlamlı; tüm erişim
// Supabase RLS ile korunur (0002_dm_panel.sql). storage.ts'i bozmadan ayrı tutar.
import { supabase, supabaseEnabled } from './supabase'
import { migrateCharacter } from './storage'
import type { Character } from '@/types/character'

export interface Campaign {
  id: string
  name: string
  created_at: string
  dm_user_id: string | null
}

export interface AdminCharacterRow {
  character: Character
  ownerId: string
  ownerEmail: string | null
  campaignId: string | null
}

function ensure() {
  if (!(supabaseEnabled && supabase)) throw new Error('DM paneli yalnız Supabase modunda çalışır')
  return supabase
}

// ---- Campaign CRUD ----

export async function adminListCampaigns(): Promise<Campaign[]> {
  const sb = ensure()
  const { data, error } = await sb.from('campaigns').select('id, name, created_at, dm_user_id').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Campaign[]
}

export async function createCampaign(name: string): Promise<Campaign> {
  const sb = ensure()
  // Campaign'i kuran otomatik o campaign'in DM'i olur (dm_user_id = kendisi).
  // RLS insert policy'si (0005) with-check dm_user_id = auth.uid() bunu zorunlu kılar.
  const { data: auth, error: uerr } = await sb.auth.getUser()
  if (uerr) throw uerr
  if (!auth.user) throw new Error('Oturum bulunamadı')
  const { data, error } = await sb
    .from('campaigns')
    .insert({ name, dm_user_id: auth.user.id })
    .select('id, name, created_at, dm_user_id')
    .single()
  if (error) throw error
  return data as Campaign
}

/** Campaign'e DM ata veya kaldır (null). Yalnız kurucu (RLS). */
export async function setCampaignDm(campaignId: string, userId: string | null): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('campaigns').update({ dm_user_id: userId }).eq('id', campaignId)
  if (error) throw error
}

export interface CampaignWithDm {
  id: string
  name: string
  dmUserId: string | null
  dmEmail: string | null
}

/** Tüm campaign'ler + atanan DM e-postası (kurucu görünümü). */
export async function listCampaignsWithDm(): Promise<CampaignWithDm[]> {
  const sb = ensure()
  const [campRes, profRes] = await Promise.all([
    sb.from('campaigns').select('id, name, dm_user_id').order('created_at', { ascending: true }),
    sb.from('profiles').select('id, email'),
  ])
  if (campRes.error) throw campRes.error
  if (profRes.error) throw profRes.error
  const emailOf = new Map<string, string | null>()
  for (const p of profRes.data || []) emailOf.set(p.id as string, (p.email as string | null) ?? null)
  return (campRes.data || []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    dmUserId: (c.dm_user_id as string | null) ?? null,
    dmEmail: c.dm_user_id ? emailOf.get(c.dm_user_id as string) ?? null : null,
  }))
}

export async function renameCampaign(id: string, name: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('campaigns').update({ name }).eq('id', id)
  if (error) throw error
}

export async function deleteCampaign(id: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('campaigns').delete().eq('id', id)
  if (error) throw error
}

// ---- Karakter listeleme (owner + campaign bilgisiyle) ----

export type CharacterFilter = string | 'all' | 'unassigned'

/** Karakterleri owner e-postası ve campaign üyeliğiyle birlikte döndürür. */
export async function adminListCharacters(filter: CharacterFilter): Promise<AdminCharacterRow[]> {
  const sb = ensure()
  const [chRes, memRes, profRes] = await Promise.all([
    sb.from('characters').select('id, user_id, data'),
    sb.from('campaign_members').select('character_id, campaign_id'),
    sb.from('profiles').select('id, email'),
  ])
  if (chRes.error) throw chRes.error
  if (memRes.error) throw memRes.error
  if (profRes.error) throw profRes.error

  const campaignOf = new Map<string, string>()
  for (const m of memRes.data || []) campaignOf.set(m.character_id as string, m.campaign_id as string)
  const emailOf = new Map<string, string | null>()
  for (const p of profRes.data || []) emailOf.set(p.id as string, (p.email as string | null) ?? null)

  const rows: AdminCharacterRow[] = (chRes.data || []).map((r) => ({
    character: migrateCharacter(r.data as Character),
    ownerId: r.user_id as string,
    ownerEmail: emailOf.get(r.user_id as string) ?? null,
    campaignId: campaignOf.get(r.id as string) ?? null,
  }))

  if (filter === 'all') return rows
  if (filter === 'unassigned') return rows.filter((r) => r.campaignId === null)
  return rows.filter((r) => r.campaignId === filter)
}

// ---- Üyelik ata/çıkar ----

export async function assignCharacter(characterId: string, campaignId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb
    .from('campaign_members')
    .upsert({ character_id: characterId, campaign_id: campaignId }, { onConflict: 'character_id' })
  if (error) throw error
}

export async function unassignCharacter(characterId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('campaign_members').delete().eq('character_id', characterId)
  if (error) throw error
}

// ---- Tekil oku / owner-safe kaydet ----

export async function adminGetCharacter(id: string): Promise<AdminCharacterRow | null> {
  const sb = ensure()
  const { data, error } = await sb.from('characters').select('id, user_id, data').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) return null
  const { data: prof } = await sb.from('profiles').select('email').eq('id', data.user_id as string).maybeSingle()
  return {
    character: migrateCharacter(data.data as Character),
    ownerId: data.user_id as string,
    ownerEmail: (prof?.email as string | null) ?? null,
    campaignId: null,
  }
}

/**
 * DM düzenlemesini kaydeder. user_id owner'da bırakılır (DM'e kaymaz) — hem burada
 * hem DB'de (characters_lock_owner trigger'ı) korunur.
 */
export async function adminSaveCharacter(char: Character, ownerId: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('characters').upsert(
    { id: char.id, user_id: ownerId, data: char, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  )
  if (error) throw error
}

// ---- Kurucu (founder) ops — yalnız is_admin için anlamlı (RLS korur) ----

export interface UserRow {
  id: string
  email: string | null
  isAdmin: boolean
  characterCount: number
}

/** Tüm kullanıcılar; kurucu rolü ve karakter sayılarıyla. */
export async function listUsers(): Promise<UserRow[]> {
  const sb = ensure()
  const [profRes, chRes] = await Promise.all([
    sb.from('profiles').select('id, email, is_admin'),
    sb.from('characters').select('user_id'),
  ])
  if (profRes.error) throw profRes.error
  if (chRes.error) throw chRes.error

  const count = new Map<string, number>()
  for (const r of chRes.data || []) {
    const uid = r.user_id as string
    count.set(uid, (count.get(uid) ?? 0) + 1)
  }
  return (profRes.data || []).map((p) => ({
    id: p.id as string,
    email: (p.email as string | null) ?? null,
    isAdmin: Boolean(p.is_admin),
    characterCount: count.get(p.id as string) ?? 0,
  }))
}

/** Kullanıcının kurucu (is_admin) rolünü değiştirir (kurucu). */
export async function setUserRole(userId: string, patch: { is_admin?: boolean }): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}

export interface PlatformStats {
  users: number
  characters: number
  completed: number
  drafts: number
  campaigns: number
}

/** Platform geneli sayılar. */
export async function platformStats(): Promise<PlatformStats> {
  const sb = ensure()
  const [profRes, chRes, campRes] = await Promise.all([
    sb.from('profiles').select('id'),
    sb.from('characters').select('data'),
    sb.from('campaigns').select('id'),
  ])
  if (profRes.error) throw profRes.error
  if (chRes.error) throw chRes.error
  if (campRes.error) throw campRes.error

  const chars = chRes.data || []
  const completed = chars.filter((r) => (r.data as Character)?.completed).length
  return {
    users: (profRes.data || []).length,
    characters: chars.length,
    completed,
    drafts: chars.length - completed,
    campaigns: (campRes.data || []).length,
  }
}

export interface AuditRow {
  id: string
  characterId: string
  editorEmail: string | null
  ownerEmail: string | null
  editedAt: string
}

/** Son N denetim kaydı: DM'in başka oyuncunun karakterini düzenlemesi. */
export async function listAuditLog(limit = 50): Promise<AuditRow[]> {
  const sb = ensure()
  const { data, error } = await sb
    .from('character_edit_log')
    .select('id, character_id, editor_id, owner_id, edited_at')
    .order('edited_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = data || []

  const ids = new Set<string>()
  for (const r of rows) {
    if (r.editor_id) ids.add(r.editor_id as string)
    if (r.owner_id) ids.add(r.owner_id as string)
  }
  const emailOf = new Map<string, string | null>()
  if (ids.size) {
    const { data: profs } = await sb.from('profiles').select('id, email').in('id', Array.from(ids))
    for (const p of profs || []) emailOf.set(p.id as string, (p.email as string | null) ?? null)
  }

  return rows.map((r) => ({
    id: r.id as string,
    characterId: r.character_id as string,
    editorEmail: r.editor_id ? emailOf.get(r.editor_id as string) ?? null : null,
    ownerEmail: r.owner_id ? emailOf.get(r.owner_id as string) ?? null : null,
    editedAt: r.edited_at as string,
  }))
}

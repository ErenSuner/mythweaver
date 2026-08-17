// DM (admin) veri katmanı. Yalnız is_admin kullanıcı için anlamlı; tüm erişim
// Supabase RLS ile korunur (0002_dm_panel.sql). storage.ts'i bozmadan ayrı tutar.
import { supabase, supabaseEnabled } from './supabase'
import { migrateCharacter } from './storage'
import type { Character } from '@/types/character'

export interface Campaign {
  id: string
  name: string
  created_at: string
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

async function currentUserId(): Promise<string> {
  const sb = ensure()
  const { data } = await sb.auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error('Oturum bulunamadı')
  return id
}

// ---- Campaign CRUD ----

export async function adminListCampaigns(): Promise<Campaign[]> {
  const sb = ensure()
  const { data, error } = await sb.from('campaigns').select('id, name, created_at').order('created_at', { ascending: true })
  if (error) throw error
  return (data || []) as Campaign[]
}

export async function createCampaign(name: string): Promise<Campaign> {
  const sb = ensure()
  const dm_user_id = await currentUserId()
  const { data, error } = await sb.from('campaigns').insert({ name, dm_user_id }).select('id, name, created_at').single()
  if (error) throw error
  return data as Campaign
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

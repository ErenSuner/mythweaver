// Evren (universe) veri erişimi. Yetki Supabase RLS ile (0007_universes.sql):
// herkes evren kurar/kendininkini yönetir; okuma sahip/kurucu/ilgili campaign üyeleri.
import { supabase, supabaseEnabled } from './supabase'

function ensure() {
  if (!(supabaseEnabled && supabase)) throw new Error('Evren özellikleri yalnız Supabase modunda çalışır')
  return supabase
}

/** Bir evren lore'unun en fazla görünür karakter sayısı (markup sayılmaz).
 *  Server tarafında 0009_universe_quota.sql aynı sınırı dayatır. */
export const LORE_MAX_CHARS = 10_000
/** Kullanıcı başına en fazla evren sayısı (server: 0009_universe_quota.sql). */
export const MAX_UNIVERSES = 10

export interface Universe {
  id: string
  ownerId: string
  name: string
  description: string | null
  updatedAt: string
}

function mapRow(r: Record<string, unknown>): Universe {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    updatedAt: (r.updated_at as string) ?? '',
  }
}

/** Çağıranın okuyabildiği evrenler (sahip olduğu + RLS erişimi olanlar). */
export async function listMyUniverses(): Promise<Universe[]> {
  const sb = ensure()
  const { data: auth } = await sb.auth.getUser()
  const uid = auth.user?.id
  let q = sb.from('universes').select('id, owner_id, name, description, updated_at').order('created_at', { ascending: true })
  if (uid) q = q.eq('owner_id', uid)
  const { data, error } = await q
  if (error) throw error
  return (data || []).map(mapRow)
}

/** Kurucu: belirli bir kullanıcının evrenleri. RLS (universes_admin_all) izin
 *  verdiği için başkasının evrenlerini de döndürür — yalnız is_admin çalıştırır. */
export async function adminListUniverses(ownerId: string): Promise<Universe[]> {
  const sb = ensure()
  const { data, error } = await sb
    .from('universes')
    .select('id, owner_id, name, description, updated_at')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(mapRow)
}

export async function getUniverse(id: string): Promise<Universe | null> {
  const sb = ensure()
  const { data, error } = await sb
    .from('universes')
    .select('id, owner_id, name, description, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function createUniverse(name: string, description: string): Promise<Universe> {
  const sb = ensure()
  const { data: auth, error: uerr } = await sb.auth.getUser()
  if (uerr) throw uerr
  if (!auth.user) throw new Error('Oturum bulunamadı')
  const { data, error } = await sb
    .from('universes')
    .insert({ owner_id: auth.user.id, name, description })
    .select('id, owner_id, name, description, updated_at')
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function updateUniverse(id: string, patch: { name?: string; description?: string }): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('universes').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function deleteUniverse(id: string): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('universes').delete().eq('id', id)
  if (error) throw error
}

/** Campaign'e evren ata (veya null ile kaldır). Yalnız o campaign'in DM'i/kurucu (RLS). */
export async function assignUniverse(campaignId: string, universeId: string | null): Promise<void> {
  const sb = ensure()
  const { error } = await sb.from('campaigns').update({ universe_id: universeId }).eq('id', campaignId)
  if (error) throw error
}

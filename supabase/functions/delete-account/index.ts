// Mythweaver — hesap silme edge function (Supabase Deno runtime).
//
// Neden gerekli: client yalnız anon key taşır ve auth.users satırını silemez.
// Bu function, çağıranın oturum access token'ından kimliği doğrular, sonra
// service-role ile SADECE o kullanıcıyı siler. characters/profiles/campaign_members
// foreign key cascade ile otomatik gider (bkz. 0001-0003 migration'ları).
//
// Deploy:
//   supabase functions deploy delete-account
// Ortam değişkenleri (Supabase otomatik sağlar; JWT doğrulaması açık kalmalı):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'Yetkisiz' }, 401)

  // Token'dan kullanıcıyı doğrula (anon client + kullanıcının token'ı).
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser(token)
  if (userErr || !userData.user) return json({ error: 'Geçersiz oturum' }, 401)

  // Service-role ile o kullanıcıyı sil (cascade veriyi de temizler).
  const admin = createClient(url, serviceKey)
  const { error: delErr } = await admin.auth.admin.deleteUser(userData.user.id)
  if (delErr) return json({ error: delErr.message }, 500)

  return json({ ok: true }, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

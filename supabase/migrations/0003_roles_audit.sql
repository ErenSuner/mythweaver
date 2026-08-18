-- Mythweaver — campaign-tabanlı DM + kurucu ops (denetim log'u)
-- Supabase SQL Editor'de çalıştır (veya `supabase db push`). 0002'den sonra gelir.
--
-- Model: "DM olmak" = kurucunun bir campaign'e atadığı kişi olmak. Ayrı profil
-- bayrağı yok. Atanan DM yalnız kendi campaign'indeki karakterleri okur/düzenler.
-- Kurucu (is_admin) davranışı AYNEN kalır; campaign oluşturur ve DM atar (opsiyonel).
--
-- Eklenenler:
--   * campaigns.dm_user_id  : nullable = atanan DM (opsiyonel)
--   * dm_owns_character()   : atanan DM'in campaign-kapsamlı erişimi için helper
--   * characters/campaigns/campaign_members : campaign-tabanlı DM policy'leri
--   * profiles              : kurucu rol ver/al için update policy
--   * character_edit_log    : DM başkasının karakterini düzenlediğinde kayıt + trigger

-- ============================================================
-- 1) campaigns.dm_user_id nullable = atanan DM (opsiyonel)
-- ============================================================
alter table public.campaigns alter column dm_user_id drop not null;

-- ============================================================
-- 2) HELPER (security definer: RLS özyinelemesini kırar)
-- ============================================================

-- Verilen karakter, çağıranın (auth.uid()) DM olarak atandığı bir campaign'in üyesi mi?
create or replace function public.dm_owns_character(char_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members cm
    join public.campaigns c on c.id = cm.campaign_id
    where cm.character_id = char_id
      and c.dm_user_id = auth.uid()
  );
$$;

-- Atanan DM, kendi campaign'inde karakteri olan oyuncunun profilini (e-posta) okuyabilir mi?
create or replace function public.dm_sees_player(player_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members cm
    join public.campaigns c on c.id = cm.campaign_id
    join public.characters ch on ch.id = cm.character_id
    where ch.user_id = player_id
      and c.dm_user_id = auth.uid()
  );
$$;

-- ============================================================
-- 3) DENETİM LOG'U + TRIGGER
-- ============================================================
create table if not exists public.character_edit_log (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null,
  editor_id uuid,
  owner_id uuid,
  edited_at timestamptz not null default now()
);
create index if not exists character_edit_log_at_idx on public.character_edit_log (edited_at desc);

-- Bir karakter, sahibinden BAŞKA biri (DM) tarafından güncellenince log satırı ekle.
create or replace function public.log_admin_character_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.user_id then
    insert into public.character_edit_log (character_id, editor_id, owner_id)
    values (old.id, auth.uid(), old.user_id);
  end if;
  return new;
end;
$$;

-- owner-kilidi trigger'ıyla çakışmaz (ayrı trigger, yalnız log insert'i).
drop trigger if exists characters_edit_audit on public.characters;
create trigger characters_edit_audit
  after update on public.characters
  for each row execute function public.log_admin_character_edit();

alter table public.character_edit_log enable row level security;

drop policy if exists "character_edit_log_select_admin" on public.character_edit_log;
create policy "character_edit_log_select_admin"
  on public.character_edit_log for select
  using (public.is_admin(auth.uid()));

-- ============================================================
-- 4) POLICY GÜNCELLEMELERİ
-- ============================================================

-- ---- campaigns ----
-- Kurucu tüm campaign'leri yönetir (oluştur/adlandır/sil/DM ata).
drop policy if exists "campaigns_dm_all" on public.campaigns;
drop policy if exists "campaigns_admin_all" on public.campaigns;
create policy "campaigns_admin_all"
  on public.campaigns for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Atanan DM kendi campaign'ini panelde görür.
drop policy if exists "campaigns_select_dm" on public.campaigns;
create policy "campaigns_select_dm"
  on public.campaigns for select
  using (dm_user_id = auth.uid());

-- (campaigns_select_member 0002'den korunur.)

-- ---- campaign_members ----
-- Karakter atama/çıkarmayı yalnız kurucu yapar.
drop policy if exists "campaign_members_dm_all" on public.campaign_members;
drop policy if exists "campaign_members_admin_all" on public.campaign_members;
create policy "campaign_members_admin_all"
  on public.campaign_members for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Atanan DM kendi campaign'inin üyelik satırlarını okur (parti listesi).
drop policy if exists "campaign_members_select_dm" on public.campaign_members;
create policy "campaign_members_select_dm"
  on public.campaign_members for select
  using (exists (
    select 1 from public.campaigns c
    where c.id = campaign_id and c.dm_user_id = auth.uid()
  ));

-- (campaign_members_select_member 0002'den korunur.)

-- ---- characters ----
-- (characters_select_admin / characters_update_admin 0002'den korunur — kurucu = tümü.)

-- Atanan DM yalnız kendi campaign'lerindeki karakterleri okur.
drop policy if exists "characters_select_dm" on public.characters;
create policy "characters_select_dm"
  on public.characters for select
  using (public.dm_owns_character(id));

-- Atanan DM yalnız kendi campaign'lerindeki karakterleri düzenler (owner-kilidi sahipliği korur).
drop policy if exists "characters_update_dm" on public.characters;
create policy "characters_update_dm"
  on public.characters for update
  using (public.dm_owns_character(id))
  with check (public.dm_owns_character(id));

-- (characters_select_party 0002'den korunur.)

-- ---- profiles ----
-- Kurucu rolleri düzenleyebilir (is_admin ver/al).
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Atanan DM, kendi campaign oyuncularının profilini (e-posta) okuyabilir.
drop policy if exists "profiles_select_dm_players" on public.profiles;
create policy "profiles_select_dm_players"
  on public.profiles for select
  using (public.dm_sees_player(id));

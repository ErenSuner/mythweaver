-- Mythweaver — DM (admin) paneli + campaign'ler + parti görünümü
-- Supabase SQL Editor'de çalıştır (veya `supabase db push`). 0001'den sonra gelir.
--
-- Sıra önemli: SQL-language fonksiyon gövdeleri oluşturma anında doğrulanır,
-- bu yüzden önce TÜM tablolar, sonra fonksiyonlar, sonra policy'ler gelir.
--
-- Eklenenler:
--   * profiles         : kullanıcı e-postası + is_admin bayrağı (DM yetkisi)
--   * campaigns        : DM'in yürüttüğü hikâyeler
--   * campaign_members : karakter -> campaign ataması (bir karakter tek campaign)
--   * characters       : DM okuma/düzenleme + oyuncu parti-eşi okuma policy'leri
--   * owner kilidi     : update sırasında user_id asla değişmez (sahiplik kaymaz)

-- ============================================================
-- 1) TABLOLAR
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  dm_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_dm_idx on public.campaigns (dm_user_id);

create table if not exists public.campaign_members (
  character_id uuid primary key references public.characters (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists campaign_members_campaign_idx on public.campaign_members (campaign_id);

-- ============================================================
-- 2) HELPER FONKSİYONLAR (tüm tablolar var olduktan sonra)
--    Tümü security definer: RLS özyinelemesini kırar.
-- ============================================================

-- Kullanıcı DM (admin) mi?
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- Çağıran, verilen campaign'de kendi karakterlerinden biriyle üye mi?
create or replace function public.is_campaign_member(cid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members cm
    join public.characters my on my.id = cm.character_id
    where cm.campaign_id = cid
      and my.user_id = auth.uid()
  );
$$;

-- Verilen karakter, çağıranın karakterlerinden biriyle aynı campaign'de mi?
create or replace function public.shares_campaign_with_me(char_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.campaign_members cm_peer
    join public.campaign_members cm_self on cm_self.campaign_id = cm_peer.campaign_id
    join public.characters my on my.id = cm_self.character_id
    where cm_peer.character_id = char_id
      and my.user_id = auth.uid()
  );
$$;

-- Yeni kullanıcı kaydında profili otomatik oluştur.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Owner kilidi: herhangi bir update'te user_id asla değişmez.
create or replace function public.lock_character_owner()
returns trigger
language plpgsql
as $$
begin
  new.user_id := old.user_id;
  return new;
end;
$$;

-- ============================================================
-- 3) TRIGGER'LAR
-- ============================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists characters_lock_owner on public.characters;
create trigger characters_lock_owner
  before update on public.characters
  for each row execute function public.lock_character_owner();

-- Mevcut kullanıcılar için tek seferlik profil backfill.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ============================================================
-- 4) RLS + POLICY'LER
-- ============================================================
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;

-- ---- profiles ----
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

-- ---- campaigns ----
-- DM yalnız kendi campaign'lerini yönetir (ve admin olmalı).
drop policy if exists "campaigns_dm_all" on public.campaigns;
create policy "campaigns_dm_all"
  on public.campaigns for all
  using (public.is_admin(auth.uid()) and dm_user_id = auth.uid())
  with check (public.is_admin(auth.uid()) and dm_user_id = auth.uid());

-- Oyuncu, üyesi olduğu campaign'in adını okuyabilir.
drop policy if exists "campaigns_select_member" on public.campaigns;
create policy "campaigns_select_member"
  on public.campaigns for select
  using (public.is_campaign_member(id));

-- ---- campaign_members ----
-- Üyeliği yalnız ilgili campaign'in DM'i (admin) ekler/çıkarır/görür.
drop policy if exists "campaign_members_dm_all" on public.campaign_members;
create policy "campaign_members_dm_all"
  on public.campaign_members for all
  using (
    public.is_admin(auth.uid())
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.dm_user_id = auth.uid())
  )
  with check (
    public.is_admin(auth.uid())
    and exists (select 1 from public.campaigns c where c.id = campaign_id and c.dm_user_id = auth.uid())
  );

-- Oyuncu, üyesi olduğu campaign'in üyelik satırlarını okuyabilir (parti listesi için).
drop policy if exists "campaign_members_select_member" on public.campaign_members;
create policy "campaign_members_select_member"
  on public.campaign_members for select
  using (public.is_campaign_member(campaign_id));

-- ---- characters (0001'deki own-policy'lere ek) ----
-- DM tüm karakterleri okuyabilir.
drop policy if exists "characters_select_admin" on public.characters;
create policy "characters_select_admin"
  on public.characters for select
  using (public.is_admin(auth.uid()));

-- DM karakterleri düzenleyebilir (owner kilidi trigger'ı sahipliği korur).
drop policy if exists "characters_update_admin" on public.characters;
create policy "characters_update_admin"
  on public.characters for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Aynı campaign'deki karakterler: parti-eşi yalnız okuyabilir.
drop policy if exists "characters_select_party" on public.characters;
create policy "characters_select_party"
  on public.characters for select
  using (public.shares_campaign_with_me(id));

-- ============================================================
-- 5) Kendini DM yap (tek seferlik — e-postanı doğrula)
-- ============================================================
-- update public.profiles set is_admin = true where email = 'erenn.suner@gmail.com';

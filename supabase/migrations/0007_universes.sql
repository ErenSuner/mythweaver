-- ============================================================
-- 0007 — Evren (universe): paylaşılan lore/dünya bilgisi
-- 0006'dan sonra gelir.
-- Herkes evren kurabilir (sahibi olur). Bir evren çok campaign barındırır.
-- Campaign'e opsiyonel tek evren atanır (yalnız o campaign'in DM'i veya kurucu).
-- Lore okuma: sahip + kurucu + o evreni kullanan campaign'in üyeleri & DM'i.
-- ============================================================

create table if not exists public.universes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists universes_owner_idx on public.universes (owner_id);

-- Campaign'e opsiyonel tek evren. Evren silinince campaign SİLİNMEZ, atama boşalır.
alter table public.campaigns
  add column if not exists universe_id uuid references public.universes (id) on delete set null;
create index if not exists campaigns_universe_idx on public.campaigns (universe_id);

-- Cross-campaign okuma predicate'i — MUTLAKA definer (campaigns/campaign_members/
-- characters'a dokunuyor; inline edilirse o tabloların RLS'i tekrar tetiklenir).
create or replace function public.can_read_universe(p_universe_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select
    public.is_admin(auth.uid())
    or exists (select 1 from public.universes u
               where u.id = p_universe_id and u.owner_id = auth.uid())
    or exists (select 1 from public.campaigns c
               join public.campaign_members cm on cm.campaign_id = c.id
               join public.characters ch on ch.id = cm.character_id
               where c.universe_id = p_universe_id and ch.user_id = auth.uid())
    or exists (select 1 from public.campaigns c
               where c.universe_id = p_universe_id and c.dm_user_id = auth.uid());
$$;

alter table public.universes enable row level security;

-- Kurucu her şeyi yapar.
drop policy if exists "universes_admin_all" on public.universes;
create policy "universes_admin_all"
  on public.universes for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Sahip: tam CRUD (INSERT dahil => herhangi bir kullanıcı evren açar ve sahibi olur).
drop policy if exists "universes_owner_all" on public.universes;
create policy "universes_owner_all"
  on public.universes for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Okuma: sahip/kurucu/ilgili campaign üyeleri & DM (helper).
drop policy if exists "universes_select_reader" on public.universes;
create policy "universes_select_reader"
  on public.universes for select
  using (public.can_read_universe(id));

-- Sahip kilidi: owner_id update'te değişmesin (character owner-lock deseni).
create or replace function public.lock_universe_owner()
returns trigger language plpgsql as $$
begin new.owner_id := old.owner_id; return new; end; $$;
drop trigger if exists universes_lock_owner on public.universes;
create trigger universes_lock_owner
  before update on public.universes
  for each row execute function public.lock_universe_owner();

-- NOT: evrene atama/kaldırma için yeni policy GEREKMEZ — campaigns.universe_id set
-- etmek sıradan campaign UPDATE; 0005 campaigns_update_dm (DM) + campaigns_admin_all
-- (kurucu) zaten izinli. Unassign = NULL.

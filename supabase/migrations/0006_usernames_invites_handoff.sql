-- ============================================================
-- 0006 — Username kimliği + username-tabanlı campaign daveti + DM devri
-- 0005'ten sonra gelir.
-- Sıra: kolon/tablo -> helper/RPC -> trigger -> policy -> grant.
-- KORUNAN invariant'lar: kurucu (is_admin) her şeye erişir; self-promote imkânsız;
-- her campaign'de tek DM; bir karakter tek campaign; kullanıcı başına tek üyelik/ campaign.
-- ============================================================

-- ------------------------------------------------------------
-- 2a. profiles.username
-- ------------------------------------------------------------
alter table public.profiles add column if not exists username text;

-- case-insensitive benzersizlik (null'lar tekil sayılır, sorun değil).
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- izinli format: 3-20 harf/rakam/alt-çizgi/nokta. null'a izin (ilk-giriş öncesi).
-- Zorunluluk DB'de NOT NULL ile DEĞİL (handle_new_user trigger'ını ve mevcut satırları
-- kırar) — app tarafında ilk-giriş gate ile uygulanır.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[A-Za-z0-9_.]{3,20}$');

-- ------------------------------------------------------------
-- 2b. Ayrıcalıklı kolon kilidi + self-update policy (yalnız username)
-- ------------------------------------------------------------
-- with-check NEW/OLD kıyaslayamaz; kolon-sınırlı update için BEFORE trigger kullanılır
-- (lock_character_owner deseni).
create or replace function public.lock_profile_privileged_cols()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() IS NULL => service_role / SQL editor (kurucu bootstrap) — kilitleme.
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.is_admin   := old.is_admin;
    new.id         := old.id;
    new.email      := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_lock_privileged on public.profiles;
create trigger profiles_lock_privileged
  before update on public.profiles
  for each row execute function public.lock_profile_privileged_cols();

-- Kullanıcı yalnız kendi satırını update edebilir; trigger kolonları username ile sınırlar.
drop policy if exists "profiles_update_own_username" on public.profiles;
create policy "profiles_update_own_username"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ------------------------------------------------------------
-- 2c. search_users — PII'sız kullanıcı arama
-- ------------------------------------------------------------
create or replace function public.search_users(query text)
returns table (id uuid, username text)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.username
  from public.profiles p
  where char_length(btrim(query)) >= 2
    and p.username is not null
    and p.username ilike '%' ||
        replace(replace(replace(btrim(query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
        escape '\'
    and p.id <> auth.uid()
  order by p.username
  limit 20;
$$;

-- ------------------------------------------------------------
-- 2d. campaign_invites tablosu + RLS
-- ------------------------------------------------------------
create table if not exists public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  invitee_id  uuid not null references auth.users (id)      on delete cascade,
  inviter_id  uuid not null references auth.users (id)      on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

-- bir davetliye aynı campaign için tek bekleyen davet.
create unique index if not exists campaign_invites_unique_pending
  on public.campaign_invites (campaign_id, invitee_id) where status = 'pending';
create index if not exists campaign_invites_invitee_idx
  on public.campaign_invites (invitee_id) where status = 'pending';
create index if not exists campaign_invites_campaign_idx
  on public.campaign_invites (campaign_id);

alter table public.campaign_invites enable row level security;

drop policy if exists "campaign_invites_admin_all" on public.campaign_invites;
create policy "campaign_invites_admin_all"
  on public.campaign_invites for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- davetli kendi davetlerini görür.
drop policy if exists "campaign_invites_select_invitee" on public.campaign_invites;
create policy "campaign_invites_select_invitee"
  on public.campaign_invites for select
  using (invitee_id = auth.uid());

-- campaign DM'i kendi campaign'inin davetlerini görür.
drop policy if exists "campaign_invites_select_dm" on public.campaign_invites;
create policy "campaign_invites_select_dm"
  on public.campaign_invites for select
  using (exists (select 1 from public.campaigns c
                 where c.id = campaign_id and c.dm_user_id = auth.uid()));

-- NOT: normal kullanıcı için INSERT/UPDATE/DELETE policy YOK; tüm yazma definer RPC ile.

-- ------------------------------------------------------------
-- 2e. Davet RPC'leri (security definer, açık yetki kontrolünden sonra RLS'i aşar)
-- ------------------------------------------------------------
create or replace function public.send_invite(p_campaign_id uuid, p_invitee_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Kimlik doğrulaması gerekli.' using errcode = '28000'; end if;
  if not exists (select 1 from public.campaigns c where c.id = p_campaign_id
                 and (c.dm_user_id = auth.uid() or public.is_admin(auth.uid()))) then
    raise exception 'Yalnız campaign DM davet gönderebilir.' using errcode = '42501'; end if;
  if p_invitee_id = auth.uid() then
    raise exception 'Kendine davet gönderemezsin.' using errcode = '23514'; end if;
  if exists (select 1 from public.campaign_members cm
             join public.characters ch on ch.id = cm.character_id
             where cm.campaign_id = p_campaign_id and ch.user_id = p_invitee_id) then
    raise exception 'Kullanıcı zaten üye.' using errcode = '23505'; end if;
  insert into public.campaign_invites (campaign_id, invitee_id, inviter_id)
  values (p_campaign_id, p_invitee_id, auth.uid()) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Bu kullanıcı için zaten bekleyen davet var.' using errcode = '23505';
end; $$;

-- Kabul: davetli KENDİ karakterini campaign'e sokar (admin-only member policy'yi definer atlar).
create or replace function public.accept_invite(p_invite_id uuid, p_character_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_campaign uuid;
begin
  if auth.uid() is null then
    raise exception 'Kimlik doğrulaması gerekli.' using errcode = '28000'; end if;
  select campaign_id into v_campaign from public.campaign_invites
   where id = p_invite_id and invitee_id = auth.uid() and status = 'pending' for update;
  if v_campaign is null then
    raise exception 'Geçerli bekleyen davet yok.' using errcode = '02000'; end if;
  if not exists (select 1 from public.characters
                 where id = p_character_id and user_id = auth.uid()) then
    raise exception 'Bu karakter sana ait değil.' using errcode = '42501'; end if;
  if exists (select 1 from public.campaign_members where character_id = p_character_id) then
    raise exception 'Bu karakter zaten bir campaign''de.' using errcode = '23505'; end if;
  if exists (select 1 from public.campaign_members cm
             join public.characters ch on ch.id = cm.character_id
             where cm.campaign_id = v_campaign and ch.user_id = auth.uid()) then
    raise exception 'Bu campaign''de zaten bir karakterin var.' using errcode = '23505'; end if;
  insert into public.campaign_members (character_id, campaign_id)
  values (p_character_id, v_campaign);
  update public.campaign_invites set status = 'accepted', responded_at = now()
   where id = p_invite_id;
end; $$;

create or replace function public.decline_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.campaign_invites set status = 'declined', responded_at = now()
   where id = p_invite_id and invitee_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Geçerli bekleyen davet yok.' using errcode = '02000'; end if;
end; $$;

create or replace function public.cancel_invite(p_invite_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.campaign_invites ci set status = 'cancelled', responded_at = now()
   where ci.id = p_invite_id and ci.status = 'pending'
     and (public.is_admin(auth.uid())
          or exists (select 1 from public.campaigns c
                     where c.id = ci.campaign_id and c.dm_user_id = auth.uid()));
  if not found then raise exception 'İptal yetkisi/bekleyen davet yok.' using errcode = '42501'; end if;
end; $$;

-- Görünürlük RPC'leri (RLS tek başına kapatamaz):
-- davetli campaign adına RLS ile erişemez (henüz üye değil).
create or replace function public.list_my_invites()
returns table (invite_id uuid, campaign_id uuid, campaign_name text,
               inviter_username text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select ci.id, c.id, c.name, p.username, ci.created_at
  from public.campaign_invites ci
  join public.campaigns c on c.id = ci.campaign_id
  left join public.profiles p on p.id = ci.inviter_id
  where ci.invitee_id = auth.uid() and ci.status = 'pending'
  order by ci.created_at desc;
$$;

-- DM, henüz-üye-olmayan davetlinin profilini RLS ile göremez.
create or replace function public.list_campaign_invites(p_campaign_id uuid)
returns table (invite_id uuid, invitee_id uuid, invitee_username text,
               status text, created_at timestamptz)
language sql security definer stable set search_path = public as $$
  select ci.id, ci.invitee_id, p.username, ci.status, ci.created_at
  from public.campaign_invites ci
  left join public.profiles p on p.id = ci.invitee_id
  where ci.campaign_id = p_campaign_id
    and (public.is_admin(auth.uid())
         or exists (select 1 from public.campaigns c
                    where c.id = p_campaign_id and c.dm_user_id = auth.uid()))
  order by ci.created_at desc;
$$;

-- ------------------------------------------------------------
-- 2f. DM devri
-- ------------------------------------------------------------
-- Policy ile yapılamaz: campaigns_update_dm with-check'i dm_user_id değişimini engeller.
create or replace function public.transfer_dm(p_campaign_id uuid, p_new_dm uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.campaigns c where c.id = p_campaign_id
                 and (c.dm_user_id = auth.uid() or public.is_admin(auth.uid()))) then
    raise exception 'Yalnız mevcut DM (veya kurucu) devredebilir.' using errcode = '42501'; end if;
  if not exists (select 1 from public.campaign_members cm
                 join public.characters ch on ch.id = cm.character_id
                 where cm.campaign_id = p_campaign_id and ch.user_id = p_new_dm) then
    raise exception 'Yeni DM bu campaign''in üyesi olmalı.' using errcode = '23514'; end if;
  update public.campaigns set dm_user_id = p_new_dm where id = p_campaign_id;
end; $$;

-- ------------------------------------------------------------
-- 2g. Grants — definer fonksiyonlarını yetkisiz erişime kapat
-- ------------------------------------------------------------
revoke all on function
  public.search_users(text), public.send_invite(uuid, uuid),
  public.accept_invite(uuid, uuid), public.decline_invite(uuid),
  public.cancel_invite(uuid), public.list_my_invites(),
  public.list_campaign_invites(uuid), public.transfer_dm(uuid, uuid)
  from public, anon;
grant execute on function
  public.search_users(text), public.send_invite(uuid, uuid),
  public.accept_invite(uuid, uuid), public.decline_invite(uuid),
  public.cancel_invite(uuid), public.list_my_invites(),
  public.list_campaign_invites(uuid), public.transfer_dm(uuid, uuid)
  to authenticated;

-- ------------------------------------------------------------
-- 2h. Faz 1 policy sıkılaştırma: DM artık üyeleri direkt insert edemez;
--     üyelik yalnız accept_invite (definer) ile eklenir. DM sadece çıkarır (kick).
-- ------------------------------------------------------------
drop policy if exists "campaign_members_dm_manage" on public.campaign_members;
create policy "campaign_members_dm_delete"
  on public.campaign_members for delete
  using (exists (select 1 from public.campaigns c
                 where c.id = campaign_id and c.dm_user_id = auth.uid()));

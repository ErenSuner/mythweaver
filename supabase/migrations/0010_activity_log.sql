-- Mythweaver — kurucu aktivite log'u. 0009'dan sonra gelir.
-- Platformdaki önemli olayları kaçırılamaz biçimde (DB trigger) kaydeder:
-- üyelik, karakter/campaign/evren oluştur-sil, DM devri, campaign'e katıl-ayrıl,
-- DM'in başkasının karakterini düzenlemesi. Yalnız kurucu (is_admin) okur.
--
-- TASARIM: actor_id / target_id FK DEĞİL. delete-account bir kullanıcıyı ve
-- cascade ile karakterlerini siler; log kaydı silinmemeli. actor_email ve
-- target_label her satırda SNAPSHOT tutulur — silinen varlığın adı sonradan
-- profiles/characters'tan çözülemez, satırda kalması gerekir.
-- Login/logout burada YOK: Supabase'in auth şemasında (auth.audit_log_entries),
-- client'a açık değil. "İlk giriş = üyelik" signup trigger'ıyla yakalanır.

-- ============================================================
-- 1) TABLO
-- ============================================================
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,        -- eylemi yapan (FK yok — silme dayanıklı)
  actor_email text,     -- snapshot
  action text not null, -- signup | character_created | character_deleted
                        -- | campaign_created | campaign_deleted
                        -- | universe_created | universe_deleted
                        -- | dm_transferred | joined_campaign | left_campaign
                        -- | character_edited
  target_type text,     -- character | campaign | universe | user
  target_id uuid,       -- FK yok (silme dayanıklı)
  target_label text,    -- snapshot: hedef varlığın adı
  meta jsonb,           -- serbest ek (ör. dm_transferred: {from, to})
  created_at timestamptz not null default now()
);
create index if not exists activity_log_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_action_idx on public.activity_log (action);

alter table public.activity_log enable row level security;

-- Yalnız kurucu okur. INSERT policy YOK — kayıtlar yalnız definer trigger'lardan girer.
drop policy if exists "activity_log_select_admin" on public.activity_log;
create policy "activity_log_select_admin"
  on public.activity_log for select
  using (public.is_admin(auth.uid()));

-- ============================================================
-- 2) YARDIMCI: oturumlu bağlamda log satırı
-- ============================================================
-- auth.uid()'i aktör alır, email'i profiles'tan çözer. Signup HARİÇ her yerde
-- kullanılır (signup'ta oturum yok, ayrı ele alınır).
create or replace function public.log_activity(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_target_label text,
  p_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  insert into public.activity_log (actor_id, actor_email, action, target_type, target_id, target_label, meta)
  values (auth.uid(), v_email, p_action, p_target_type, p_target_id, p_target_label, p_meta);
end;
$$;

-- ============================================================
-- 3) SIGNUP — mevcut handle_new_user'a log ekle
-- ============================================================
-- auth.uid() bu bağlamda NULL (signup'ta oturum yok); new.id/new.email doğrudan.
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
  insert into public.activity_log (actor_id, actor_email, action, target_type, target_id, target_label)
  values (new.id, new.email, 'signup', 'user', new.id, new.email);
  return new;
end;
$$;

-- ============================================================
-- 4) KARAKTER — oluştur / sil / (DM düzenlemesi)
-- ============================================================
create or replace function public.log_character_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('character_created', 'character', new.id, new.data->>'characterName');
  return new;
end; $$;

drop trigger if exists characters_log_created on public.characters;
create trigger characters_log_created
  after insert on public.characters
  for each row execute function public.log_character_created();

create or replace function public.log_character_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('character_deleted', 'character', old.id, old.data->>'characterName');
  return old;
end; $$;

drop trigger if exists characters_log_deleted on public.characters;
create trigger characters_log_deleted
  before delete on public.characters
  for each row execute function public.log_character_deleted();

-- Mevcut denetim trigger'ı: character_edit_log'a ek olarak activity_log'a da yaz.
-- Böylece DM'in başkasını düzenlemesi tek akışta (Aktivite) görünür.
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
    perform public.log_activity('character_edited', 'character', old.id, old.data->>'characterName');
  end if;
  return new;
end;
$$;

-- ============================================================
-- 5) CAMPAIGN — oluştur / sil / DM devri
-- ============================================================
create or replace function public.log_campaign_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('campaign_created', 'campaign', new.id, new.name);
  return new;
end; $$;

drop trigger if exists campaigns_log_created on public.campaigns;
create trigger campaigns_log_created
  after insert on public.campaigns
  for each row execute function public.log_campaign_created();

create or replace function public.log_campaign_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('campaign_deleted', 'campaign', old.id, old.name);
  return old;
end; $$;

drop trigger if exists campaigns_log_deleted on public.campaigns;
create trigger campaigns_log_deleted
  before delete on public.campaigns
  for each row execute function public.log_campaign_deleted();

create or replace function public.log_dm_transferred()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('dm_transferred', 'campaign', new.id, new.name,
    jsonb_build_object('from', old.dm_user_id, 'to', new.dm_user_id));
  return new;
end; $$;

drop trigger if exists campaigns_log_dm on public.campaigns;
create trigger campaigns_log_dm
  after update on public.campaigns
  for each row when (old.dm_user_id is distinct from new.dm_user_id)
  execute function public.log_dm_transferred();

-- ============================================================
-- 6) EVREN — oluştur / sil
-- ============================================================
create or replace function public.log_universe_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('universe_created', 'universe', new.id, new.name);
  return new;
end; $$;

drop trigger if exists universes_log_created on public.universes;
create trigger universes_log_created
  after insert on public.universes
  for each row execute function public.log_universe_created();

create or replace function public.log_universe_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_activity('universe_deleted', 'universe', old.id, old.name);
  return old;
end; $$;

drop trigger if exists universes_log_deleted on public.universes;
create trigger universes_log_deleted
  before delete on public.universes
  for each row execute function public.log_universe_deleted();

-- ============================================================
-- 7) CAMPAIGN ÜYELİĞİ — katıl / ayrıl (kick dahil)
-- ============================================================
-- INSERT accept_invite RPC'sinin içinden olur; definer fonksiyon içinde bile
-- auth.uid() gerçek çağırandır. Hedef = campaign, label = campaign adı.
create or replace function public.log_member_joined()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.campaigns where id = new.campaign_id;
  perform public.log_activity('joined_campaign', 'campaign', new.campaign_id, v_name);
  return new;
end; $$;

drop trigger if exists campaign_members_log_joined on public.campaign_members;
create trigger campaign_members_log_joined
  after insert on public.campaign_members
  for each row execute function public.log_member_joined();

create or replace function public.log_member_left()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select name into v_name from public.campaigns where id = old.campaign_id;
  perform public.log_activity('left_campaign', 'campaign', old.campaign_id, v_name);
  return old;
end; $$;

drop trigger if exists campaign_members_log_left on public.campaign_members;
create trigger campaign_members_log_left
  before delete on public.campaign_members
  for each row execute function public.log_member_left();

-- ============================================================
-- 8) ARAMA RPC — aktivite listesi (yalnız kurucu)
-- ============================================================
create or replace function public.list_activity(
  p_search text default null,
  p_action text default null,
  p_limit int default 100
)
returns setof public.activity_log
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.activity_log
  where public.is_admin(auth.uid())
    and (p_action is null or action = p_action)
    and (
      p_search is null
      or actor_email ilike '%' || p_search || '%'
      or target_label ilike '%' || p_search || '%'
    )
  order by created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.list_activity(text, text, int) from public, anon;
grant execute on function public.list_activity(text, text, int) to authenticated;

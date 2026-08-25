-- Davet bildirimi: campaign_invites tablosunu Supabase realtime yayınına ekler.
-- Header'daki bildirim kutusu (InviteMenu) postgres_changes ile anında tazelenir.
-- RLS 0006'da tanımlı (invitee kendi davetini görür); postgres_changes RLS'e uyar,
-- yani her kullanıcıya yalnızca kendi satırları düşer.

-- DELETE/UPDATE olaylarında eski satırın invitee_id'si payload'a girsin diye gerekli;
-- client-side filter (invitee_id=eq.<uid>) buna dayanır. Tablo küçük, maliyeti yok.
alter table public.campaign_invites replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaign_invites'
  ) then
    alter publication supabase_realtime add table public.campaign_invites;
  end if;
end $$;

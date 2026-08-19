-- ============================================================
-- 0005 — Açık campaign oluşturma + DM öz-yönetimi
-- 0004'ten sonra gelir. Sadece POLICY ekler; tablo/kolon değişmez.
-- Artık herhangi bir kimlik doğrulanmış kullanıcı campaign kurabilir ve
-- kurduğu campaign'in DM'i olur; kendi campaign'ini yönetir.
-- KORUNAN invariant'lar: kurucu (is_admin) her şeye erişir; her campaign'de tek DM.
-- ============================================================

-- ---- campaigns ----

-- INSERT: kimlik doğrulanmış kullanıcı campaign açar ve DM olur.
drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own"
  on public.campaigns for insert
  to authenticated
  with check (dm_user_id = auth.uid());

-- UPDATE: DM kendi campaign'ini yeniden adlandırır / (0007) universe atar.
-- with-check dm_user_id = auth.uid() BİLEREK dm_user_id değişimini engeller;
-- DM devri (0006) security-definer RPC ile yapılır.
drop policy if exists "campaigns_update_dm" on public.campaigns;
create policy "campaigns_update_dm"
  on public.campaigns for update
  using (dm_user_id = auth.uid())
  with check (dm_user_id = auth.uid());

-- DELETE: DM kendi campaign'ini siler.
drop policy if exists "campaigns_delete_dm" on public.campaigns;
create policy "campaigns_delete_dm"
  on public.campaigns for delete
  using (dm_user_id = auth.uid());

-- (KORUNUR: campaigns_admin_all, campaigns_select_dm, campaigns_select_member.)

-- ---- campaign_members ----

-- DM kendi campaign'inin üyeliklerini yönetir (ekle/çıkar/oku).
-- NOT: FOR ALL olduğu için DM her karakteri direkt insert edebilir. Davet öncesi
-- (0006) tek doldurma yolu; 0006 davet akışı gelince bunu FOR DELETE/UPDATE'e daralt.
drop policy if exists "campaign_members_dm_manage" on public.campaign_members;
create policy "campaign_members_dm_manage"
  on public.campaign_members for all
  using (exists (select 1 from public.campaigns c
                 where c.id = campaign_id and c.dm_user_id = auth.uid()))
  with check (exists (select 1 from public.campaigns c
                 where c.id = campaign_id and c.dm_user_id = auth.uid()));

-- Oyuncu kendi üyeliğini bırakabilir (ayrılma); başkasınınkini değil.
drop policy if exists "campaign_members_delete_own" on public.campaign_members;
create policy "campaign_members_delete_own"
  on public.campaign_members for delete
  using (exists (select 1 from public.characters ch
                 where ch.id = character_id and ch.user_id = auth.uid()));

-- (KORUNUR: campaign_members_admin_all, campaign_members_select_dm, campaign_members_select_member.)

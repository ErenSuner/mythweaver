-- ============================================================
-- MYTHWEAVER — test verisi temizliği (herkese açılış öncesi)
-- Kurucu (erenn.suner@gmail.com) HESABI ve profili KORUNUR.
-- Kurucunun İÇERİĞİ dahil diğer HER ŞEY silinir.
--
-- !!! GERİ ALINAMAZ !!!  Çalıştırmadan önce yedek al.
-- (backup.yml cron günlük yedek alıyor; istersen Actions'tan manuel tetikle.)
--
-- Supabase Dashboard > SQL Editor'de çalıştır. ÖNCE Adım 0'ı (sayım) çalıştır,
-- rakamları gör, sonra Adım 1-4'ü çalıştır, en son Adım 5 ile teyit et.
-- ============================================================


-- ========== ADIM 0: SİLMEDEN ÖNCE SAYIM (dry-run) ==========
-- Neyin gideceğini göster. Hiçbir şey silmez.
select
  (select count(*) from auth.users)                                              as toplam_kullanici,
  (select count(*) from auth.users where email is distinct from 'erenn.suner@gmail.com') as silinecek_kullanici,
  (select count(*) from public.characters)                                       as karakter,
  (select count(*) from public.campaigns)                                        as campaign,
  (select count(*) from public.universes)                                        as evren,
  (select count(*) from public.campaign_invites)                                 as davet,
  (select count(*) from public.activity_log)                                     as aktivite_kaydi;


-- ========== ADIM 1: Kurucu DIŞINDAKİ tüm kullanıcılar ==========
-- Cascade: profil, karakter, campaign, evren, üyelik, davet — hepsi gider.
-- `is distinct from` NULL-safe: email'i olmayan (garip) kayıtlar da silinir,
-- kurucu email'i tam eşleşen TEK satır korunur.
delete from auth.users
where email is distinct from 'erenn.suner@gmail.com';


-- ========== ADIM 2: Kurucunun KENDİ içeriği (hesabı/profili kalır) ==========
delete from public.characters
where user_id = (select id from auth.users where email = 'erenn.suner@gmail.com');

delete from public.campaigns
where dm_user_id = (select id from auth.users where email = 'erenn.suner@gmail.com');

delete from public.universes
where owner_id = (select id from auth.users where email = 'erenn.suner@gmail.com');


-- ========== ADIM 3: Artık üyelik/davet (cascade ile boşalmış olmalı) ==========
delete from public.campaign_members;
delete from public.campaign_invites;


-- ========== ADIM 4: Log tabloları (FK yok → cascade etmez) ==========
delete from public.activity_log;
delete from public.character_edit_log;


-- ========== ADIM 5: SİLME SONRASI TEYİT ==========
-- Beklenen: kalan_kullanici = 1, kalan_email = kurucu, gerisi 0.
select
  (select count(*) from auth.users)             as kalan_kullanici,   -- 1
  (select email from auth.users limit 1)        as kalan_email,       -- erenn.suner@gmail.com
  (select count(*) from public.profiles)        as kalan_profil,      -- 1
  (select count(*) from public.characters)      as karakter,          -- 0
  (select count(*) from public.campaigns)       as campaign,          -- 0
  (select count(*) from public.universes)       as evren,             -- 0
  (select count(*) from public.campaign_members) as uyelik,           -- 0
  (select count(*) from public.campaign_invites) as davet,            -- 0
  (select count(*) from public.activity_log)    as aktivite,          -- 0
  (select count(*) from public.character_edit_log) as denetim;        -- 0

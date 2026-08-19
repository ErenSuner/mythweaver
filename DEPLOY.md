# Yayına Alma — MythWeaver

Cloudflare Pages (ücretsiz) + GitHub auto-deploy + Supabase. Adres şimdilik bedava
`*.pages.dev`; özel domain sonra eklenir.

## 0. Ön koşul
- `.env` dosyası **repoya girmez** (`.gitignore`'da). Supabase değerleri host paneline elle
  girilir. Anon key public — güvenlik Row Level Security (RLS) ile sağlanır.

## 1. GitHub'a gönder
```bash
git init
git add -A
git commit -m "İlk sürüm"
```
Sonra GitHub'da boş repo aç ve push et. `gh` CLI ile:
```bash
gh auth login          # interaktif — terminalde ! ile çalıştır
gh repo create mythweaver --private --source=. --push
```
ya da web'de repo açıp:
```bash
git remote add origin https://github.com/<kullanıcı>/mythweaver.git
git branch -M main
git push -u origin main
```

## 2. Cloudflare Pages
1. cloudflare.com → **Workers & Pages > Create > Pages > Connect to Git**.
2. `mythweaver` repo'sunu seç.
3. Build ayarları:
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Environment variables (Production **ve** Preview):
   - `VITE_SUPABASE_URL` = (yerel `.env` değeri)
   - `VITE_SUPABASE_ANON_KEY` = (yerel `.env` değeri)
   - `NODE_VERSION` = `20`
5. Deploy → adres: `https://<proje-adı>.pages.dev`.

SPA yönlendirmesi `public/_redirects` ile hazır (`/* /index.html 200`).

## 3. Supabase
### 3a. Tablo + RLS (yoksa SQL Editor'de çalıştır)
```sql
create table if not exists public.characters (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.characters enable row level security;
create policy "own rows - select" on public.characters for select using (auth.uid() = user_id);
create policy "own rows - modify" on public.characters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists characters_user_idx on public.characters(user_id);
```

### 3b. Auth redirect (Authentication > URL Configuration)
- Site URL: `https://<proje-adı>.pages.dev`
- Redirect URLs: `https://<proje-adı>.pages.dev/**` ve `http://localhost:5173/**`

### 3c. Google OAuth (Google Cloud Console)
- Authorized JavaScript origins: `https://<proje-adı>.pages.dev` ekle.
- Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback` (zaten var, sabit).

## 4. Doğrula
- pages.dev açılır (HTTPS, PWA install).
- Google ile giriş → OAuth tamamlanır.
- Karakter kaydet → Supabase `characters` tablosunda satır.
- Başka cihazda aynı hesap → karakter görünür.
- Her `git push` → otomatik yeni deploy.

## Sonra: özel domain
Pages > Custom domains'ten ekle. Ardından Supabase Site URL + Google origins'i yeni domaine
güncelle.

---

## 5. Halka açık launch — production sertleştirme
Arkadaş-arası kullanımdan herkese-açık ürüne geçerken YAPILMASI ŞART olanlar. Çoğu
konsol/ops işi; kod tarafı hazır.

### 5a. Migration 0004 (kota)
SQL Editor'de `supabase/migrations/0004_quota.sql`'i çalıştır. Kullanıcı başına 50
karakter + 256 KB/karakter sınırı (DB şişmesi / abuse koruması).

### 5b. E-posta doğrulama + custom SMTP  ← BLOCKER
- Authentication > Providers > Email: **Confirm email = ON**.
- Authentication > Emails/SMTP: **custom SMTP** bağla (Resend/Postmark/SES).
  Supabase'in dahili maili saatte ~3-4 ile sınırlı, production için değil —
  bağlamazsan public signup dalgasında doğrulama mailleri gitmez.

### 5c. CAPTCHA (bot koruması)  ← BLOCKER
- Cloudflare Turnstile'da site oluştur → **site key** + **secret key**.
- Supabase: Authentication > Bot & Abuse Protection > **Enable CAPTCHA** (Turnstile),
  secret key'i gir.
- Cloudflare Pages env var: `VITE_TURNSTILE_SITE_KEY` = site key (Production + Preview).
  (Boşsa widget çizilmez; Supabase tarafı açıkken bu değişkeni MUTLAKA ver.)

### 5d. Yedekleme — ÜCRETSIZ (Pro'suz)  ← BLOCKER
Free tier'da otomatik yedek YOK. Pro yerine `pg_dump` cron kur:
`.github/workflows/backup.yml` hazır — her gün yedek alır, 90 gün artifact saklar.
- GitHub repo > Settings > Secrets > Actions > yeni secret `SUPABASE_DB_URL`:
  Supabase > Project Settings > Database > Connection string > **Session pooler** URI
  (şifreni içine yaz; direct connection IPv6, GitHub runner IPv4 — pooler şart).
- Test: repo > Actions > "DB Backup" > Run workflow → Artifacts'ta `.dump` görünür.
- Geri yükleme: `pg_restore --clean --no-owner -d "<DB_URL>" mythweaver-YYYY-MM-DD.dump`.

**Auto-pause:** free tier 7 gün trafik yoksa projeyi durdurur → site çöker. Gerçek
günlük kullanıcı varsa sorun değil. Yoksa aynı cron (günlük pg_dump) DB'ye
bağlandığı için projeyi canlı tutar.

### 5e. Hesap silme edge function
```bash
supabase functions deploy delete-account
```
Service-role ile kullanıcıyı siler (Ayarlar > Hesabımı Sil bunu çağırır). Deploy
edilmezse silme butonu hata verir.

### 5f. Hata izleme (opsiyonel ama önerilir)
Sentry projesi aç → DSN al → Pages env var `VITE_SENTRY_DSN`. Boşsa izleme kapalı.

### 5g. Yasal
`/gizlilik` ve `/kosullar` sayfalarındaki `[KÖŞELİ]` alanları (ad, iletişim e-postası)
doldur. Signup'ta koşul onayı zorunlu (kodda hazır).

### 5h. Doğrula (launch checklist)
- Şifremi unuttum → mail → /reset → yeni şifre → giriş.
- Yeni kayıt → doğrulama maili gelir → link → giriş; doğrulanmadan giriş reddedilir.
- CAPTCHA çözülmeden signup reddedilir.
- 51. karakter insert'i hata döner.
- Ayarlar > Verilerimi İndir → JSON; Hesabımı Sil → veri gider, giriş yapılamaz.
- Supabase panelinde günlük yedek görünür.

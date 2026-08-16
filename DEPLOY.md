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

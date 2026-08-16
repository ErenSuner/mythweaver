# Mythweaver
https://myth-weaver.netlify.app/

D&D 5e için Türkçe, yeni oyuncu dostu, adım adım karakter oluşturma sihirbazı. Tüm oyun kuralı verisi
`helper_files/dnd5e_ultimate_character_creation_guide.md` dosyasından statik JSON'lara çıkarılır (LLM ile kural
üretilmez); karakter şeması `helper_files/5E_CharacterSheet_Fillable.pdf`'teki tüm alanları kapsar.

## Kurulum

```bash
npm install
npm run parse      # guide.md -> src/data/*.json (races, classes, backgrounds, spells, config)
npm run dev        # http://localhost:5173
```

`npm run parse` çalışmadan uygulama veri bulamaz. Parse çıktısı repoya dahildir; guide güncellenirse yeniden çalıştır.

## Supabase (kalıcılık + auth)

`.env.example` → `.env` kopyala ve doldur:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

Sonra `supabase/migrations/0001_characters.sql` içeriğini Supabase SQL Editor'de çalıştır (tablo + RLS).

**Yerel mod:** `.env` yoksa uygulama otomatik olarak localStorage fallback ile çalışır (giriş gerektirmez, veriler
yalnız tarayıcıda). Supabase yapılandırılınca gerçek auth + RLS + kalıcı `characters` tablosu devreye girer.

## Komutlar

| Komut | İş |
|-------|-----|
| `npm run parse` | Guide markdown → JSON veri |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Prod derleme |
| `npx vite-node scripts/smoke-test.ts` | Çekirdek mantık testleri (30 kontrol) |

## Mimari

- `scripts/parse-guide.ts` — guide markdown ayrıştırıcı (ırk/sınıf/background/büyü + seviye özellikleri).
- `src/data/` — üretilen JSON + `config.json` (point-buy, skill eşlemesi).
- `src/types/` — `data.ts` (JSON tipleri), `character.ts` (tam sheet şeması, 334 PDF alanı).
- `src/lib/` — `rules.ts` (hesaplar), `derive.ts` (türetme), `levelup.ts` (seviye atlama), `storage.ts`,
  `supabase.ts`, `export.ts`.
- `src/components/wizard/` — 12 adımlık sihirbaz.
- `src/components/sheet/` — karakter kartı + level-up paneli.
- `src/pages/` — Login, MyCharacters, Wizard, CharacterSheet.

## Bilinen sınırlar / notlar

- **Büyü "bilinen sayısı" limiti** uygulanmaz — guide sınıf bazlı known/prepared sayılarını yapısal vermiyor;
  cantrip/1. seviye serbest seçilir (ileride sınıf tablosu eklenebilir).
- **Point-buy maliyet tablosu** guide'da açık değil; standart 5e kanonik tablo `config.json`'da.
- **Subclass özellikleri** guide'da tek blok olarak; seçildiği seviyede tek özellik olarak eklenir (seviye seviye
  subclass feature ayrıştırması ileri iş).
- Parser serbest metin guide'da çalışır; kritik alanlar (ability bonus, hit die, seviye özellikleri, büyü meta)
  regex ile doğrulanmıştır (`scripts/smoke-test.ts` 30 kontrol geçer).

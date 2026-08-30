# Supabase e-posta şablonları

Bu klasördeki HTML dosyaları **Supabase panelinden elle yapıştırılır** — repo'dan
otomatik deploy edilmezler. Değiştirdiğinde panele de yapıştırmayı unutma.

**Nereye:** Supabase Dashboard > Authentication > **Emails** > Templates

| Dosya | Panel şablonu | Ne zaman gider |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Yeni kayıt sonrası doğrulama |
| `reset-password.html` | Reset password | "Şifremi unuttum" |
| `change-email.html` | Change Email Address | E-posta değişikliği onayı |

Her şablonun **Subject** alanı dosyanın en üstünde yorum olarak yazılı.

## Neden bu kadar ilkel HTML?

E-posta istemcileri (özellikle Outlook) modern CSS'i desteklemez. Bu yüzden:
- Yerleşim `<table>` ile, flexbox/grid yok
- Tüm stiller `style=""` içinde satır içi — `<style>` bloğu Gmail'de kısmen çalışır,
  Outlook'ta hiç çalışmaz
- Buton "bulletproof button" deseni: Outlook için VML, diğerleri için tablo hücresi
- Web font yok — Georgia (serif) ve system-ui fallback. Fraunces/Inter maillerde yüklenmez
- Genişlik 600px sabit, mobilde `max-width` ile küçülür
- Logo PNG (`/logo-mail.png`) — e-posta istemcileri SVG render etmez

## Supabase değişkenleri

- `{{ .ConfirmationURL }}` — tıklanacak tam bağlantı (hem onay hem sıfırlama)
- `{{ .Token }}` — 6 haneli kod (bu şablonlarda yedek olarak kullanılmıyor)
- `{{ .SiteURL }}` — Authentication > URL Configuration'daki Site URL
- `{{ .Email }}` — alıcının adresi

## Test

Şablonu yapıştırdıktan sonra gerçek akışı çalıştır (şifremi unuttum / yeni kayıt).
Panelin önizlemesi değişkenleri doldurmaz, gerçek maili görmen gerekir.
Gmail'de mesaj > üç nokta > "Orijinali göster" ile `dkim=pass` / `spf=pass` kontrol et.

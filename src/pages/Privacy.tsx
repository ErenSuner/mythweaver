import { Link } from 'react-router-dom'

// KVKK / gizlilik aydınlatma metni. Yasal kesinlik için bir hukukçuya danış;
// [KÖŞELİ] alanları kendi bilgilerinle doldur.
export default function Privacy() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="panel stack" style={{ lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 26 }}>Gizlilik Politikası</h1>
        <p className="muted" style={{ fontSize: 13 }}>Son güncelleme: 2026-08-19</p>

        <p>
          Bu politika, Mythweaver (“Hizmet”) kullanımında kişisel verilerinin nasıl işlendiğini 6698 sayılı Kişisel
          Verilerin Korunması Kanunu (KVKK) kapsamında açıklar.
        </p>

        <h2 style={{ fontSize: 18 }}>Veri sorumlusu</h2>
        <p>[AD SOYAD / İŞLETME], iletişim: [E-POSTA].</p>

        <h2 style={{ fontSize: 18 }}>İşlenen veriler</h2>
        <ul>
          <li><b>Hesap:</b> e-posta adresi ve şifre (şifre, kimlik sağlayıcıda karma/şifreli saklanır).</li>
          <li><b>Google ile giriş:</b> tercih edersen Google’dan gelen e-posta ve hesap kimliği.</li>
          <li><b>İçerik:</b> oluşturduğun karakterler ve oyun verileri.</li>
          <li><b>Teknik:</b> oturum çerezleri/token’ları ve temel güvenlik günlükleri.</li>
        </ul>

        <h2 style={{ fontSize: 18 }}>İşleme amaçları ve hukuki sebep</h2>
        <p>
          Veriler; hesap oluşturma, kimlik doğrulama, karakterlerini saklama ve senkronlama, güvenlik ve kötüye
          kullanımın önlenmesi amaçlarıyla, sözleşmenin ifası ve meşru menfaat hukuki sebeplerine dayanılarak işlenir.
        </p>

        <h2 style={{ fontSize: 18 }}>Aktarım ve barındırma</h2>
        <p>
          Kimlik doğrulama ve veritabanı hizmetleri <b>Supabase</b>, statik barındırma <b>Cloudflare</b> üzerinden
          sağlanır. Bot korumasında Cloudflare Turnstile kullanılabilir. Bu sağlayıcılar verileri yurt dışında işleyebilir.
        </p>

        <h2 style={{ fontSize: 18 }}>Saklama süresi</h2>
        <p>Veriler, hesabın aktif olduğu sürece saklanır. Hesabını sildiğinde karakterlerinle birlikte kalıcı olarak silinir.</p>

        <h2 style={{ fontSize: 18 }}>Haklarını kullanma</h2>
        <p>
          KVKK md. 11 kapsamında verilerine erişme, düzeltme ve silme haklarına sahipsin. <b>Ayarlar</b> sayfasından
          verilerini JSON olarak indirebilir veya hesabını (tüm verilerinle) silebilirsin. Ek talepler için [E-POSTA].
        </p>

        <p style={{ marginTop: 12 }}>
          <Link to="/kosullar">Kullanım Koşulları</Link> · <Link to="/">Ana sayfa</Link>
        </p>
      </div>
    </div>
  )
}

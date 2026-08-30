import { Link } from 'react-router-dom'

// Kullanım Koşulları. Yasal kesinlik için bir hukukçuya danış; [KÖŞELİ] alanları doldur.
export default function Terms() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="panel stack legal-doc">
        <h1 style={{ fontSize: 'var(--fs-xl)' }}>Kullanım Koşulları</h1>
        <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>Son güncelleme: 2026-08-19</p>

        <p className="lead">Mythweaver’ı (“Hizmet”) kullanarak bu koşulları kabul etmiş olursun.</p>

        <h2 style={{ fontSize: 'var(--fs-md)' }}>Hesap</h2>
        <p>
          Hesabının ve şifrenin güvenliğinden sen sorumlusun. 13 yaşından küçüksen hizmeti kullanamazsın (veya
          bulunduğun ülkedeki asgari yaş). Doğru bir e-posta adresi vermelisin.
        </p>

        <h2 style={{ fontSize: 'var(--fs-md)' }}>Kabul edilebilir kullanım</h2>
        <ul>
          <li>Hizmeti hukuka aykırı amaçlarla veya başkalarının haklarını ihlal edecek şekilde kullanamazsın.</li>
          <li>Sistemi aşırı yükleme, otomatik kötüye kullanım veya güvenlik önlemlerini atlatma girişimi yasaktır.</li>
          <li>Oluşturduğun içerikten sen sorumlusun.</li>
        </ul>

        <h2 style={{ fontSize: 'var(--fs-md)' }}>İçerik ve fikri mülkiyet</h2>
        <p>
          Oyun kuralı içeriği (sınıflar, ırklar, büyüler vb.) Systems Reference Document 5.1’den (SRD) türetilmiştir ve
          <b> Creative Commons Attribution 4.0 (CC-BY-4.0)</b> lisansı altında kullanılır. Oluşturduğun karakterler sana aittir.
        </p>

        <h2 style={{ fontSize: 'var(--fs-md)' }}>Hizmetin sunumu</h2>
        <p>
          Hizmet “olduğu gibi” sunulur; kesintisizlik veya hatasızlık garanti edilmez. Verilerinin yedeğini düzenli
          almanı öneririz (Hesap → Verilerimi İndir). Yürürlükteki hukukun izin verdiği ölçüde, dolaylı zararlardan
          sorumluluk kabul edilmez.
        </p>

        <h2 style={{ fontSize: 'var(--fs-md)' }}>Fesih</h2>
        <p>Hesabını dilediğin an silebilirsin. Bu koşulları ihlal eden hesaplar askıya alınabilir veya kapatılabilir.</p>

        <h2 style={{ fontSize: 'var(--fs-md)' }}>İletişim</h2>
        <p>erenn.suner@gmail.com</p>

        <p style={{ marginTop: 12 }}>
          <Link to="/gizlilik">Gizlilik Politikası</Link> · <Link to="/">Ana sayfa</Link>
        </p>
      </div>
    </div>
  )
}

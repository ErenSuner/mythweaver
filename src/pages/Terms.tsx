import { Link } from 'react-router-dom'

// Kullanım Koşulları. Yasal kesinlik için bir hukukçuya danış; [KÖŞELİ] alanları doldur.
export default function Terms() {
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="panel stack" style={{ lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 26 }}>Kullanım Koşulları</h1>
        <p className="muted" style={{ fontSize: 13 }}>Son güncelleme: 2026-08-19</p>

        <p>Mythweaver’ı (“Hizmet”) kullanarak bu koşulları kabul etmiş olursun.</p>

        <h2 style={{ fontSize: 18 }}>Hesap</h2>
        <p>
          Hesabının ve şifrenin güvenliğinden sen sorumlusun. 13 yaşından küçüksen hizmeti kullanamazsın (veya
          bulunduğun ülkedeki asgari yaş). Doğru bir e-posta adresi vermelisin.
        </p>

        <h2 style={{ fontSize: 18 }}>Kabul edilebilir kullanım</h2>
        <ul>
          <li>Hizmeti hukuka aykırı amaçlarla veya başkalarının haklarını ihlal edecek şekilde kullanamazsın.</li>
          <li>Sistemi aşırı yükleme, otomatik kötüye kullanım veya güvenlik önlemlerini atlatma girişimi yasaktır.</li>
          <li>Oluşturduğun içerikten sen sorumlusun.</li>
        </ul>

        <h2 style={{ fontSize: 18 }}>İçerik ve fikri mülkiyet</h2>
        <p>
          Oyun kuralı içeriği (sınıflar, ırklar, büyüler vb.) Systems Reference Document 5.1’den (SRD) türetilmiştir ve
          <b> Creative Commons Attribution 4.0 (CC-BY-4.0)</b> lisansı altında kullanılır. Oluşturduğun karakterler sana aittir.
        </p>

        <h2 style={{ fontSize: 18 }}>Hizmetin sunumu</h2>
        <p>
          Hizmet “olduğu gibi” sunulur; kesintisizlik veya hatasızlık garanti edilmez. Verilerinin yedeğini düzenli
          almanı öneririz (Ayarlar → Verilerimi İndir). Yürürlükteki hukukun izin verdiği ölçüde, dolaylı zararlardan
          sorumluluk kabul edilmez.
        </p>

        <h2 style={{ fontSize: 18 }}>Fesih</h2>
        <p>Hesabını dilediğin an silebilirsin. Bu koşulları ihlal eden hesaplar askıya alınabilir veya kapatılabilir.</p>

        <h2 style={{ fontSize: 18 }}>İletişim</h2>
        <p>[E-POSTA]</p>

        <p style={{ marginTop: 12 }}>
          <Link to="/gizlilik">Gizlilik Politikası</Link> · <Link to="/">Ana sayfa</Link>
        </p>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        marginTop: 'auto',
        fontSize: 'var(--fs-sm)',
      }}
    >
      <div
        className="bleed-inner"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="row" style={{ gap: 14, flexWrap: 'wrap' }}>
          <Link to="/gizlilik" className="muted" style={{ textDecoration: 'none' }}>
            Gizlilik
          </Link>
          <Link to="/kosullar" className="muted" style={{ textDecoration: 'none' }}>
            Kullanım Koşulları
          </Link>
          <Link to="/ayarlar" className="muted" style={{ textDecoration: 'none' }}>
            Ayarlar
          </Link>
        </div>
        <span className="muted" style={{ fontSize: 'var(--fs-micro)', maxWidth: 520 }}>
          Kural içeriği{' '}
          <a href="https://dnd.wizards.com/resources/systems-reference-document" target="_blank" rel="noreferrer">
            SRD 5.1
          </a>{' '}
          temellidir,{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC-BY-4.0
          </a>{' '}
          lisansı altında kullanılır.
        </span>
      </div>
    </footer>
  )
}

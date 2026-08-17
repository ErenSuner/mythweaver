import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'

export default function BrandHeader() {
  const { user, signOut } = useAuthStore()
  const nav = useNavigate()
  return (
    <header
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'rgba(18,17,16,0.85)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="container"
        style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Mythweaver
          </span>
        </Link>
        {user && (
          <div className="row" style={{ gap: 14 }}>
            {!supabaseEnabled && <span className="badge">yerel mod</span>}
            <Link to="/campaign" className="muted" style={{ fontSize: 14, textDecoration: 'none' }}>
              Campaign
            </Link>
            {user.isAdmin && (
              <Link to="/dm" className="muted" style={{ fontSize: 14, textDecoration: 'none' }}>
                DM Paneli
              </Link>
            )}
            <span className="muted" style={{ fontSize: 14 }}>
              {user.email}
            </span>
            <button
              className="btn btn-ghost"
              onClick={async () => {
                await signOut()
                nav('/login')
              }}
            >
              Çıkış
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

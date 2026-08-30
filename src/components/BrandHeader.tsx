import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import GuardedNavLink from '@/components/GuardedNavLink'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'
import { CharactersIcon, CampaignIcon, DmIcon, UniverseIcon, DiceIcon, AccountIcon, LogoutIcon } from '@/components/icons'
import ThemeToggle from '@/components/ThemeToggle'
import InviteMenu from '@/components/InviteMenu'

export default function BrandHeader() {
  const { user, signOut } = useAuthStore()
  const nav = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const identity = user?.username ?? user?.email ?? ''
  const initial = identity.trim().charAt(0) || '?'

  // route değişince menüyü kapat
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // açıkken Esc ile kapat
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function onSignOut() {
    setOpen(false)
    await signOut()
    nav('/login')
  }

  const navLinks = (
    <>
      <GuardedNavLink to="/" end className="nav-link">
        <CharactersIcon size={18} />
        Karakterler
      </GuardedNavLink>
      <GuardedNavLink to="/campaign" className="nav-link">
        <CampaignIcon size={18} />
        Campaign
      </GuardedNavLink>
      {user?.isAdmin && (
        <GuardedNavLink to="/kurucu" className="nav-link">
          <DmIcon size={18} />
          Kurucu Paneli
        </GuardedNavLink>
      )}
      {/* Evrenler herkeste görünür: campaign kurmadan da evren hazırlanabilsin. */}
      <GuardedNavLink to="/evrenler" className="nav-link">
        <UniverseIcon size={18} />
        Evrenler
      </GuardedNavLink>
    </>
  )

  return (
    <header
      style={{
        borderBottom: '1px solid var(--line)',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        className="bleed-inner brand-inner"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <Link className="brand-mark" to="/">
          <span className="brand-mark-icon">
            <DiceIcon size={25} />
          </span>
          <span className="brand-mark-text">Mythweaver</span>
        </Link>
        {user && (
          <>
            {/* masaüstü: inline nav */}
            {/* Sekmeler markanın hemen yanında solda; hesap/tema/çıkış sağ kenarda. */}
            <nav className="brand-links">
              {!supabaseEnabled && <span className="badge">yerel mod</span>}
              {navLinks}
            </nav>
            <div className="brand-tools">
              {/* Sadece kullanıcı adı yazınca burasının "Hesap" olduğu
                  anlaşılmıyordu; adın yanına açık etiket kondu. */}
              <GuardedNavLink to="/hesap" className="identity" title="Hesabım">
                <span className="identity-avatar" aria-hidden="true">
                  {initial}
                </span>
                <span className="identity-name">{identity}</span>
                <span className="identity-tag">Hesap</span>
              </GuardedNavLink>
              <span className="brand-sep" aria-hidden="true" />
              <InviteMenu />
              <ThemeToggle />
              <button className="btn btn-ghost" onClick={onSignOut}>
                Çıkış
              </button>
            </div>

            {/* mobil: anahtar + hamburger */}
            <span className="brand-mobile-actions">
              <InviteMenu />
              <ThemeToggle />
            </span>
            <button
              className="brand-menu-btn"
              aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {/* mobil açılır menü */}
      {user && open && (
        <div className="brand-drawer">
          {!supabaseEnabled && (
            <span className="badge" style={{ alignSelf: 'flex-start' }}>
              yerel mod
            </span>
          )}
          {navLinks}
          <span className="brand-drawer-sep" aria-hidden="true" />
          <GuardedNavLink to="/hesap" className="nav-link">
            <AccountIcon size={18} />
            {identity} · Hesap
          </GuardedNavLink>
          <button className="nav-link" style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={onSignOut}>
            <LogoutIcon size={18} />
            Çıkış
          </button>
        </div>
      )}
    </header>
  )
}

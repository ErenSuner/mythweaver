import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { supabaseEnabled } from '@/lib/supabase'
import { CharactersIcon, CampaignIcon, DmIcon, UniverseIcon, DiceIcon, SettingsIcon, LogoutIcon } from '@/components/icons'
import ThemeToggle from '@/components/ThemeToggle'
import InviteMenu from '@/components/InviteMenu'

export default function BrandHeader() {
  const { user, signOut } = useAuthStore()
  const nav = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const identity = user?.username ?? user?.email ?? ''
  const initial = identity.trim().charAt(0) || '?'
  const isDm = Boolean(user?.isAdmin || user?.isDm)

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
      <NavLink to="/" end className="nav-link">
        <CharactersIcon size={17} />
        Karakterler
      </NavLink>
      <NavLink to="/campaign" className="nav-link">
        <CampaignIcon size={17} />
        Campaign
      </NavLink>
      {isDm && (
        <>
          <NavLink to="/dm" className="nav-link">
            <DmIcon size={17} />
            DM Paneli
          </NavLink>
          <NavLink to="/evrenler" className="nav-link">
            <UniverseIcon size={17} />
            Evrenler
          </NavLink>
        </>
      )}
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
        className="container"
        style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      >
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: 'var(--accent-bright)', display: 'inline-flex' }}>
            <DiceIcon size={22} />
          </span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
            Mythweaver
          </span>
        </Link>
        {user && (
          <>
            {/* masaüstü: inline nav */}
            <div className="brand-nav">
              {!supabaseEnabled && <span className="badge">yerel mod</span>}
              {navLinks}
              <span className="brand-sep" aria-hidden="true" />
              <NavLink to="/ayarlar" className="identity" title="Hesap ayarları">
                <span className="identity-avatar" aria-hidden="true">
                  {initial}
                </span>
                <span>{identity}</span>
              </NavLink>
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
          <NavLink to="/ayarlar" className="nav-link">
            <SettingsIcon size={17} />
            {identity} · Ayarlar
          </NavLink>
          <button className="nav-link" style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={onSignOut}>
            <LogoutIcon size={17} />
            Çıkış
          </button>
        </div>
      )}
    </header>
  )
}

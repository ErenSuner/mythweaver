// Kullanıcı adının altına açılan bildirim kutusu. Şimdilik tek bildirim türü var:
// campaign daveti. Kutu yalnız listeler — kabul/red /campaign sayfasındaki panelde
// yapılır, çünkü katılırken hangi karakterle katılınacağı seçilmeli.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useInviteStore } from '@/state/inviteStore'
import { supabaseEnabled } from '@/lib/supabase'
import { BellIcon } from '@/components/icons'

/** /campaign sayfasındaki davet panelinin çapası. */
export const INVITES_ANCHOR = 'gelen-davetler'

export default function InviteMenu() {
  const invites = useInviteStore((s) => s.invites)
  const loaded = useInviteStore((s) => s.loaded)
  const nav = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // route değişince kapat (BrandHeader'daki mobil menüyle aynı davranış)
  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.hash])

  // Esc + dışarı tıklama
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  if (!supabaseEnabled) return null

  const count = invites.length

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bell-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={count > 0 ? `Bildirimler (${count} yeni)` : 'Bildirimler'}
        title="Bildirimler"
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon size={19} />
        {count > 0 && (
          <span className="bell-badge" aria-hidden="true">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-menu" role="menu">
          <div className="notif-head">
            <span className="rubric">Bildirimler</span>
            {count > 0 && <span className="notif-count">{count}</span>}
          </div>
          {count === 0 ? (
            <p className="notif-empty muted">{loaded ? 'Yeni bildirim yok.' : 'Yükleniyor…'}</p>
          ) : (
            <ul className="notif-list">
              {invites.map((inv) => (
                <li key={inv.inviteId}>
                  <button
                    type="button"
                    role="menuitem"
                    className="notif-item"
                    onClick={() => {
                      setOpen(false)
                      nav(`/campaign#${INVITES_ANCHOR}`)
                    }}
                  >
                    <span className="notif-item-title">{inv.campaignName}</span>
                    <span className="hint">
                      {inv.inviterUsername ? `${inv.inviterUsername} davet etti` : 'Campaign daveti'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

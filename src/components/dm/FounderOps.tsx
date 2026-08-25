import { useEffect, useState } from 'react'
import { useAuthStore } from '@/state/authStore'
import { useConfirm } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import {
  listUsers,
  setUserRole,
  platformStats,
  listAuditLog,
  listCampaignsWithDm,
  setCampaignDm,
  type UserRow,
  type PlatformStats,
  type AuditRow,
  type CampaignWithDm,
} from '@/lib/admin-storage'

type Tab = 'users' | 'campaigns' | 'stats' | 'audit'

// Kurucu (founder) paneli: kullanıcı/rol yönetimi, platform istatistiği, denetim log'u.
export default function FounderOps() {
  const [tab, setTab] = useState<Tab>('users')
  return (
    <div>
      {/* Başlık ve açıklama sayfa başlığında (FounderPanel); burada yalnız sekmeler. */}
      <div className="section-head" style={{ flexWrap: 'wrap', gap: 10 }}>
        <h2>Platform</h2>
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Kullanıcılar</TabBtn>
          <TabBtn active={tab === 'campaigns'} onClick={() => setTab('campaigns')}>Campaign'ler</TabBtn>
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')}>İstatistik</TabBtn>
          <TabBtn active={tab === 'audit'} onClick={() => setTab('audit')}>Denetim</TabBtn>
        </div>
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'stats' && <StatsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`tab${active ? ' active' : ''}`} aria-pressed={active} onClick={onClick}>
      {children}
    </button>
  )
}

function UsersTab() {
  const confirm = useConfirm()
  const toast = useToast()
  const myId = useAuthStore((s) => s.user?.id ?? null)
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function refresh() {
    try {
      setUsers(await listUsers())
    } catch (e) {
      console.error('[founder] kullanıcı listesi', e)
      toast('Kullanıcılar yüklenemedi.', 'error')
    }
  }
  useEffect(() => {
    refresh()
  }, [])

  async function toggleAdmin(u: UserRow) {
    const removingSelf = u.id === myId && u.isAdmin
    if (removingSelf) {
      await confirm({
        title: 'İzin verilmiyor',
        message: 'Kendi kurucu yetkini kaldıramazsın (kilitlenme riski). Başka bir kurucu bunu yapabilir.',
        confirmLabel: 'Tamam',
      })
      return
    }
    const ok = await confirm({
      title: u.isAdmin ? 'Kurucu yetkisini al' : 'Kurucu yap',
      message: (
        <>
          <b>{u.email ?? u.id}</b> {u.isAdmin ? 'kullanıcısının kurucu (tam erişim) yetkisi kaldırılacak.' : 'kullanıcısına kurucu (tam erişim) yetkisi verilecek. Tüm karakterleri okuyup düzenleyebilir.'}
        </>
      ),
      confirmLabel: u.isAdmin ? 'Evet, al' : 'Evet, kurucu yap',
      danger: !u.isAdmin,
    })
    if (!ok) return
    setBusy(u.id)
    try {
      await setUserRole(u.id, { is_admin: !u.isAdmin })
      await refresh()
    } catch (e) {
      console.error('[founder] rol değişimi', e)
      toast('Rol değiştirilemedi. Tekrar dene.', 'error')
    } finally {
      setBusy(null)
    }
  }

  if (users === null) return <p className="muted">Yükleniyor…</p>
  if (users.length === 0) return <p className="muted">Kullanıcı yok.</p>

  return (
    <div className="panel" style={{ overflowX: 'auto', padding: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)', whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-dim)' }}>
            <th style={cellH}>E-posta</th>
            <th style={{ ...cellH, textAlign: 'center' }}>Karakter</th>
            <th style={{ ...cellH, textAlign: 'center' }}>Rol</th>
            <th style={{ ...cellH, textAlign: 'right' }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid var(--line)' }}>
              <td style={cell}>
                {u.email ?? '—'}
                {u.id === myId && <span className="hint"> (sen)</span>}
              </td>
              <td style={{ ...cell, textAlign: 'center' }}>{u.characterCount}</td>
              <td style={{ ...cell, textAlign: 'center' }}>
                {u.isAdmin ? <span className="badge badge-new">Kurucu</span> : <span className="muted">Oyuncu</span>}
              </td>
              <td style={{ ...cell, textAlign: 'right' }}>
                <button className="btn btn-ghost" disabled={busy === u.id} onClick={() => toggleAdmin(u)}>
                  {u.isAdmin ? 'Kurucu yetkisini al' : 'Kurucu yap'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampaignsTab() {
  const toast = useToast()
  const [camps, setCamps] = useState<CampaignWithDm[] | null>(null)
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function refresh() {
    const [c, u] = await Promise.all([listCampaignsWithDm(), listUsers()])
    setCamps(c)
    setUsers(u)
  }
  useEffect(() => {
    refresh().catch((e) => {
      console.error('[founder] campaign listesi', e)
      toast('Campaign listesi yüklenemedi.', 'error')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onChangeDm(campaignId: string, value: string) {
    setBusy(campaignId)
    try {
      await setCampaignDm(campaignId, value || null)
      await refresh()
    } catch (e) {
      console.error('[founder] DM atama', e)
      toast('DM atanamadı. Tekrar dene.', 'error')
    } finally {
      setBusy(null)
    }
  }

  if (camps === null || users === null) return <p className="muted">Yükleniyor…</p>
  if (camps.length === 0) return <p className="muted">Henüz campaign yok.</p>

  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="hint" style={{ marginTop: 0 }}>
        Her campaign'e bir DM ata (opsiyonel). Atanan DM yalnız o campaign'in karakterlerini görür/düzenler.
      </p>
      <div className="panel" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)', whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-dim)' }}>
              <th style={cellH}>Campaign</th>
              <th style={cellH}>DM</th>
            </tr>
          </thead>
          <tbody>
            {camps.map((c) => (
              <tr key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={cell}><b>{c.name}</b></td>
                <td style={cell}>
                  <select
                    value={c.dmUserId ?? ''}
                    disabled={busy === c.id}
                    onChange={(e) => onChangeDm(c.id, e.target.value)}
                    style={{ minWidth: 200 }}
                  >
                    <option value="">— DM yok —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.email ?? u.id}
                        {u.isAdmin ? ' (kurucu)' : ''}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatsTab() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  useEffect(() => {
    platformStats().then(setStats).catch((e) => console.error('[founder] istatistik', e))
  }, [])
  if (stats === null) return <p className="muted">Yükleniyor…</p>
  return (
    <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
      <StatCard label="Kullanıcı" value={stats.users} />
      <StatCard label="Karakter" value={stats.characters} />
      <StatCard label="Tamamlanmış" value={stats.completed} />
      <StatCard label="Taslak" value={stats.drafts} />
      <StatCard label="Campaign" value={stats.campaigns} />
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel" style={{ textAlign: 'center', minWidth: 120, flex: '1 1 120px' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 'var(--fs-xl)', color: 'var(--gold-bright)' }}>{value}</div>
      <div className="hint">{label}</div>
    </div>
  )
}

function AuditTab() {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  useEffect(() => {
    listAuditLog(50).then(setRows).catch((e) => console.error('[founder] denetim log', e))
  }, [])
  if (rows === null) return <p className="muted">Yükleniyor…</p>
  if (rows.length === 0)
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 24 }}>
        <p className="muted">Henüz denetim kaydı yok. Bir DM başka oyuncunun karakterini düzenleyince burada görünür.</p>
      </div>
    )
  return (
    <div className="stack" style={{ gap: 6 }}>
      <p className="hint" style={{ marginTop: 0 }}>Son {rows.length} kayıt — DM'in başka oyuncunun karakterini düzenlemesi.</p>
      {rows.map((r) => (
        <div key={r.id} className="panel" style={{ padding: 10 }}>
          <div className="spread" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span>
              <b>{r.editorEmail ?? '—'}</b> <span className="muted">düzenledi →</span> <b>{r.ownerEmail ?? '—'}</b>
            </span>
            <span className="hint">{new Date(r.editedAt).toLocaleString('tr-TR')}</span>
          </div>
          <div className="hint">Karakter: {r.characterId}</div>
        </div>
      ))}
    </div>
  )
}

const cellH: React.CSSProperties = { padding: '10px 12px', fontWeight: 600 }
const cell: React.CSSProperties = { padding: '9px 12px' }

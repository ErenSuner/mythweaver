import { useNavigate } from 'react-router-dom'
import FounderOps from '@/components/dm/FounderOps'
import { DmIcon } from '@/components/icons'

/* Kurucu Paneli — platform sahibine özel. Campaign yönetimi artık her
   campaign'in kendi sayfasında; burada yalnız platform düzeyindeki işler
   var: kullanıcı/rol yönetimi, istatistik, denetim kaydı. */
export default function FounderPanel() {
  const nav = useNavigate()
  return (
    <div className="container">
      <div className="page-head with-icon">
        <span className="page-icon">
          <DmIcon size={24} />
        </span>
        <div className="page-head-text">
          <h1>Kurucu Paneli</h1>
          <p className="page-sub">Kullanıcıları ve rolleri yönet, platformu izle. Yalnız sen görürsün.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => nav('/campaign')}>
          ← Campaign&apos;ler
        </button>
      </div>
      <FounderOps />
    </div>
  )
}

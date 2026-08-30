import { NavLink, useNavigate, type NavLinkProps } from 'react-router-dom'
import { useNavGuard } from '@/state/navGuard'

/**
 * NavLink + kaydedilmemiş-değişiklik koruması. Bir sayfa navGuard'a onay
 * fonksiyonu koymuşsa, link tıklanınca önce o çalışır (tema-uyumlu popup);
 * kullanıcı çıkmayı onaylarsa navigasyon sürer, aksi halde iptal.
 * Guard yoksa sıradan NavLink gibi davranır.
 */
export default function GuardedNavLink({ to, onClick, ...rest }: NavLinkProps) {
  const nav = useNavigate()
  const confirmLeave = useNavGuard((s) => s.confirmLeave)
  return (
    <NavLink
      to={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (confirmLeave && typeof to === 'string') {
          e.preventDefault()
          void confirmLeave().then((ok) => {
            if (ok) nav(to)
          })
        }
      }}
    />
  )
}

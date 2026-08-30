import { create } from 'zustand'

/**
 * Uygulama-içi navigasyon koruması. Bir sayfada kaydedilmemiş değişiklik varsa
 * (ör. Evren düzenleme), o sayfa buraya bir onay fonksiyonu koyar. Üst menü /
 * footer linkleri (GuardedNavLink) tıklanınca önce bunu çağırır: fonksiyon
 * true dönerse navigasyon sürer, false dönerse iptal.
 *
 * React Router 6'da BrowserRouter + <Routes> kullandığımız için useBlocker
 * (yalnız data router) yok; bu store o boşluğu doldurur. Tarayıcı kapatma/
 * yenileme ayrıca beforeunload ile korunur (o dialog native, tema uygulanamaz).
 */
interface NavGuardState {
  /** null = engel yok. Doluysa: çıkıştan önce çağır, dönüşüne göre davran. */
  confirmLeave: (() => Promise<boolean>) | null
  setConfirmLeave: (fn: (() => Promise<boolean>) | null) => void
}

export const useNavGuard = create<NavGuardState>((set) => ({
  confirmLeave: null,
  setConfirmLeave: (fn) => set({ confirmLeave: fn }),
}))

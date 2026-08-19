import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { supabaseEnabled } from '@/lib/supabase'
import Login from '@/pages/Login'
import ResetPassword from '@/pages/ResetPassword'
import MyCharacters from '@/pages/MyCharacters'
import Wizard from '@/pages/Wizard'
import CharacterSheet from '@/pages/CharacterSheet'
import CampaignParty from '@/pages/CampaignParty'
import DMPanel from '@/pages/DMPanel'
import Universes from '@/pages/Universes'
import Settings from '@/pages/Settings'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import BrandHeader from '@/components/BrandHeader'
import Footer from '@/components/Footer'
import UsernameGate from '@/components/UsernameGate'
import { ConfirmProvider } from '@/components/Modal'
import { ToastProvider } from '@/components/Toast'
import ErrorBoundary from '@/components/ErrorBoundary'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuthStore()
  if (!ready) return <div className="container">Yükleniyor…</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireDM({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuthStore()
  if (!ready) return <div className="container">Yükleniyor…</div>
  if (!user) return <Navigate to="/login" replace />
  if (!user.isAdmin && !user.isDm) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { init, ready, user } = useAuthStore()
  const setUserId = useCharacterStore((s) => s.setUserId)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    setUserId(user?.id ?? null)
  }, [user, setUserId])

  // Sekme arka plana alınırken / kapanırken bekleyen kaydı diske indir (veri kaybı önleme).
  useEffect(() => {
    const flush = () => {
      void useCharacterStore.getState().flushSave()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <ToastProvider>
          <div className="app-shell">
          <UsernameGate />
          <BrandHeader />
          <main className="app-main">
          <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/gizlilik" element={<Privacy />} />
        <Route path="/kosullar" element={<Terms />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <MyCharacters />
            </RequireAuth>
          }
        />
        <Route
          path="/wizard/:id"
          element={
            <RequireAuth>
              <Wizard />
            </RequireAuth>
          }
        />
        <Route
          path="/character/:id"
          element={
            <RequireAuth>
              <CharacterSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/campaign"
          element={
            <RequireAuth>
              <CampaignParty />
            </RequireAuth>
          }
        />
        <Route
          path="/dm"
          element={
            <RequireDM>
              <DMPanel />
            </RequireDM>
          }
        />
        <Route
          path="/evrenler"
          element={
            <RequireAuth>
              <Universes />
            </RequireAuth>
          }
        />
        <Route
          path="/ayarlar"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </main>
          <Footer />
          </div>
        </ToastProvider>
      </ConfirmProvider>
    </ErrorBoundary>
  )
}

import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { supabaseEnabled } from '@/lib/supabase'
import Login from '@/pages/Login'
import MyCharacters from '@/pages/MyCharacters'
import Wizard from '@/pages/Wizard'
import CharacterSheet from '@/pages/CharacterSheet'
import BrandHeader from '@/components/BrandHeader'
import { ConfirmProvider } from '@/components/Modal'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, ready } = useAuthStore()
  if (!ready) return <div className="container">Yükleniyor…</div>
  if (!user) return <Navigate to="/login" replace />
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

  return (
    <ConfirmProvider>
      <BrandHeader />
      <Routes>
        <Route path="/login" element={<Login />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ConfirmProvider>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useCharacterStore } from '@/state/characterStore'
import { getCharacter } from '@/lib/storage'
import { classById } from '@/data'
import { WIZARD_STEPS } from '@/components/wizard/steps'

export default function Wizard() {
  const { id } = useParams()
  const nav = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const { character, load, setStep, saving, saveError, save, adminOwnerId } = useCharacterStore()
  // ?step=<key> ile gelindiyse düzenleme modu — mount'ta yakala
  const [editMode] = useState(() => searchParams.has('step'))
  const [needFix, setNeedFix] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (character?.id === id) return
    ;(async () => {
      try {
        setLoadError(false)
        const c = await getCharacter(id!, user?.id ?? null)
        if (c) load(c)
        else nav('/')
      } catch (e) {
        console.error('[wizard] yükleme hatası', e)
        setLoadError(true)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // görünür adımlar: büyücü değilse Büyüler, 1. seviyede başlıyorsa
  // Seviyeleri Yükselt adımı atlanır
  const steps = useMemo(() => {
    const isCaster = character ? Boolean(classById(character.classId)?.isCaster) : false
    const startsHigher = (character?.startingLevel ?? 1) > 1
    return WIZARD_STEPS.filter((s) => {
      if (s.key === 'spells') return isCaster
      if (s.key === 'levels') return startsHigher
      return true
    })
  }, [character?.classId, character?.startingLevel])

  // sheet'ten "Düzenle" ile gelindiyse ilgili adıma atla, sonra parametreyi temizle
  useEffect(() => {
    if (!character) return
    const key = searchParams.get('step')
    if (!key) return
    const idx = steps.findIndex((s) => s.key === key)
    if (idx >= 0) setStep(idx)
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id, steps])

  if (!character) {
    if (loadError) {
      return (
        <div className="container" style={{ textAlign: 'center', padding: 50 }}>
          <p className="muted" style={{ marginBottom: 12 }}>Karakter yüklenemedi.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setLoadError(false)
              getCharacter(id!, user?.id ?? null)
                .then((c) => (c ? load(c) : nav('/')))
                .catch(() => setLoadError(true))
            }}
          >
            Tekrar dene
          </button>
        </div>
      )
    }
    return <div className="container">Yükleniyor…</div>
  }

  const stepIndex = Math.min(character.wizardStep, steps.length - 1)
  const step = steps[stepIndex]
  const StepComp = step.component
  const pct = Math.round(((stepIndex + 1) / steps.length) * 100)

  const canNext = step.canProceed ? step.canProceed(character) : true
  const isLast = stepIndex === steps.length - 1

  function goTo(next: number) {
    setNeedFix(null)
    setStep(Math.max(0, Math.min(next, steps.length - 1)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function go(delta: number) {
    const next = stepIndex + delta
    if (next < 0) return
    // düzenleme modunda İleri asla finalize etmez; son adımda clamp'lenir
    if (next >= steps.length) {
      if (editMode) return
      useCharacterStore.getState().update({ completed: true })
      nav(`/character/${character!.id}`)
      return
    }
    goTo(next)
  }

  // düzenleme sonrası: bozulan zorunlu adım varsa oraya yönlendir, yoksa kağıda dön
  function returnToSheet() {
    const broken = steps.findIndex((s) => s.canProceed && !s.canProceed(character!))
    if (broken >= 0) {
      setNeedFix(steps[broken].title)
      setStep(broken)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    nav(`/character/${character!.id}`)
  }

  function Nav() {
    return (
      <div className="spread wizard-nav">
        <button className="btn" onClick={() => go(-1)} disabled={stepIndex === 0}>
          ← Geri
        </button>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!canNext && <span style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)' }}>Bu adımdaki zorunlu seçimleri tamamla.</span>}
          <button className="btn btn-ghost" onClick={() => nav(adminOwnerId ? '/campaign' : '/')}>
            Kaydet & Çık
          </button>
          {editMode ? (
            <>
              <button className="btn" onClick={() => go(1)} disabled={isLast || !canNext}>
                İleri →
              </button>
              <button className="btn btn-primary" onClick={returnToSheet} disabled={!canNext}>
                ✓ Kağıda Dön
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => go(1)} disabled={!canNext}>
              {isLast ? 'Tamamla ✦' : 'İleri →'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {adminOwnerId && (
        <div
          className="info"
          style={{
            borderColor: 'var(--danger)',
            marginBottom: 14,
            position: 'sticky',
            top: 60,
            zIndex: 10,
          }}
        >
          ⚠ <b>DM modu:</b> Bir oyuncunun karakterini düzenliyorsun. Değişiklikler doğrudan oyuncuya yansır.
        </div>
      )}
      {/* Durum şeridi: adım sayacı, ilerleme ve kaydetme durumu tek satırda.
          Önceden üç ayrı blok üst üsteydi. */}
      <div className="wizard-status">
        <span className="badge">
          Adım {stepIndex + 1} / {steps.length}
        </span>
        <div className="progress">
          <span style={{ width: `${pct}%` }} />
        </div>
        {saving ? (
          <span className="muted wizard-save">kaydediliyor…</span>
        ) : saveError ? (
          <span className="wizard-save" style={{ color: 'var(--danger)', cursor: 'pointer' }} onClick={() => save()} title="Tekrar dene">
            ⚠ kaydedilemedi
          </span>
        ) : (
          <span className="muted wizard-save">kaydedildi ✓</span>
        )}
      </div>

      {editMode && needFix && (
        <div className="info" style={{ borderColor: 'var(--danger)', marginBottom: 14 }}>
          Bu değişiklik bazı önceki seçimleri etkiledi. Lütfen <b>{needFix}</b> adımını tamamla — sonra tekrar “Kağıda Dön”e bas.
        </div>
      )}

      <div className="panel">
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 'var(--fs-lg)', marginBottom: 2 }}>{step.title}</h1>
          {step.subtitle && <p className="hint">{step.subtitle}</p>}
        </div>
        <StepComp />
      </div>

      <div style={{ marginTop: 18 }}>
        <Nav />
      </div>
    </div>
  )
}

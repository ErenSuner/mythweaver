// Tema içi zar kutusu — tarayıcı pop-up'ı yerine. Tabloyu gösterir, zarı döndürür,
// çıkan satırı vurgular. Kullanıcı kabul edebilir, yeniden atabilir ya da listeden seçebilir.
import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import type { DiceRow } from '@/types/data'

const SPIN_MS = 700

export interface DiceRollModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  rows: DiceRow[]
  /** kullanıcı bu alana elle yazmışsa uyarı gösterilir */
  overwriteWarning?: boolean
  onAccept: (text: string) => void
}

export default function DiceRollModal({ open, onClose, title, subtitle, rows, overwriteWarning, onAccept }: DiceRollModalProps) {
  const [rolling, setRolling] = useState(false)
  const [face, setFace] = useState(1)
  const [result, setResult] = useState<number | null>(null)
  const timers = useRef<number[]>([])
  const resultRef = useRef<HTMLDivElement>(null)

  const dieSize = rows.length

  useEffect(() => {
    if (open) {
      setRolling(false)
      setResult(null)
      setFace(1)
    }
    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [open])

  useEffect(() => {
    if (result != null) resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [result])

  function roll() {
    if (!dieSize || rolling) return
    setRolling(true)
    setResult(null)
    const tick = window.setInterval(() => setFace(1 + Math.floor(Math.random() * dieSize)), 70)
    const stop = window.setTimeout(() => {
      clearInterval(tick)
      const picked = Math.floor(Math.random() * dieSize)
      setFace(picked + 1)
      setResult(picked)
      setRolling(false)
    }, SPIN_MS)
    timers.current.push(tick, stop)
  }

  const chosen = result != null ? rows[result] : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={title}
      subtitle={subtitle ?? `d${dieSize} tablosu — zar at ya da doğrudan bir satır seç`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="btn" onClick={roll} disabled={rolling || !dieSize}>
            {result == null ? '🎲 Zar at' : '🎲 Tekrar at'}
          </button>
          <button type="button" className="btn btn-primary" disabled={!chosen} onClick={() => chosen && onAccept(chosen.text)}>
            Kabul et
          </button>
        </>
      }
    >
      {overwriteWarning && (
        <div className="info" style={{ borderLeftColor: 'var(--maroon-bright)', background: 'rgba(168, 53, 67, 0.14)' }}>
          Bu alana elle yazdığın metin var. <b>Kabul et</b> dersen üzerine yazılır.
        </div>
      )}

      <div className="dice-stage">
        <div className={`die${rolling ? ' die-rolling' : ''}`} aria-live="polite">
          {face}
        </div>
        <div className="hint" style={{ textAlign: 'center' }}>
          {rolling ? 'Zar dönüyor…' : result == null ? `d${dieSize} · her satırın eşit şansı var` : `Sonuç: ${face}`}
        </div>
      </div>

      <div className="dice-table">
        {rows.map((r, i) => {
          const on = result === i
          return (
            <div
              key={r.roll || i}
              ref={on ? resultRef : undefined}
              className={`dice-row${on ? ' dice-row-hit' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => setResult(i)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setResult(i)}
            >
              <span className="dice-roll">{r.roll || i + 1}</span>
              <span>{r.text}</span>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

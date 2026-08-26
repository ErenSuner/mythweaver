import { useState } from 'react'
import { classById, startingWealthFor } from '@/data'
import { rollStartingWealth } from '@/lib/inventory'
import { Modal } from '@/components/Modal'

// ---------- altın zarı ----------
export default function GoldRollModal({
  open,
  onClose,
  classId,
  onAccept,
}: {
  open: boolean
  onClose: () => void
  classId: string
  onAccept: (total: number, dice: number[]) => void
}) {
  const wealth = startingWealthFor(classId)
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<{ total: number; dice: number[] } | null>(null)

  function roll() {
    if (rolling) return
    setRolling(true)
    setResult(null)
    window.setTimeout(() => {
      setResult(rollStartingWealth(classId))
      setRolling(false)
    }, 700)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Başlangıç altınını at"
      subtitle={`${classById(classId)?.name ?? ''} — ${wealth?.text ?? ''}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="btn" onClick={roll} disabled={rolling}>
            {result ? '🎲 Tekrar at' : '🎲 Zar at'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!result}
            onClick={() => {
              if (!result) return
              onAccept(result.total, result.dice)
              onClose()
            }}
          >
            Kabul et
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, color: 'var(--ink-dim)' }}>
        Sınıfın başlangıç serveti <b>{wealth?.text}</b>. Zarları atıp toplamı alacaksın; sonra bu altınla alışveriş
        yapacaksın. Zar sonucundan memnun değilsen tekrar atabilirsin — ama masanda DM tek atışa izin veriyorsa ilk
        sonucu kullan.
      </p>
      <div className="dice-stage">
        <div className={`die${rolling ? ' die-rolling' : ''}`}>{result ? result.dice[0] : '?'}</div>
        {result && (
          <div style={{ textAlign: 'center' }}>
            <div className="hint">
              {result.dice.join(' + ')} = {result.dice.reduce((a, b) => a + b, 0)}
              {wealth && wealth.dice.multiplier > 1 ? ` × ${wealth.dice.multiplier}` : ''}
            </div>
            <div className="gold-amount">{result.total} gp</div>
          </div>
        )}
        {!result && !rolling && <div className="hint">Zar henüz atılmadı</div>}
      </div>
    </Modal>
  )
}

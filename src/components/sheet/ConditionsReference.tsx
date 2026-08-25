// Durumlar (conditions) sözlüğü — karakter sayfasında katlanır referans.
// Yeni oyuncu "prone ne demek?" diye kural kitabı aramasın diye.
import { useState } from 'react'
import { conditions } from '@/data'
import { Modal } from '@/components/Modal'
import type { Condition } from '@/types/data'

export default function ConditionsReference() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Condition | null>(null)

  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <button type="button" className="spread" style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'flex' }} onClick={() => setOpen((v) => !v)}>
        <h2 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Durumlar (Conditions)</h2>
        <span className="badge">{open ? 'gizle ▲' : `${conditions.length} durum ▼`}</span>
      </button>

      {open && (
        <>
          <p className="hint" style={{ marginTop: 8 }}>
            Oyunda bir yaratık "korkmuş", "yerde" ya da "felçli" olabilir. Her durumun kesin bir kuralı vardır — birine
            tıkla, tam metnini gör.
          </p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {conditions.map((c) => (
              <button key={c.id} type="button" className="btn" onClick={() => setActive(c)}>
                {c.name} <span className="hint">({c.nameTr})</span>
              </button>
            ))}
          </div>
        </>
      )}

      <ConditionModal condition={active} onClose={() => setActive(null)} />
    </div>
  )
}

export function ConditionModal({ condition, onClose }: { condition: Condition | null; onClose: () => void }) {
  if (!condition) return null
  return (
    <Modal open onClose={onClose} title={condition.name} subtitle={condition.nameTr}>
      {condition.effects.length > 0 && (
        <ul style={{ color: 'var(--ink-dim)', fontSize: 'var(--fs-base)', paddingLeft: 18, margin: 0 }}>
          {condition.effects.map((e, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              {e}
            </li>
          ))}
        </ul>
      )}

      {condition.levels && (
        <div className="dice-table" style={{ marginTop: 12 }}>
          {condition.levels.map((l) => (
            <div key={l.level} className="dice-row" style={{ cursor: 'default' }}>
              <span className="dice-roll">Sv. {l.level}</span>
              <span>{l.effect}</span>
            </div>
          ))}
        </div>
      )}

      {condition.notes?.map((n, i) => (
        <p key={i} className="hint" style={{ marginTop: 10 }}>
          {n}
        </p>
      ))}
    </Modal>
  )
}

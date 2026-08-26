import { useState } from 'react'
import { itemById } from '@/data'
import { fixedPickKey } from '@/lib/inventory'
import ItemPickerModal from '@/components/equipment/ItemPickerModal'
import ItemDetailModal from '@/components/equipment/ItemDetailModal'
import { useChar } from '@/components/wizard/useChar'
import { type EquipPick } from '@/data/starting-equipment'
import type { Item } from '@/types/data'

// ---------- koşulsuz ama listeden seçilecek eşya ----------
export default function FixedPickBox({ scope, pick }: { scope: 'class' | 'bg'; pick: EquipPick & { id: string } }) {
  const { character, updateFn } = useChar()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Item | null>(null)
  const key = fixedPickKey(scope, pick.id)
  const picked = character.equipPicks[key] ?? []
  const done = picked.length >= pick.count

  return (
    <div className="panel" style={{ padding: 14, borderColor: done ? 'var(--line)' : 'var(--maroon-bright)' }}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>{pick.label}</label>
        <span className={done ? 'badge badge-new' : 'badge'}>
          {picked.length}/{pick.count} {done ? '✓' : 'seç'}
        </span>
      </div>
      {pick.help && <p className="hint" style={{ marginTop: 0 }}>{pick.help}</p>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className={`btn ${done ? '' : 'btn-primary'}`} onClick={() => setOpen(true)}>
          {done ? 'Seçimi değiştir' : 'Listeden seç →'}
        </button>
        {picked.map((id, i) => {
          const item = itemById(id)
          if (!item) return null
          return (
            <button key={`${id}-${i}`} type="button" className="badge badge-new" style={{ cursor: 'pointer' }} onClick={() => setDetail(item)}>
              {item.name} ⓘ
            </button>
          )
        })}
      </div>
      <ItemPickerModal
        open={open}
        onClose={() => setOpen(false)}
        pick={pick}
        value={picked}
        onChange={(ids) => updateFn((c) => { c.equipPicks[key] = ids })}
      />
      <ItemDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

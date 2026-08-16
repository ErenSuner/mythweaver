// "Herhangi bir savaş yakın dövüş silahı" gibi seçimleri gerçek listeye çevirir.
// Kullanıcı hiçbir şey yazmaz; kartlardan seçer, her kartın detayını açabilir.
import { useMemo, useState } from 'react'
import { Modal } from '@/components/Modal'
import type { EquipPick } from '@/data/starting-equipment'
import { pickOptions } from '@/lib/inventory'
import ItemCard from './ItemCard'
import ItemDetailModal from './ItemDetailModal'
import type { Item } from '@/types/data'

export interface ItemPickerModalProps {
  open: boolean
  onClose: () => void
  pick: EquipPick
  value: string[]
  onChange: (ids: string[]) => void
}

export default function ItemPickerModal({ open, onClose, pick, value, onChange }: ItemPickerModalProps) {
  const [detail, setDetail] = useState<Item | null>(null)
  const [query, setQuery] = useState('')
  const options = useMemo(() => pickOptions(pick), [pick])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
  }, [options, query])

  const done = value.length >= pick.count

  function toggle(id: string) {
    const next = [...value]
    const i = next.indexOf(id)
    if (pick.allowDuplicates) {
      // aynı eşyadan iki tane seçilebilir: tıkladıkça ekler, doluysa sıfırlar
      if (next.length >= pick.count) onChange([id])
      else onChange([...next, id])
      return
    }
    if (i >= 0) next.splice(i, 1)
    else if (next.length < pick.count) next.push(id)
    else next[next.length - 1] = id
    onChange(next)
  }

  const countOf = (id: string) => value.filter((v) => v === id).length

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        wide
        title={pick.label}
        subtitle={pick.help}
        footer={
          <>
            <span className={done ? 'badge badge-new' : 'badge'} style={{ marginRight: 'auto' }}>
              {value.length}/{pick.count} seçildi
            </span>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Kapat
            </button>
            <button type="button" className="btn btn-primary" disabled={!done} onClick={onClose}>
              Tamam
            </button>
          </>
        }
      >
        {options.length > 8 && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ara… (ör. balta, yay)"
            style={{ marginBottom: 12 }}
          />
        )}
        <div className="item-grid">
          {filtered.map((item) => {
            const n = countOf(item.id)
            return (
              <ItemCard
                key={item.id}
                item={item}
                selected={n > 0}
                badge={n > 1 ? `×${n}` : undefined}
                onSelect={() => toggle(item.id)}
                onDetail={() => setDetail(item)}
              />
            )
          })}
        </div>
        {filtered.length === 0 && <p className="hint">Eşleşen eşya yok.</p>}
      </Modal>
      <ItemDetailModal item={detail} onClose={() => setDetail(null)} />
    </>
  )
}

import { useState } from 'react'
import { itemById } from '@/data'
import { buildInventory, inventoryWeight, startingGoldGp, remainingGoldGp } from '@/lib/inventory'
import { gpLabel } from '@/components/equipment/format'
import { useChar } from '@/components/wizard/useChar'
import type { Item } from '@/types/data'

// ---------- envanter özeti ----------
export default function InventoryPanel({ onDetail }: { onDetail: (i: Item) => void }) {
  const { character } = useChar()
  const [expandPack, setExpandPack] = useState(false)
  const list = buildInventory(character)
  const weight = inventoryWeight(character)

  const SOURCE_TR: Record<string, string> = { class: 'Sınıf', background: 'Geçmiş', purchase: 'Satın alınan', pack: 'Paket içi' }

  return (
    <div>
      <div className="spread">
        <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Envanterin</h3>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{weight} lb</span>
          <span className="badge badge-new">{gpLabel(remainingGoldGp(character))}</span>
        </div>
      </div>
      <p className="hint" style={{ marginTop: 4 }}>
        Toplam altının {gpLabel(startingGoldGp(character))}; kalan {gpLabel(remainingGoldGp(character))}. Bu rakam
        seçimlerinden otomatik hesaplanır.
      </p>

      {list.length === 0 ? (
        <p className="muted">Henüz eşyan yok — yukarıdaki seçimleri tamamla.</p>
      ) : (
        <div className="panel" style={{ padding: 14, background: 'var(--panel-solid)' }}>
          {list.map((e) => {
            const item = itemById(e.itemId)
            if (!item) return null
            return (
              <div key={`${e.itemId}-${e.source}`} className="inv-row">
                <button type="button" className="term" onClick={() => onDetail(item)}>
                  {item.name}
                  {e.qty > 1 ? ` ×${e.qty}` : ''}
                </button>
                <span className="hint">{SOURCE_TR[e.source]}</span>
              </div>
            )
          })}
          {list.some((e) => itemById(e.itemId)?.category === 'pack') && (
            <>
              <div className="divider" />
              <button type="button" className="btn btn-ghost" onClick={() => setExpandPack((v) => !v)}>
                {expandPack ? 'Paket içeriğini gizle' : 'Paketlerin içinde ne var?'}
              </button>
              {expandPack &&
                list
                  .map((e) => itemById(e.itemId))
                  .filter((i): i is Item => i?.category === 'pack')
                  .map((pack) => (
                    <div key={pack.id} style={{ marginTop: 10 }}>
                      <label>{pack.name}</label>
                      <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
                        {(pack.contents ?? [])
                          .map((c) => `${itemById(c.itemId)?.name ?? c.itemId}${c.qty > 1 ? ` ×${c.qty}` : ''}`)
                          .join(', ')}
                      </div>
                    </div>
                  ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

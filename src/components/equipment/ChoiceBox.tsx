import { useState } from 'react'
import { itemById } from '@/data'
import { choiceKey, optionPickKey } from '@/lib/inventory'
import ItemPickerModal from '@/components/equipment/ItemPickerModal'
import { useChar } from '@/components/wizard/useChar'
import { type EquipChoice, type EquipOption } from '@/data/starting-equipment'
import type { Item } from '@/types/data'

// ---------- (a)/(b) seçim kutusu ----------
export default function ChoiceBox({ scope, choice, onDetail }: { scope: 'class' | 'bg'; choice: EquipChoice; onDetail: (i: Item) => void }) {
  const { character, updateFn } = useChar()
  const key = choiceKey(scope, choice.id)
  const selectedId = character.equipChoices[key]
  const selected = choice.options.find((o) => o.id === selectedId)
  const pickKey = selected?.pick ? optionPickKey(scope, choice.id, selected.id) : ''
  const picked = pickKey ? (character.equipPicks[pickKey] ?? []) : []
  const [pickerOpen, setPickerOpen] = useState(false)

  const needsPick = Boolean(selected?.pick)
  const done = Boolean(selected) && (!needsPick || picked.length >= (selected!.pick!.count ?? 1))

  function choose(opt: EquipOption) {
    updateFn((c) => {
      c.equipChoices[key] = opt.id
      // başka seçeneğe ait pick'leri temizle
      for (const o of choice.options) {
        if (o.id !== opt.id) delete c.equipPicks[optionPickKey(scope, choice.id, o.id)]
      }
    })
    if (opt.pick) setPickerOpen(true)
  }

  return (
    <div className="panel" style={{ padding: 14, borderColor: done ? 'var(--line)' : 'var(--maroon-bright)' }}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>{choice.label}</label>
        <span className={done ? 'badge badge-new' : 'badge'}>{done ? 'tamam ✓' : 'seç'}</span>
      </div>
      {choice.help && <p className="hint" style={{ marginTop: 0 }}>{choice.help}</p>}

      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {choice.options.map((opt) => (
          <button key={opt.id} type="button" className={`btn ${selectedId === opt.id ? 'btn-primary' : ''}`} onClick={() => choose(opt)}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* seçilen seçenek sabit eşya veriyorsa göster */}
      {selected?.grants && selected.grants.length > 0 && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {selected.grants.map((g) => {
            const item = itemById(g.itemId)
            if (!item) return null
            return (
              <button key={g.itemId} type="button" className="badge" style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => onDetail(item)}>
                {item.name}
                {g.qty && g.qty > 1 ? ` ×${g.qty}` : ''} ⓘ
              </button>
            )
          })}
        </div>
      )}

      {/* seçenek "listeden seç" gerektiriyorsa */}
      {selected?.pick && (
        <div style={{ marginTop: 10 }}>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className={`btn ${picked.length ? '' : 'btn-primary'}`} onClick={() => setPickerOpen(true)}>
              {picked.length ? 'Seçimi değiştir' : `${selected.pick.label} →`}
            </button>
            {picked.map((id, i) => {
              const item = itemById(id)
              if (!item) return null
              return (
                <button key={`${id}-${i}`} type="button" className="badge badge-new" style={{ cursor: 'pointer' }} onClick={() => onDetail(item)}>
                  {item.name} ⓘ
                </button>
              )
            })}
          </div>
          <ItemPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            pick={selected.pick}
            value={picked}
            onChange={(ids) => updateFn((c) => { c.equipPicks[pickKey] = ids })}
          />
        </div>
      )}
    </div>
  )
}

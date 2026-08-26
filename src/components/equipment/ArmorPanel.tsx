import { itemById } from '@/data'
import { buildInventory } from '@/lib/inventory'
import { Tip } from '@/components/ui'
import { armorClass } from '@/lib/rules'
import { useChar } from '@/components/wizard/useChar'
import type { Item } from '@/types/data'
import type { Character } from '@/types/character'

// ---------- zırh & AC ----------
export default function ArmorPanel({ onDetail }: { onDetail: (i: Item) => void }) {
  const { character, updateFn } = useChar()
  const owned = ownedArmor(character)
  const shieldOwned = buildInventory(character).some((e) => e.itemId === 'shield')
  const ac = armorClass(character)

  return (
    <div>
      <div className="row" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Zırh & AC</h3>
        <Tip label="AC">
          Armor Class — sana isabet etmenin zorluğu. Giydiğin zırha göre otomatik hesaplanır; elle girmene gerek yok.
        </Tip>
      </div>

      {owned.length === 0 ? (
        <p className="muted" style={{ marginTop: 6 }}>
          Zırhın yok — AC'in 10 + Çeviklik modifieri.
        </p>
      ) : (
        <>
          <p className="hint" style={{ marginTop: 6 }}>Hangi zırhı giyiyorsun?</p>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className={`btn ${character.equippedArmorId === 'none' ? 'btn-primary' : ''}`}
              onClick={() => updateFn((c) => { c.equippedArmorId = 'none' })}
            >
              Zırhsız
            </button>
            {owned.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`btn ${character.equippedArmorId === item.id ? 'btn-primary' : ''}`}
                onClick={() => updateFn((c) => { c.equippedArmorId = item.id })}
              >
                {item.name}
              </button>
            ))}
          </div>
        </>
      )}

      {shieldOwned && (
        <label className="row" style={{ gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={character.equippedShield}
            onChange={(e) => updateFn((c) => { c.equippedShield = e.target.checked; c.shieldOff = !e.target.checked })}
            style={{ width: 'auto' }}
          />
          Kalkanı kuşan (+2 AC)
        </label>
      )}

      <div className="panel" style={{ padding: 14, marginTop: 12, background: 'var(--panel-solid)' }}>
        <div className="spread">
          <span style={{ color: 'var(--ink-dim)' }}>Hesaplanan Armor Class</span>
          <span className="gold-amount">{ac}</span>
        </div>
        {character.equippedArmorId && character.equippedArmorId !== 'none' && (
          <button type="button" className="term" style={{ marginTop: 8 }} onClick={() => onDetail(itemById(character.equippedArmorId)!)}>
            {itemById(character.equippedArmorId)?.name} künyesini gör ⓘ
          </button>
        )}
      </div>
    </div>
  )
}

function ownedArmor(c: Character): Item[] {
  const ids = new Set(buildInventory(c).map((e) => e.itemId))
  return [...ids]
    .map((id) => itemById(id))
    .filter((i): i is Item => i?.category === 'armor')
    .sort((a, b) => (b.acBase ?? 0) - (a.acBase ?? 0))
}

// Altınla başlama modunun mağazası. Tüm PHB kataloğu; altın yetmezse kart kilitli.
import { useMemo, useState } from 'react'
import { items as ALL_ITEMS, itemById, classById } from '@/data'
import { useChar } from '@/components/wizard/useChar'
import { remainingGoldGp, startingGoldGp, purchasesTotalGp } from '@/lib/inventory'
import ItemCard from './ItemCard'
import ItemDetailModal from './ItemDetailModal'
import { gpLabel } from './format'
import type { Item } from '@/types/data'

type TabKey = 'pack' | 'weapon' | 'armor' | 'tool' | 'gear' | 'focus'

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: 'pack', label: 'Hazır Paketler', hint: 'Tek tek almaktan ucuz. Yeni başlıyorsan buradan başla.' },
  { key: 'weapon', label: 'Silahlar', hint: 'Sınıfının yeterliliği olmayan silahla saldırırsan proficiency bonusunu ekleyemezsin.' },
  { key: 'armor', label: 'Zırh & Kalkan', hint: 'Zırhı seçince AC otomatik hesaplanır.' },
  { key: 'tool', label: 'Aletler', hint: 'Alet satın almak yeterlilik vermez — ama alet olmadan yeterliliği kullanamazsın.' },
  { key: 'gear', label: 'Genel Eşya', hint: 'Meşale, halat, erzak… Macerada hayatta kalma malzemeleri.' },
  { key: 'focus', label: 'Büyü Odakları & Mühimmat', hint: 'Büyücüler için odak, yay/arbalet için ok.' },
]

function inTab(item: Item, tab: TabKey): boolean {
  if (tab === 'focus') return item.category === 'focus' || item.category === 'ammunition' || item.id === 'component-pouch' || item.id === 'spellbook'
  if (tab === 'armor') return item.category === 'armor' || item.category === 'shield'
  if (tab === 'gear') return item.category === 'gear' && item.id !== 'component-pouch' && item.id !== 'spellbook'
  return item.category === tab
}

/** Sınıfın yeterliliği var mı — bilgi rozeti için (engellemez). */
function proficiencyNote(item: Item, classId: string): string | null {
  const klass = classById(classId)
  if (!klass) return null
  if (item.category === 'weapon') {
    const text = klass.weapons.toLowerCase()
    if (item.weaponClass === 'martial' && !/savaş|martial/.test(text)) {
      // sınıf tüm savaş silahlarını kullanamıyor; adı özel olarak sayılmış olabilir
      if (!text.includes(item.name.toLowerCase())) return 'Sınıfının bu silahta yeterliliği olmayabilir'
    }
    return null
  }
  if (item.category === 'armor') {
    const text = klass.armor.toLowerCase()
    if (/^yok/.test(text)) return 'Sınıfın zırh kullanamaz (büyü yapamazsın)'
    if (item.armorType === 'heavy' && !/ağır|heavy|tüm zırh/.test(text)) return 'Ağır zırh yeterliliğin olmayabilir'
    if (item.armorType === 'medium' && !/orta|medium|tüm zırh/.test(text)) return 'Orta zırh yeterliliğin olmayabilir'
  }
  if (item.category === 'shield' && !/kalkan|shield|tüm zırh/.test(klass.armor.toLowerCase())) return 'Kalkan yeterliliğin olmayabilir'
  return null
}

export default function Shop() {
  const { character, updateFn } = useChar()
  const [tab, setTab] = useState<TabKey>('pack')
  const [detail, setDetail] = useState<Item | null>(null)
  const [query, setQuery] = useState('')

  const remaining = remainingGoldGp(character)
  const purchased = new Map(character.purchases.map((p) => [p.itemId, p.qty]))

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_ITEMS.filter((i) => i.costGp != null && (q ? i.name.toLowerCase().includes(q) : inTab(i, tab))).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [tab, query])

  function buy(item: Item, delta: number) {
    updateFn((c) => {
      const found = c.purchases.find((p) => p.itemId === item.id)
      if (found) {
        found.qty += delta
        if (found.qty <= 0) c.purchases = c.purchases.filter((p) => p.itemId !== item.id)
      } else if (delta > 0) c.purchases.push({ itemId: item.id, qty: delta })
    })
  }

  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div className="stack">
      <div className="gold-bar">
        <div>
          <div className="hint">Kalan altın</div>
          <div className="gold-amount">{gpLabel(remaining)}</div>
        </div>
        <div className="hint" style={{ textAlign: 'right' }}>
          Başlangıç: {gpLabel(startingGoldGp(character))}
          <br />
          Harcanan: {gpLabel(purchasesTotalGp(character))}
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`tab${tab === t.key && !query ? ' active' : ''}`} onClick={() => { setTab(t.key); setQuery('') }}>
            {t.label}
          </button>
        ))}
      </div>
      {!query && <p className="hint" style={{ margin: 0 }}>{activeTab.hint}</p>}

      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tüm katalogda ara… (ör. meşale, uzun kılıç)" />

      <div className="item-grid">
        {list.map((item) => {
          const qty = purchased.get(item.id) ?? 0
          const affordable = (item.costGp ?? 0) <= remaining
          const note = proficiencyNote(item, character.classId)
          return (
            <div key={item.id} className="stack" style={{ gap: 6 }}>
              <ItemCard
                item={item}
                selected={qty > 0}
                badge={qty > 0 ? `×${qty}` : undefined}
                onDetail={() => setDetail(item)}
              />
              {note && <span className="hint" style={{ color: 'var(--maroon-bright)' }}>⚠ {note}</span>}
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className="btn qty-btn" onClick={() => buy(item, -1)} disabled={qty === 0} aria-label="Azalt">
                  −
                </button>
                <span style={{ minWidth: 28, textAlign: 'center', color: 'var(--ink-dim)' }}>{qty}</span>
                <button
                  type="button"
                  className="btn qty-btn"
                  onClick={() => buy(item, 1)}
                  disabled={!affordable}
                  aria-label="Artır"
                  title={affordable ? undefined : 'Altının yetmiyor'}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {list.length === 0 && <p className="hint">Eşleşen eşya yok.</p>}

      <ItemDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

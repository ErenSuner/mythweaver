// Tek eşya kartı — seçim ve mağazada ortak kullanılır.
import type { Item } from '@/types/data'
import { costLabel, quickTags, weightLabel } from './format'

export interface ItemCardProps {
  item: Item
  selected?: boolean
  disabled?: boolean
  /** sağ altta gösterilecek ek bilgi (ör. "×2") */
  badge?: string
  showPrice?: boolean
  onSelect?: () => void
  onDetail?: () => void
}

export default function ItemCard({ item, selected, disabled, badge, showPrice = true, onSelect, onDetail }: ItemCardProps) {
  const tags = quickTags(item).slice(0, 4)
  return (
    <div className={`item-card${selected ? ' selected' : ''}`} style={disabled ? { opacity: 0.35 } : undefined}>
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled || !onSelect}
        style={{ all: 'unset', cursor: disabled || !onSelect ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <span className="spread">
          <span className="item-name">{item.name}</span>
          {badge && <span className="badge badge-new">{badge}</span>}
        </span>
        {tags.length > 0 && (
          <span className="item-meta">
            {tags.map((t) => (
              <span key={t} className="item-tag">
                {t}
              </span>
            ))}
          </span>
        )}
      </button>
      <div className="spread">
        {showPrice ? (
          <span className="item-price">
            {costLabel(item)} · {weightLabel(item)}
          </span>
        ) : (
          <span />
        )}
        {onDetail && (
          <button type="button" className="badge" style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={onDetail}>
            Detay ⓘ
          </button>
        )}
      </div>
    </div>
  )
}

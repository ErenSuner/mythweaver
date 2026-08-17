// Tek eşya kartı — seçim ve mağazada ortak kullanılır.
// onSelect verildiğinde tüm kart tek <button> (tek tıkla seçim). onSelect yoksa
// (Shop) kart tıklanamaz <div> kalır; alım ayrı +/− ile yapılır.
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
  const selectable = Boolean(onSelect)
  const Root: any = selectable ? 'button' : 'div'
  return (
    <Root
      className={`item-card${selected ? ' selected' : ''}`}
      {...(selectable ? { type: 'button', disabled, onClick: onSelect } : {})}
      style={disabled && !selectable ? { opacity: 0.35 } : undefined}
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
      <span className="spread" style={{ marginTop: 'auto' }}>
        {showPrice ? (
          <span className="item-price">
            {costLabel(item)} · {weightLabel(item)}
          </span>
        ) : (
          <span />
        )}
        {onDetail && (
          <span
            role="button"
            tabIndex={0}
            className="badge"
            style={{ cursor: 'pointer', borderStyle: 'dashed' }}
            onClick={(e) => {
              e.stopPropagation()
              onDetail()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onDetail()
              }
            }}
          >
            Detay ⓘ
          </span>
        )}
      </span>
    </Root>
  )
}

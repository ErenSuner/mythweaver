// Bir eşyanın tam künyesi: fiyat, ağırlık, kural metni, silah özellikleri,
// paket içeriği ve (alet ise) Xanathar alet rehberi.
import { itemById, toolGuideForItem, itemGroupDescriptions } from '@/data'
import { Modal } from '@/components/Modal'
import { armorLabel, categoryLabel, costLabel, damageLabel, propertyHelp, weightLabel } from './format'
import type { Item } from '@/types/data'

export default function ItemDetailModal({ item, onClose }: { item: Item | null; onClose: () => void }) {
  if (!item) return null
  const guide = toolGuideForItem(item.id)
  const groupDesc = item.group ? itemGroupDescriptions[item.group.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')] : undefined

  return (
    <Modal open onClose={onClose} wide title={item.name} subtitle={categoryLabel(item)}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {damageLabel(item) && <span className="badge badge-new">Hasar: {damageLabel(item)}</span>}
        <span className="badge">Fiyat: {costLabel(item)}</span>
        <span className="badge">Ağırlık: {weightLabel(item)}</span>
        {armorLabel(item) && <span className="badge">{armorLabel(item)}</span>}
        {item.strengthReq && <span className="badge">Güç {item.strengthReq} gerekir (yoksa hız −10 ft)</span>}
        {item.stealthDisadvantage && <span className="badge">Gizlenmede dezavantaj</span>}
      </div>

      {(item.description || groupDesc) && <p style={{ color: 'var(--ink-dim)', marginTop: 0 }}>{item.description || groupDesc}</p>}

      {item.properties && item.properties.length > 0 && (
        <>
          <div className="divider" />
          <label>Silah Özellikleri</label>
          <ul style={{ color: 'var(--ink-dim)', fontSize: 14, paddingLeft: 18, margin: '6px 0 0' }}>
            {item.properties.map((p) => (
              <li key={p}>
                <b style={{ color: 'var(--ink)' }}>{p}</b>
                {propertyHelp(p) ? ` — ${propertyHelp(p)}` : ''}
              </li>
            ))}
          </ul>
        </>
      )}

      {item.contents && (
        <>
          <div className="divider" />
          <label>Paketin içinde ne var?</label>
          <ul style={{ color: 'var(--ink-dim)', fontSize: 14, paddingLeft: 18, margin: '6px 0 0' }}>
            {item.contents.map((c) => {
              const sub = itemById(c.itemId)
              return (
                <li key={c.itemId}>
                  {sub?.name ?? c.itemId}
                  {c.qty > 1 ? ` ×${c.qty}` : ''}
                  {c.note ? ` (${c.note})` : ''}
                </li>
              )
            })}
          </ul>
          <p className="hint" style={{ marginTop: 8 }}>
            Paketi tek tek almak yerine hazır alman genelde daha ucuzdur.
          </p>
        </>
      )}

      {guide && (
        <>
          <div className="divider" />
          <h3 style={{ fontSize: 17 }}>Bu alet ne işe yarar?</h3>
          {guide.intro && <p style={{ color: 'var(--ink-dim)', marginTop: 0 }}>{guide.intro}</p>}

          {guide.components && (
            <div style={{ marginTop: 8 }}>
              <label>İçindekiler</label>
              <div className="muted">{guide.components}</div>
            </div>
          )}

          {guide.skills.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <label>Hangi becerilerle birlikte işe yarar</label>
              <ul style={{ color: 'var(--ink-dim)', fontSize: 14, paddingLeft: 18, margin: '6px 0 0' }}>
                {guide.skills.map((s) => (
                  <li key={s.skill}>
                    <b style={{ color: 'var(--gold-bright)' }}>{s.skill}</b> — {s.text}
                  </li>
                ))}
              </ul>
              <p className="hint" style={{ marginTop: 6 }}>
                Hem alette hem beceride yeterliysen, DM genelde bu kontrollerde sana <b>advantage</b> (iki zar at, iyisini
                al) verir.
              </p>
            </div>
          )}

          {guide.special.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <label>Özel kullanımlar</label>
              <ul style={{ color: 'var(--ink-dim)', fontSize: 14, paddingLeft: 18, margin: '6px 0 0' }}>
                {guide.special.map((s) => (
                  <li key={s.name}>
                    <b style={{ color: 'var(--ink)' }}>{s.name}</b> — {s.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {guide.sampleDCs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <label>Örnek zorluk dereceleri (DC)</label>
              <div className="dice-table" style={{ marginTop: 6 }}>
                {guide.sampleDCs.map((d) => (
                  <div key={d.activity} className="dice-row" style={{ cursor: 'default' }}>
                    <span className="dice-roll">DC {d.dc}</span>
                    <span>{d.activity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

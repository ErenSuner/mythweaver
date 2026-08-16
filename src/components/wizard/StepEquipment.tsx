// Ekipman adımı — kullanıcı hiçbir şey yazmaz. İki mod var:
//  1) Hazır paket: sınıfın PHB başlangıç donanımı, seçimler gerçek eşya listesinden.
//  2) Altın: sınıf serveti zarı atılır, tam katalogdan alışveriş yapılır.
// Geçmişin (background) donanımı + altını her iki modda otomatik gelir.
import { useState } from 'react'
import { classById, backgroundById, itemById, startingWealthFor } from '@/data'
import { startingEquipmentFor, type EquipChoice, type EquipOption, type EquipPick } from '@/data/starting-equipment'
import { backgroundEquipmentFor } from '@/data/background-equipment'
import {
  buildInventory,
  choiceKey,
  optionPickKey,
  fixedPickKey,
  inventoryWeight,
  rollStartingWealth,
  startingGoldGp,
  remainingGoldGp,
} from '@/lib/inventory'
import { Info, Tip } from '@/components/ui'
import { Modal, useConfirm } from '@/components/Modal'
import ItemPickerModal from '@/components/equipment/ItemPickerModal'
import ItemDetailModal from '@/components/equipment/ItemDetailModal'
import Shop from '@/components/equipment/Shop'
import { gpLabel } from '@/components/equipment/format'
import { armorClass } from '@/lib/rules'
import { useChar } from './useChar'
import type { Item } from '@/types/data'
import type { Character } from '@/types/character'

export default function StepEquipment() {
  const { character, update, updateFn } = useChar()
  const klass = classById(character.classId)
  const bg = backgroundById(character.backgroundId)
  const clsEq = startingEquipmentFor(character.classId)
  const bgEq = backgroundEquipmentFor(character.backgroundId)
  const wealth = startingWealthFor(character.classId)
  const confirm = useConfirm()
  const [detail, setDetail] = useState<Item | null>(null)
  const [goldOpen, setGoldOpen] = useState(false)

  async function setMode(mode: 'package' | 'gold') {
    if (mode === character.startingKit.mode) return
    if (mode === 'gold' && Object.keys(character.equipChoices).some((k) => k.startsWith('class:'))) {
      const ok = await confirm({
        title: 'Altın moduna geç',
        message: 'Sınıf ekipman seçimlerin silinecek ve yerine altın alacaksın. Devam edilsin mi?',
        confirmLabel: 'Evet, altınla başla',
      })
      if (!ok) return
    }
    if (mode === 'package' && character.purchases.length > 0) {
      const ok = await confirm({
        title: 'Hazır pakete dön',
        message: 'Mağazadan aldığın her şey iade edilecek. Devam edilsin mi?',
        confirmLabel: 'Evet, pakete dön',
      })
      if (!ok) return
    }
    updateFn((c) => {
      c.startingKit = { mode, goldRolled: null, goldRollDice: null }
      c.purchases = []
      for (const k of Object.keys(c.equipChoices)) if (k.startsWith('class:')) delete c.equipChoices[k]
      for (const k of Object.keys(c.equipPicks)) if (k.startsWith('class:')) delete c.equipPicks[k]
    })
  }

  return (
    <div className="stack">
      <Info>
        D&amp;D 5e'de başlangıç donanımın için <b>iki yol</b> var: sınıfının hazır paketini almak, ya da sınıfına düşen
        altını atıp her şeyi kendin satın almak. Geçmişinin (background) eşyaları ve kesesindeki altın her iki durumda da
        sana gelir.
      </Info>

      {/* --- mod seçimi --- */}
      <div className="choice-grid">
        <button
          type="button"
          className={`choice-card ${character.startingKit.mode === 'package' ? 'selected' : ''}`}
          onClick={() => setMode('package')}
        >
          <h3>Hazır paketle başla</h3>
          <span className="tr">Önerilen — yeni oyuncular için</span>
          <p>
            Sınıfının dengeli başlangıç donanımını alırsın. Yalnızca birkaç seçim yaparsın; gerisi otomatik gelir.
          </p>
        </button>
        <button
          type="button"
          className={`choice-card ${character.startingKit.mode === 'gold' ? 'selected' : ''}`}
          onClick={() => setMode('gold')}
        >
          <h3>Altın atıp kendin al</h3>
          <span className="tr">İleri seviye — {wealth?.text ?? 'sınıfa göre'}</span>
          <p>
            {klass?.name ?? 'Sınıfın'} için <b>{wealth?.text ?? '—'}</b> atarsın ve tüm PHB kataloğundan alışveriş
            yaparsın. Daha esnek ama daha çok karar demek.
          </p>
        </button>
      </div>

      <div className="divider" />

      {/* --- 1) HAZIR PAKET MODU --- */}
      {character.startingKit.mode === 'package' && clsEq && (
        <div className="stack">
          <div className="spread">
            <h3 style={{ fontSize: 18, margin: 0 }}>Sınıf Donanımı — {klass?.name}</h3>
            <span className="badge">{clsEq.choices.length} seçim</span>
          </div>

          {clsEq.choices.map((choice) => (
            <ChoiceBox key={choice.id} scope="class" choice={choice} onDetail={setDetail} />
          ))}

          {(clsEq.fixedPicks ?? []).map((p) => (
            <FixedPickBox key={p.id} scope="class" pick={p} />
          ))}

          {clsEq.fixed.length > 0 && (
            <div className="panel" style={{ padding: 12 }}>
              <span className="badge">otomatik gelir</span>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {clsEq.fixed.map((g) => {
                  const item = itemById(g.itemId)
                  if (!item) return null
                  return (
                    <button key={g.itemId} type="button" className="badge" style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => setDetail(item)}>
                      {item.name}
                      {g.qty && g.qty > 1 ? ` ×${g.qty}` : ''} ⓘ
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- 2) ALTIN MODU --- */}
      {character.startingKit.mode === 'gold' && (
        <div className="stack">
          <div className="spread">
            <h3 style={{ fontSize: 18, margin: 0 }}>Başlangıç Altının</h3>
            {character.startingKit.goldRolled != null && (
              <span className="badge badge-new">
                {character.startingKit.goldRolled} gp atıldı
                {character.startingKit.goldRollDice ? ` (${character.startingKit.goldRollDice.join(' + ')})` : ''}
              </span>
            )}
          </div>

          {character.startingKit.goldRolled == null ? (
            <div className="panel" style={{ padding: 14, borderColor: 'var(--maroon-bright)' }}>
              <p style={{ marginTop: 0, color: 'var(--ink-dim)' }}>
                {klass?.name} için başlangıç serveti: <b>{wealth?.text}</b>. Zarı at, sonra alışverişe başla.
              </p>
              <button type="button" className="btn btn-primary" onClick={() => setGoldOpen(true)}>
                🎲 Başlangıç altınını at
              </button>
            </div>
          ) : (
            <Shop />
          )}

          <GoldRollModal
            open={goldOpen}
            onClose={() => setGoldOpen(false)}
            classId={character.classId}
            onAccept={(total, dice) =>
              updateFn((c) => {
                c.startingKit.goldRolled = total
                c.startingKit.goldRollDice = dice
              })
            }
          />
        </div>
      )}

      {/* --- geçmiş donanımı (her iki modda) --- */}
      {bgEq && (
        <>
          <div className="divider" />
          <div className="spread">
            <h3 style={{ fontSize: 18, margin: 0 }}>Geçmiş Donanımı — {bg?.name}</h3>
            <span className="badge">Kesende {bgEq.gold} gp</span>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            Bu eşyalar ve altın geçmişinden otomatik gelir; elle yazman gereken hiçbir şey yok.
          </p>

          {(bgEq.choices ?? []).map((choice) => (
            <ChoiceBox key={choice.id} scope="bg" choice={choice} onDetail={setDetail} />
          ))}
          {(bgEq.fixedPicks ?? []).map((p) => (
            <FixedPickBox key={p.id} scope="bg" pick={p} />
          ))}

          <div className="panel" style={{ padding: 12 }}>
            <span className="badge">otomatik gelir</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {bgEq.fixed.map((g) => {
                const item = itemById(g.itemId)
                if (!item) return null
                return (
                  <button key={g.itemId} type="button" className="badge" style={{ cursor: 'pointer', borderStyle: 'dashed' }} onClick={() => setDetail(item)}>
                    {item.name}
                    {g.qty && g.qty > 1 ? ` ×${g.qty}` : ''} ⓘ
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}

      <div className="divider" />

      <InventoryPanel onDetail={setDetail} />

      <div className="divider" />

      <ArmorPanel onDetail={setDetail} />

      <ItemDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

// ---------- (a)/(b) seçim kutusu ----------
function ChoiceBox({ scope, choice, onDetail }: { scope: 'class' | 'bg'; choice: EquipChoice; onDetail: (i: Item) => void }) {
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

// ---------- koşulsuz ama listeden seçilecek eşya ----------
function FixedPickBox({ scope, pick }: { scope: 'class' | 'bg'; pick: EquipPick & { id: string } }) {
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

// ---------- altın zarı ----------
function GoldRollModal({
  open,
  onClose,
  classId,
  onAccept,
}: {
  open: boolean
  onClose: () => void
  classId: string
  onAccept: (total: number, dice: number[]) => void
}) {
  const wealth = startingWealthFor(classId)
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<{ total: number; dice: number[] } | null>(null)

  function roll() {
    if (rolling) return
    setRolling(true)
    setResult(null)
    window.setTimeout(() => {
      setResult(rollStartingWealth(classId))
      setRolling(false)
    }, 700)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Başlangıç altınını at"
      subtitle={`${classById(classId)?.name ?? ''} — ${wealth?.text ?? ''}`}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="btn" onClick={roll} disabled={rolling}>
            {result ? '🎲 Tekrar at' : '🎲 Zar at'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!result}
            onClick={() => {
              if (!result) return
              onAccept(result.total, result.dice)
              onClose()
            }}
          >
            Kabul et
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, color: 'var(--ink-dim)' }}>
        Sınıfın başlangıç serveti <b>{wealth?.text}</b>. Zarları atıp toplamı alacaksın; sonra bu altınla alışveriş
        yapacaksın. Zar sonucundan memnun değilsen tekrar atabilirsin — ama masanda DM tek atışa izin veriyorsa ilk
        sonucu kullan.
      </p>
      <div className="dice-stage">
        <div className={`die${rolling ? ' die-rolling' : ''}`}>{result ? result.dice[0] : '?'}</div>
        {result && (
          <div style={{ textAlign: 'center' }}>
            <div className="hint">
              {result.dice.join(' + ')} = {result.dice.reduce((a, b) => a + b, 0)}
              {wealth && wealth.dice.multiplier > 1 ? ` × ${wealth.dice.multiplier}` : ''}
            </div>
            <div className="gold-amount">{result.total} gp</div>
          </div>
        )}
        {!result && !rolling && <div className="hint">Zar henüz atılmadı</div>}
      </div>
    </Modal>
  )
}

// ---------- envanter özeti ----------
function InventoryPanel({ onDetail }: { onDetail: (i: Item) => void }) {
  const { character } = useChar()
  const [expandPack, setExpandPack] = useState(false)
  const list = buildInventory(character)
  const weight = inventoryWeight(character)

  const SOURCE_TR: Record<string, string> = { class: 'Sınıf', background: 'Geçmiş', purchase: 'Satın alınan', pack: 'Paket içi' }

  return (
    <div>
      <div className="spread">
        <h3 style={{ fontSize: 18, margin: 0 }}>Envanterin</h3>
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
                      <div className="muted" style={{ fontSize: 14 }}>
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

// ---------- zırh & AC ----------
function ArmorPanel({ onDetail }: { onDetail: (i: Item) => void }) {
  const { character, updateFn } = useChar()
  const owned = ownedArmor(character)
  const shieldOwned = buildInventory(character).some((e) => e.itemId === 'shield')
  const ac = armorClass(character)

  return (
    <div>
      <div className="row" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 18, margin: 0 }}>Zırh & AC</h3>
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
              className={`btn ${!character.equippedArmorId ? 'btn-primary' : ''}`}
              onClick={() => updateFn((c) => { c.equippedArmorId = '' })}
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
            onChange={(e) => updateFn((c) => { c.equippedShield = e.target.checked })}
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
        {character.equippedArmorId && (
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

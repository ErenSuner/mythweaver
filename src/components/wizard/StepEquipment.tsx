// Ekipman adımı — kullanıcı hiçbir şey yazmaz. İki mod var:
//  1) Hazır paket: sınıfın PHB başlangıç donanımı, seçimler gerçek eşya listesinden.
//  2) Altın: sınıf serveti zarı atılır, tam katalogdan alışveriş yapılır.
// Geçmişin (background) donanımı + altını her iki modda otomatik gelir.
import { useState } from 'react'
import { classById, backgroundById, itemById, startingWealthFor } from '@/data'
import { startingEquipmentFor, type EquipChoice, type EquipOption, type EquipPick } from '@/data/starting-equipment'
import { backgroundEquipmentFor } from '@/data/background-equipment'
import { Info } from '@/components/ui'
import { useConfirm } from '@/components/Modal'
import ItemDetailModal from '@/components/equipment/ItemDetailModal'
import Shop from '@/components/equipment/Shop'
import ChoiceBox from '@/components/equipment/ChoiceBox'
import FixedPickBox from '@/components/equipment/FixedPickBox'
import GoldRollModal from '@/components/equipment/GoldRollModal'
import InventoryPanel from '@/components/equipment/InventoryPanel'
import ArmorPanel from '@/components/equipment/ArmorPanel'
import { inventoryWeight } from '@/lib/inventory'
import { armorClass } from '@/lib/rules'
import { useChar } from './useChar'
import type { Item } from '@/types/data'

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
  // Kademeli açılım: mod seçilince kartlar şeride iner, sonuç panelleri katlanır.
  const [modeOpen, setModeOpen] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const [bgAutoOpen, setBgAutoOpen] = useState(false)

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
      c.startingKit = { ...c.startingKit, mode, goldRolled: null, goldRollDice: null }
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

      {/* --- mod seçimi ---
          Seçildikten sonra iki büyük kart yerini tek satırlık şeride bırakır;
          "Değiştir" ile geri açılır. Kartların kalıcı durması adımın en çok
          yer kaplayan kısmıydı. */}
      {!modeOpen && (
        <div className="spread panel" style={{ padding: '12px 14px', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span className="eyebrow">Başlangıç yöntemi</span>
            <b>{character.startingKit.mode === 'package' ? 'Hazır paket' : 'Altın atıp kendin al'}</b>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setModeOpen(true)}>
            Değiştir
          </button>
        </div>
      )}

      {modeOpen && (
      <div className="choice-grid">
        <button
          type="button"
          className={`choice-card ${character.startingKit.mode === 'package' ? 'selected' : ''}`}
          onClick={() => {
            setMode('package')
            setModeOpen(false)
          }}
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
          onClick={() => {
            setMode('gold')
            setModeOpen(false)
          }}
        >
          <h3>Altın atıp kendin al</h3>
          <span className="tr">İleri seviye — {wealth?.text ?? 'sınıfa göre'}</span>
          <p>
            {klass?.name ?? 'Sınıfın'} için <b>{wealth?.text ?? '—'}</b> atarsın ve tüm PHB kataloğundan alışveriş
            yaparsın. Daha esnek ama daha çok karar demek.
          </p>
        </button>
      </div>
      )}

      <div className="divider" />

      {/* --- 1) HAZIR PAKET MODU --- */}
      {character.startingKit.mode === 'package' && clsEq && (
        <div className="stack">
          <div className="spread">
            <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Sınıf Donanımı — {klass?.name}</h3>
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
            <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Başlangıç Altının</h3>
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

      {/* --- yüksek seviye başlangıcı: DM'in verdiği ek altın ---
          Miktar SRD'de yok, masaya göre değişir; hesaplamak yerine soruyoruz.
          Paket modunda da geçerli: DM ek teçhizat parası vermiş olabilir. */}
      {(character.startingLevel ?? 1) > 1 && (
        <div className="panel stack" style={{ padding: 14 }}>
          <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Ek Başlangıç Altını</h3>
            <span className="badge">seviye {character.startingLevel}</span>
          </div>
          <p className="hint" style={{ margin: 0 }}>
            1. seviyeden yüksek başlayan karakterlere DM genelde fazladan teçhizat ya da altın verir. Miktarı masana
            göre değişir — DM&apos;in söylediği rakamı buraya gir, alışverişte kullanılabilir olsun. Bilmiyorsan boş
            bırak, sonradan da eklenebilir.
          </p>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              aria-label="Ek başlangıç altını (gp)"
              value={character.startingKit.bonusGoldGp ?? 0}
              onChange={(e) => {
                const n = Math.max(0, Math.floor(Number(e.target.value) || 0))
                updateFn((c) => {
                  c.startingKit.bonusGoldGp = n
                })
              }}
              style={{ maxWidth: 160 }}
            />
            <span className="muted">gp</span>
          </div>
        </div>
      )}

      {/* --- geçmiş donanımı (her iki modda) --- */}
      {bgEq && (
        <>
          <div className="divider" />
          <div className="spread">
            <h3 style={{ fontSize: 'var(--fs-md)', margin: 0 }}>Geçmiş Donanımı — {bg?.name}</h3>
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

          {/* Otomatik gelen eşyalar karar gerektirmiyor — katlanmış duruyor. */}
          <div className="panel" style={{ padding: 12 }}>
            <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="badge">otomatik gelir · {bgEq.fixed.length} eşya</span>
              <button type="button" className="btn btn-ghost" onClick={() => setBgAutoOpen((v) => !v)}>
                {bgAutoOpen ? 'Gizle' : 'Göster'}
              </button>
            </div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8, display: bgAutoOpen ? 'flex' : 'none' }}>
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

      {/* Envanter ve zırh karar değil SONUÇ: kapalıyken bile özet satırı
          görünür, ayrıntı istendiğinde açılır. */}
      <div className="panel" style={{ padding: '12px 14px' }}>
        <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span className="eyebrow">Sonuç</span>
            <b>
              Ağırlık {inventoryWeight(character)} lb · Zırh Sınıfı {armorClass(character)}
            </b>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setBagOpen((v) => !v)}>
            {bagOpen ? 'Gizle' : 'Envanter & zırhı göster'}
          </button>
        </div>
        {bagOpen && (
          <div className="stack" style={{ marginTop: 14 }}>
            <InventoryPanel onDetail={setDetail} />
            <div className="divider" />
            <ArmorPanel onDetail={setDetail} />
          </div>
        )}
      </div>

      <ItemDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

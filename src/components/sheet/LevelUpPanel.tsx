import { useMemo, useState } from 'react'
import { classById, config, items, spellsForClass } from '@/data'
import { useCharacterStore } from '@/state/characterStore'
import { applyLevelUp, previewLevelUp, type LevelUpChoices } from '@/lib/levelup'
import { FIGHTING_STYLES, LANGUAGES, type ChoiceSlot } from '@/data/grants'
import { FEATS, featById, type Feat } from '@/data/feats'
import { isSkillProficient, finalAbilityScores } from '@/lib/rules'
import { Info } from '@/components/ui'
import { Modal } from '@/components/Modal'
import RuleText from '@/components/RuleText'
import { ABILITIES, type Ability, type Subclass } from '@/types/data'
import type { Character, FeatSelection } from '@/types/character'
import { characterLanguages } from '@/lib/derive'

const SKILL_KEYS = Object.keys(config.skills)
const SPELL_FEAT_CLASSES = ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']
const WEAPON_ITEMS = items.filter((i) => i.category === 'weapon')
const TOOL_ITEMS = items.filter((i) => i.category === 'tool')
// Veri katmanında ritual bayrağı yok — metinden en-iyi-çaba tespit.
const looksRitual = (s: { castingTime: string; description: string }) => /ritual|ritüel/i.test(`${s.castingTime} ${s.description}`)

/**
 * Alt sınıf özeti. Rehberde iki biçim var:
 *  - özellikler metnin içinde: "**Arcane Ward — 2.:** …"  (wizard okulları, cleric domain'leri)
 *  - özellikler ayrı seviye başlıklarında: subclass.levelFeatures (barbarian, fighter…)
 * İkisini de aynı listeye toplar.
 */
function summarizeSubclass(sub: Subclass): { intro: string; features: { name: string; level: number }[] } {
  const introEnd = sub.description.indexOf('**')
  const intro = (introEnd > 0 ? sub.description.slice(0, introEnd) : sub.description).trim()
  const features: { name: string; level: number }[] = []
  const re = /\*\*(.+?)\s*—\s*(\d+)\.?:?\*\*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(sub.description)) !== null) features.push({ name: m[1].trim(), level: parseInt(m[2], 10) })
  for (const [lvl, list] of Object.entries(sub.levelFeatures ?? {})) {
    for (const f of list) features.push({ name: f.name, level: parseInt(lvl, 10) })
  }
  features.sort((a, b) => a.level - b.level)
  return { intro, features }
}

function SubclassCard({
  subclass,
  selected,
  onSelect,
  onDetail,
}: {
  subclass: Subclass
  selected: boolean
  onSelect: () => void
  onDetail: () => void
}) {
  const { intro, features } = summarizeSubclass(subclass)
  return (
    <div className={`choice-card ${selected ? 'selected' : ''}`} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" onClick={onSelect} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span>
          <h3 style={{ fontSize: 'var(--fs-base)', margin: 0 }}>{subclass.name}</h3>
          <span className="tr">{subclass.nameTr}</span>
        </span>
        <span className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{intro}</span>
        {features.length > 0 && (
          <span className="item-meta">
            {features.map((f) => (
              <span key={f.name} className="item-tag">
                {f.level}. sv. — {f.name}
              </span>
            ))}
          </span>
        )}
      </button>
      <button type="button" className="term" style={{ alignSelf: 'flex-start' }} onClick={onDetail}>
        Tüm özellikleri gör ⓘ
      </button>
    </div>
  )
}

export default function LevelUpPanel({
  onClose,
  hideClose = false,
}: {
  onClose: () => void
  /** Sihirbaza gömüldüğünde kapatmak anlamlı değil — ✕ gizlenir. */
  hideClose?: boolean
}) {
  const character = useCharacterStore((s) => s.character)!
  const replace = useCharacterStore((s) => s.replace)
  const klass = classById(character.classId)
  const [asi, setAsi] = useState<Partial<Record<Ability, number>>>({})
  const [useFeat, setUseFeat] = useState(false)
  const [featId, setFeatId] = useState('')
  const [featSel, setFeatSel] = useState<FeatSelection>({})
  const [subclassId, setSubclassId] = useState('')
  const [slotSel, setSlotSel] = useState<Record<string, string[]>>({})
  const [detailSubclass, setDetailSubclass] = useState<Subclass | null>(null)
  // seçilen alt sınıf önizlemeyi etkiler (o seviyenin alt sınıf özellikleri)
  const preview = useMemo(() => previewLevelUp(character, subclassId), [character, subclassId])

  if (!preview || !klass) return null

  const finalScores = finalAbilityScores(character)
  const selectedFeat = featId ? featById(featId) : undefined

  function prereqMet(feat: Feat): boolean {
    if (feat.prereqSpellcasting && !character.spellcasting) return false
    if (feat.prereqAbilityMin && !feat.prereqAbilityMin.anyOf.some((a) => finalScores[a] >= feat.prereqAbilityMin!.min)) return false
    return true
  }

  function featSelComplete(feat: Feat, sel: FeatSelection): boolean {
    if (feat.abilityChoice && !sel.ability) return false
    if (feat.grantsSkills && (sel.skills?.length ?? 0) + (sel.tools?.length ?? 0) !== feat.grantsSkills) return false
    if (feat.grantsWeapons && (sel.weapons?.length ?? 0) !== feat.grantsWeapons) return false
    if (feat.grantsLanguages && (sel.languages?.length ?? 0) !== feat.grantsLanguages) return false
    if (feat.damageChoice && !sel.damageType) return false
    if (feat.grantsSpells) {
      if (!sel.spellClass) return false
      if ((sel.cantrips?.length ?? 0) !== feat.grantsSpells.cantrips) return false
      if ((sel.spells?.length ?? 0) !== feat.grantsSpells.level1) return false
    }
    return true
  }

  function selectFeat(id: string) {
    setFeatId(id)
    setFeatSel({}) // yeni feat seçilince alt seçimleri sıfırla
  }

  const asiTotal = Object.values(asi).reduce((a, b) => a + (b || 0), 0)
  const asiOk = !preview.needsASI || (useFeat ? Boolean(selectedFeat) && featSelComplete(selectedFeat!, featSel) : asiTotal === 2)
  const subclassOk = !preview.needsSubclass || Boolean(subclassId)
  const choicesOk = preview.newChoiceSlots.every((s) => (slotSel[s.key]?.length ?? 0) >= s.count)
  const canApply = asiOk && subclassOk && choicesOk

  function bumpAsi(a: Ability, delta: number) {
    setAsi((prev) => {
      const cur = prev[a] || 0
      const next = cur + delta
      if (next < 0 || next > 2) return prev
      const total = Object.values({ ...prev, [a]: next }).reduce((x, y) => x + (y || 0), 0)
      if (total > 2) return prev
      return { ...prev, [a]: next }
    })
  }

  function toggleSlot(slot: ChoiceSlot, id: string) {
    setSlotSel((prev) => {
      const cur = prev[slot.key] ?? []
      const on = cur.includes(id)
      if (on) return { ...prev, [slot.key]: cur.filter((x) => x !== id) }
      if (slot.count === 1) return { ...prev, [slot.key]: [id] }
      if (cur.length >= slot.count) return prev
      return { ...prev, [slot.key]: [...cur, id] }
    })
  }

  function apply() {
    const choices: LevelUpChoices = {}
    if (preview!.needsASI) {
      if (useFeat && featId) {
        choices.feat = featId
        choices.featSelection = featSel
      } else choices.asi = asi
    }
    if (preview!.needsSubclass) choices.subclassId = subclassId
    if (preview!.newChoiceSlots.length) choices.choiceSelections = slotSel
    replace(applyLevelUp(character, choices))
    onClose()
  }

  // bir seçim slotunun seçenekleri: {id,label}
  function slotOptions(slot: ChoiceSlot): { id: string; label: string }[] {
    if (slot.type === 'fighting-style')
      return (slot.options ?? []).map((id) => ({ id, label: `${FIGHTING_STYLES[id]?.name} (${FIGHTING_STYLES[id]?.nameTr})` }))
    if (slot.type === 'expertise') {
      const opts = SKILL_KEYS.filter((s) => isSkillProficient(character, s)).map((s) => ({ id: s, label: config.skillsTr[s] }))
      if (slot.toolOption) opts.push({ id: slot.toolOption, label: "Thieves' Tools" })
      return opts
    }
    return []
  }

  return (
    <div className="panel" style={{ marginBottom: 16, borderColor: 'var(--gold)' }}>
      <div className="spread">
        <h2 style={{ fontSize: 'var(--fs-lg)' }}>
          Seviye {preview.fromLevel} → {preview.toLevel}
        </h2>
        {!hideClose && (
          <button className="btn btn-ghost" onClick={onClose}>
            kapat ✕
          </button>
        )}
      </div>

      <Info>
        Bu seviyede kazandıkların otomatik eklenecek. Onayladığında yeni özellikler kartında <b>yeşil "YENİ"</b>{' '}
        rozetiyle işaretlenecek. Can puanın +{preview.hpGained} artacak.
      </Info>

      {preview.features.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <label>Yeni Özellikler</label>
          <div className="stack" style={{ gap: 10, marginTop: 6 }}>
            {preview.features.map((f) => (
              <div key={f.name} className="panel" style={{ padding: 12, background: 'var(--panel-solid)' }}>
                <b style={{ color: 'var(--gold-bright)' }}>{f.name}</b>
                <RuleText clamp={320} style={{ marginTop: 4 }}>
                  {f.description}
                </RuleText>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="muted">Bu seviyede yeni bir sınıf özelliği yok (ama HP ve olası büyü ilerlemesi var).</p>
      )}

      {/* subclass seçimi */}
      {preview.needsSubclass && (
        <div style={{ marginTop: 12 }}>
          <label>Alt Sınıf (Subclass) Seç — {klass.name}</label>
          <p className="hint" style={{ marginTop: 4 }}>
            Alt sınıf, karakterinin uzmanlık dalıdır ve bundan sonraki seviyelerde ekstra özellikler verir. Kartın
            altındaki <b>Tüm özellikleri gör</b> ile hangi seviyede ne kazanacağını okuyabilirsin.
          </p>
          <div className="choice-grid" style={{ marginTop: 8 }}>
            {klass.subclasses.map((s) => (
              <SubclassCard
                key={s.id}
                subclass={s}
                selected={subclassId === s.id}
                onSelect={() => setSubclassId(s.id)}
                onDetail={() => setDetailSubclass(s)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ASI ya da Feat */}
      {preview.needsASI && (
        <div style={{ marginTop: 12 }}>
          <label>Yetenek Puanı Artışı (ASI) veya Feat</label>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <button className={`btn ${!useFeat ? 'btn-primary' : ''}`} onClick={() => setUseFeat(false)}>
              ASI (+2)
            </button>
            <button className={`btn ${useFeat ? 'btn-primary' : ''}`} onClick={() => setUseFeat(true)}>
              Feat seç
            </button>
          </div>

          {!useFeat ? (
            <div style={{ marginTop: 8 }}>
              <p className="hint" style={{ marginTop: 0 }}>Toplam 2 puan dağıt ({asiTotal}/2)</p>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {ABILITIES.map((a: Ability) => (
                  <div key={a} className="row" style={{ gap: 4, border: '1px solid var(--line)', borderRadius: 8, padding: '4px 8px' }}>
                    <span style={{ minWidth: 74 }}>{config.abilitiesTr[a]}</span>
                    <button className="btn" onClick={() => bumpAsi(a, -1)} disabled={!asi[a]}>
                      −
                    </button>
                    <span style={{ minWidth: 20, textAlign: 'center' }}>+{asi[a] || 0}</span>
                    <button className="btn" onClick={() => bumpAsi(a, +1)} disabled={asiTotal >= 2}>
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {FEATS.map((f) => {
                  const met = prereqMet(f)
                  return (
                    <button
                      key={f.id}
                      className={`choice-card ${featId === f.id ? 'selected' : ''}`}
                      style={{ textAlign: 'left', padding: 12, opacity: met ? 1 : 0.45, cursor: met ? 'pointer' : 'not-allowed' }}
                      disabled={!met}
                      onClick={() => selectFeat(f.id)}
                    >
                      <b>{f.name}</b> <span className="tr">({f.nameTr})</span>
                      {f.prereq && (
                        <p className="hint" style={{ margin: '2px 0 0', color: met ? undefined : 'var(--danger, #c0392b)' }}>
                          Ön koşul: {f.prereq}
                          {!met ? ' (karşılanmıyor)' : ''}
                        </p>
                      )}
                      <RuleText clamp={200} style={{ marginTop: 4 }}>
                        {f.desc}
                      </RuleText>
                    </button>
                  )
                })}
              </div>

              {selectedFeat && <FeatChoices feat={selectedFeat} character={character} sel={featSel} setSel={setFeatSel} />}
            </div>
          )}
        </div>
      )}

      {/* bu seviyede açılan sınıf seçimleri (Fighting Style / Expertise) */}
      {preview.newChoiceSlots.map((slot) => {
        const sel = slotSel[slot.key] ?? []
        return (
          <div key={slot.key} style={{ marginTop: 12 }}>
            <label>
              {slot.label} ({sel.length}/{slot.count})
            </label>
            {slot.help && <p className="hint" style={{ marginTop: 4 }}>{slot.help}</p>}
            <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {slotOptions(slot).map((o) => {
                const on = sel.includes(o.id)
                const full = !on && sel.length >= slot.count
                return (
                  <button key={o.id} className={`btn ${on ? 'btn-primary' : ''}`} disabled={full} onClick={() => toggleSlot(slot, o.id)}>
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="spread" style={{ marginTop: 16 }}>
        <span className="hint">{!canApply ? 'Devam etmek için gerekli seçimleri tamamla.' : 'Hazır!'}</span>
        <button className="btn btn-primary" onClick={apply} disabled={!canApply}>
          Seviye Atla ✦
        </button>
      </div>

      {/* alt sınıfın tüm özellikleri */}
      <Modal
        open={Boolean(detailSubclass)}
        onClose={() => setDetailSubclass(null)}
        wide
        title={detailSubclass?.name}
        subtitle={detailSubclass?.nameTr}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDetailSubclass(null)}>
              Kapat
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (detailSubclass) setSubclassId(detailSubclass.id)
                setDetailSubclass(null)
              }}
            >
              Bunu seç
            </button>
          </>
        }
      >
        {detailSubclass && (
          <>
            <RuleText>{detailSubclass.description}</RuleText>
            {Object.entries(detailSubclass.levelFeatures ?? {})
              .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
              .map(([lvl, list]) =>
                list.map((f) => (
                  <div key={`${lvl}-${f.name}`} style={{ marginTop: 14 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <b style={{ color: 'var(--gold-bright)' }}>{f.name}</b>
                      <span className="badge">{lvl}. seviye</span>
                    </div>
                    <RuleText>{f.description}</RuleText>
                  </div>
                )),
              )}
          </>
        )}
      </Modal>
    </div>
  )
}

// ---- Feat alt-seçimleri (ability / skill / silah / dil / büyü) ----
function FeatChoices({
  feat,
  character,
  sel,
  setSel,
}: {
  feat: Feat
  character: Character
  sel: FeatSelection
  setSel: (updater: (prev: FeatSelection) => FeatSelection) => void
}) {
  const anyChoice =
    feat.abilityChoice || feat.grantsSkills || feat.grantsWeapons || feat.grantsLanguages || feat.grantsSpells || feat.damageChoice
  if (!anyChoice) return null

  // çok-seçimli liste yardımcıları (cap ile)
  const toggleIn = (key: 'skills' | 'tools' | 'weapons' | 'languages' | 'cantrips' | 'spells', id: string, cap: number, sharedWith?: 'skills' | 'tools') =>
    setSel((prev) => {
      const cur = prev[key] ?? []
      if (cur.includes(id)) return { ...prev, [key]: cur.filter((x) => x !== id) }
      const shared = sharedWith ? (prev[sharedWith]?.length ?? 0) : 0
      if (cur.length + shared >= cap) return prev
      return { ...prev, [key]: [...cur, id] }
    })

  const knownLangs = new Set(characterLanguages(character).map((l) => l.toLowerCase()))
  const spellClassSpells = sel.spellClass ? spellsForClass(sel.spellClass) : []
  const cantripOpts = spellClassSpells.filter((s) => s.level === 0)
  let level1Opts = spellClassSpells.filter((s) => s.level === 1)
  if (feat.grantsSpells?.ritualOnly) {
    const rituals = level1Opts.filter(looksRitual)
    if (rituals.length) level1Opts = rituals // ritual bulunamazsa hepsini göster (veri sınırı)
  }
  const skillCount = (sel.skills?.length ?? 0) + (sel.tools?.length ?? 0)

  return (
    <div className="panel" style={{ marginTop: 12, padding: 12 }}>
      <b style={{ color: 'var(--gold-bright)' }}>{feat.name} — seçimler</b>

      {feat.abilityChoice && (
        <div style={{ marginTop: 8 }}>
          <label>+1 Yetenek{feat.grantsSaveProf ? ' (bu yetenekte kurtarma yeterliliği de kazanırsın)' : ''}</label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {feat.abilityChoice.map((a) => (
              <button key={a} className={`btn ${sel.ability === a ? 'btn-primary' : ''}`} onClick={() => setSel((p) => ({ ...p, ability: a }))}>
                {config.abilitiesTr[a]}
              </button>
            ))}
          </div>
        </div>
      )}

      {feat.grantsSkills && (
        <div style={{ marginTop: 12 }}>
          <label>
            Beceri / Alet — {skillCount}/{feat.grantsSkills}
          </label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {SKILL_KEYS.filter((s) => !isSkillProficient(character, s)).map((s) => {
              const on = sel.skills?.includes(s) ?? false
              return (
                <button key={s} className={`btn ${on ? 'btn-primary' : ''}`} onClick={() => toggleIn('skills', s, feat.grantsSkills!, 'tools')}>
                  {config.skillsTr[s] ?? s}
                </button>
              )
            })}
            {TOOL_ITEMS.map((t) => {
              const on = sel.tools?.includes(t.id) ?? false
              return (
                <button key={t.id} className={`btn ${on ? 'btn-primary' : ''}`} onClick={() => toggleIn('tools', t.id, feat.grantsSkills!, 'skills')}>
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {feat.grantsWeapons && (
        <div style={{ marginTop: 12 }}>
          <label>
            Silah — {sel.weapons?.length ?? 0}/{feat.grantsWeapons}
          </label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {WEAPON_ITEMS.map((w) => {
              const on = sel.weapons?.includes(w.id) ?? false
              return (
                <button key={w.id} className={`btn ${on ? 'btn-primary' : ''}`} onClick={() => toggleIn('weapons', w.id, feat.grantsWeapons!)}>
                  {w.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {feat.grantsLanguages && (
        <div style={{ marginTop: 12 }}>
          <label>
            Dil — {sel.languages?.length ?? 0}/{feat.grantsLanguages}
          </label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {LANGUAGES.filter((l) => !knownLangs.has(l.name.toLowerCase())).map((l) => {
              const on = sel.languages?.includes(l.name) ?? false
              return (
                <button key={l.id} className={`btn ${on ? 'btn-primary' : ''}`} onClick={() => toggleIn('languages', l.name, feat.grantsLanguages!)}>
                  {l.name} <span className="hint">({l.nameTr})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {feat.grantsSpells && (
        <div style={{ marginTop: 12 }}>
          <label>Büyü Sınıfı</label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {SPELL_FEAT_CLASSES.map((cid) => (
              <button
                key={cid}
                className={`btn ${sel.spellClass === cid ? 'btn-primary' : ''}`}
                onClick={() => setSel((p) => ({ ...p, spellClass: cid, cantrips: [], spells: [] }))}
              >
                {classById(cid)?.name ?? cid}
              </button>
            ))}
          </div>

          {sel.spellClass && feat.grantsSpells.cantrips > 0 && (
            <div style={{ marginTop: 10 }}>
              <label>
                Cantrip — {sel.cantrips?.length ?? 0}/{feat.grantsSpells.cantrips}
                {feat.grantsSpells.attackCantripOnly ? ' (saldırı cantrip’i seç)' : ''}
              </label>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {cantripOpts.map((s) => {
                  const on = sel.cantrips?.includes(s.id) ?? false
                  return (
                    <button key={s.id} className={`btn ${on ? 'btn-primary' : ''}`} onClick={() => toggleIn('cantrips', s.id, feat.grantsSpells!.cantrips)}>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {sel.spellClass && feat.grantsSpells.level1 > 0 && (
            <div style={{ marginTop: 10 }}>
              <label>
                1. Seviye Büyü — {sel.spells?.length ?? 0}/{feat.grantsSpells.level1}
                {feat.grantsSpells.ritualOnly ? ' (ritual büyü)' : ''}
              </label>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                {level1Opts.map((s) => {
                  const on = sel.spells?.includes(s.id) ?? false
                  return (
                    <button key={s.id} className={`btn ${on ? 'btn-primary' : ''}`} onClick={() => toggleIn('spells', s.id, feat.grantsSpells!.level1)}>
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {feat.damageChoice && (
        <div style={{ marginTop: 12 }}>
          <label>Hasar Türü</label>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {['Asit', 'Soğuk', 'Ateş', 'Yıldırım', 'Gök Gürültüsü'].map((d) => (
              <button key={d} className={`btn ${sel.damageType === d ? 'btn-primary' : ''}`} onClick={() => setSel((p) => ({ ...p, damageType: d }))}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

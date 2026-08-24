import { useState } from 'react'
import { config, classById, raceById, backgroundById, spellById, itemById, spells } from '@/data'
import { raceCantripEntries } from '@/data/grants'
import { isPactCaster, subclassSpells } from '@/data/spell-progression'
import { classResources, type ClassResource } from '@/data/class-resources'
import { inventoryWeight, weaponItemsIn } from '@/lib/inventory'
import { characterLanguages } from '@/lib/derive'
import RuleText from '@/components/RuleText'
import ItemDetailModal from '@/components/equipment/ItemDetailModal'
import SpellDetailModal from '@/components/SpellDetailModal'
import { Modal } from '@/components/Modal'
import type { Character, InventorySource } from '@/types/character'
import type { Item, Spell } from '@/types/data'

const INV_SOURCE_TR: Record<InventorySource, string> = {
  class: 'Sınıf',
  background: 'Geçmiş',
  purchase: 'Satın alınan',
  pack: 'Paket içi',
}
import { ABILITIES, type Ability } from '@/types/data'
import {
  armorClass,
  finalAbilityScores,
  formatMod,
  initiative,
  passivePerception,
  proficiencyBonus,
  savingThrowModifier,
  skillModifier,
  abilityModifier,
  isSkillProficient,
  hasExpertise,
  weaponAttackBonus,
  weaponDamage,
  weaponProficient,
} from '@/lib/rules'
import { featureKey } from '@/lib/character-factory'
import { LevelBadge } from '@/components/ui'
import { Corners } from '@/components/Ornament'
import { featGrantedSpells } from '@/data/feats'

const SKILL_KEYS = Object.keys(config.skills)

export default function CharacterCard({
  character,
  onEdit,
}: {
  character: Character
  onEdit?: (stepKey: string) => void
}) {
  const race = raceById(character.raceId)
  const klass = classById(character.classId)
  const bg = backgroundById(character.backgroundId)
  const sub = klass?.subclasses.find((s) => s.id === character.subclassId)
  const finals = finalAbilityScores(character)
  const pb = proficiencyBonus(character.level)
  const newKeys = new Set(character.lastGainedFeatureKeys)
  const [openItem, setOpenItem] = useState<Item | null>(null)
  const [openSpell, setOpenSpell] = useState<Spell | null>(null)
  const [openResource, setOpenResource] = useState<ClassResource | null>(null)
  const languages = characterLanguages(character)
  const senses = (race?.traits ?? []).filter((t) => /darkvision|görüş|blindsight|tremorsense|truesight/i.test(t.name))

  function EditBtn({ step }: { step: string }) {
    if (!onEdit) return null
    return (
      <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onEdit(step)} title="Bu bölümü düzenle">
        ✎ Düzenle
      </button>
    )
  }
  function Section({ title, editStep, children }: { title: string; editStep?: string; children: React.ReactNode }) {
    return (
      <div className="panel">
        <div className="spread" style={{ alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {editStep && <EditBtn step={editStep} />}
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="stack">
      {/* başlık — karakter sayfası bir "eser" yüzeyi: tam tezhipli */}
      <div className="panel artifact">
        <Corners />
        <div className="spread" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="eyebrow">
              {[race?.name, sub?.name].filter(Boolean).join(' · ') || 'Kahraman'}
            </span>
            <h1 style={{ fontSize: 30, marginBottom: 2 }}>{character.characterName || 'İsimsiz Kahraman'}</h1>
            <p className="muted">
              {race?.name}
              {sub ? ` · ${sub.name}` : ''} {klass?.name} · Seviye {character.level}
              {bg ? ` · ${bg.name}` : ''}
            </p>
          </div>
          <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
            <Big label="Proficiency Bonus" value={formatMod(pb)} />
            <Big label="Armor Class" value={String(armorClass(character))} />
            <Big label="Initiative" value={formatMod(initiative(character))} />
            <Big label="Speed" value={`${character.speed} ft`} />
            <Big label="HP" value={`${character.currentHp}/${character.maxHp}`} />
            {character.tempHp > 0 && <Big label="Geçici HP" value={`+${character.tempHp}`} />}
            <Big label="Hit Dice" value={`${character.hitDiceRemaining}d${character.hitDiceTotal.split('d')[1] ?? ''}`} />
          </div>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {[
            character.alignment,
            character.playerName && `Oyuncu: ${character.playerName}`,
            `XP: ${character.xp}`,
            character.inspiration && '✨ İlham (Inspiration) var',
            (character.deathSaves.successes > 0 || character.deathSaves.failures > 0 || character.currentHp <= 0) &&
              `Ölüm kurtarmaları: ✓${character.deathSaves.successes} ✗${character.deathSaves.failures}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {onEdit && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <span className="hint" style={{ alignSelf: 'center' }}>Düzenle:</span>
            <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onEdit('race')}>✎ Irk</button>
            <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onEdit('class')}>✎ Sınıf</button>
            <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onEdit('background')}>✎ Geçmiş</button>
            <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onEdit('identity')}>✎ Kimlik</button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: 16 }} className="sheet-grid">
        {/* sol: yetenekler + save + skill */}
        <div className="stack">
          <div className="panel">
            <div className="spread" style={{ alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>Ability Scores</h3>
              <EditBtn step="abilities" />
            </div>
            {ABILITIES.map((a: Ability) => (
              <div key={a} className="spread" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{a} <span className="hint">({config.abilitiesTr[a]})</span></span>
                <span>
                  <b style={{ fontFamily: 'var(--serif)' }}>{finals[a]}</b>{' '}
                  <span className="muted">({formatMod(abilityModifier(finals[a]))})</span>
                </span>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Saving Throws</h3>
            {ABILITIES.map((a: Ability) => (
              <div key={a} className="spread" style={{ padding: '3px 0' }}>
                <span className={character.savingThrowProficiencies.includes(a) ? '' : 'muted'}>
                  {character.savingThrowProficiencies.includes(a) ? '● ' : '○ '}
                  {a}
                </span>
                <span>{formatMod(savingThrowModifier(character, a))}</span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="spread" style={{ alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>Skills</h3>
              <EditBtn step="skills" />
            </div>
            <div className="spread muted" style={{ marginBottom: 4 }}>
              <span>Passive Perception</span>
              <b>{passivePerception(character)}</b>
            </div>
            {SKILL_KEYS.map((s) => {
              const prof = isSkillProficient(character, s)
              const exp = hasExpertise(character, s)
              return (
                <div key={s} className="spread" style={{ padding: '2px 0', fontSize: 15 }}>
                  <span className={prof ? '' : 'muted'}>
                    {exp ? '◆ ' : prof ? '● ' : '○ '}
                    {s}
                    {exp && <span className="hint" style={{ color: 'var(--gold-bright)' }}> uzman</span>}
                  </span>
                  <span>{formatMod(skillModifier(character, s))}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* sağ: özellikler, ekipman, kişilik, hikaye, büyü */}
        <div className="stack">
          <Section title="Özellikler & Yetenekler (Features & Traits)" editStep="class">
            {character.featuresAndTraits.length === 0 && <span className="muted">—</span>}
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {character.featuresAndTraits.map((f) => {
                const isNew = newKeys.has(featureKey(f.name, f.level))
                return (
                  <li key={featureKey(f.name, f.level) + f.source} style={{ marginBottom: 8 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <b>{f.name}</b>
                      <LevelBadge level={f.level} isNew={isNew} />
                    </div>
                    {/* markdown temizlenir; durum adları (prone, frightened…) tıklanabilir */}
                    <RuleText clamp={280}>{f.description}</RuleText>
                  </li>
                )
              })}
            </ul>
          </Section>

          {race && race.traits.length > 0 && (
            <Section title={`Irksal Özellikler (${race.name})`} editStep="race">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {race.traits.map((t) => (
                  <li key={t.name} style={{ marginBottom: 6 }}>
                    <b>{t.name}:</b>
                    <RuleText clamp={280}>{t.description}</RuleText>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(senses.length > 0 || languages.length > 0) && (
            <Section title="Duyular & Diller" editStep="languages">
              {senses.length > 0 && (
                <div style={{ marginBottom: languages.length ? 10 : 0 }}>
                  <label>Duyular (Senses)</label>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {senses.map((t) => (
                      <li key={t.name} style={{ marginBottom: 4 }}>
                        <b>{t.name}:</b>
                        <RuleText clamp={200}>{t.description}</RuleText>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {languages.length > 0 && (
                <div>
                  <label>Diller</label>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {languages.map((l) => (
                      <span key={l} className="badge">{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          <Section title="Ekipman & Para" editStep="equipment">
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              {config.currencies.map((cur) => (
                <span key={cur} className="badge">
                  {cur}: {character.currency[cur as keyof typeof character.currency]}
                </span>
              ))}
              <span className="badge">Toplam ağırlık: {inventoryWeight(character)} lb</span>
              {character.startingKit.goldRolled != null && (
                <span className="badge">Atılan başlangıç altını: {character.startingKit.goldRolled} gp</span>
              )}
            </div>
            {character.inventory.length > 0 ? (
              <div>
                {character.inventory.map((e) => {
                  const item = itemById(e.itemId)
                  return (
                    <div
                      key={`${e.itemId}-${e.source}`}
                      className="inv-row"
                      style={{ cursor: item ? 'pointer' : 'default' }}
                      onClick={() => item && setOpenItem(item)}
                      title={item ? 'Künyeyi gör' : undefined}
                    >
                      <span>
                        {item?.name ?? e.itemId}
                        {e.qty > 1 ? ` ×${e.qty}` : ''}
                        {item && <span className="hint"> ⓘ</span>}
                      </span>
                      <span className="hint">{INV_SOURCE_TR[e.source]}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{character.equipment || '—'}</div>
            )}
          </Section>

          <Section title="Diğer Yeterlilikler & Diller" editStep="languages">
            <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{character.otherProficienciesLanguages || '—'}</div>
            {raceCantripEntries(character).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <label>Irk Cantrip'leri</label>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {raceCantripEntries(character).map((e, i) => {
                    const sp = e.spellId ? spellById(e.spellId) : spells.find((s) => s.name.toLowerCase() === e.name.toLowerCase())
                    return (
                      <button
                        key={i}
                        className="badge"
                        style={{ cursor: sp ? 'pointer' : 'default' }}
                        onClick={() => sp && setOpenSpell(sp)}
                        title={sp ? 'Künyeyi gör' : undefined}
                      >
                        {e.name} {sp && <span className="hint">ⓘ</span>} <span className="hint">· {e.sourceLabel}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </Section>

          {classResources(character).length > 0 && (
            <Section title="Kaynaklar">
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {classResources(character).map((r) => (
                  <button
                    key={r.name}
                    className="badge"
                    style={{ cursor: r.desc ? 'pointer' : 'default' }}
                    onClick={() => r.desc && setOpenResource(r)}
                    title={r.desc ? 'Ne olduğunu gör' : r.recharge ? `Yenilenme: ${r.recharge}` : undefined}
                  >
                    {r.name}: <b>{r.value}</b> {r.desc && <span className="hint">ⓘ</span>}
                    {r.recharge ? <span className="hint"> · {r.recharge}</span> : null}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {weaponItemsIn(character).length > 0 && (
            <Section title="Saldırılar (Silahlar)" editStep="equipment">
              <div className="stack" style={{ gap: 6 }}>
                {weaponItemsIn(character).map((w) => (
                  <div
                    key={w.id}
                    className="row spread"
                    style={{ gap: 10, flexWrap: 'wrap', cursor: 'pointer' }}
                    onClick={() => setOpenItem(w)}
                    title="Künyeyi gör"
                  >
                    <b>
                      {w.name} <span className="hint">ⓘ</span>
                      {!weaponProficient(character, w) && <span className="hint"> (proficiency yok)</span>}
                      {w.properties && w.properties.length > 0 && (
                        <span className="hint" style={{ display: 'block', fontWeight: 400 }}>{w.properties.join(', ')}</span>
                      )}
                    </b>
                    <span className="row" style={{ gap: 14 }}>
                      <span>Saldırı: <b>{formatMod(weaponAttackBonus(character, w))}</b></span>
                      <span>Hasar: <b>{weaponDamage(character, w)}</b></span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {character.spellcasting && (
            <Section title="Büyücülük" editStep="spells">
              <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
                <Big label="Yetenek" value={String(character.spellcasting.spellcastingAbility)} />
                <Big label="Kurtarma DC" value={String(character.spellcasting.spellSaveDC)} />
                <Big label="Saldırı" value={formatMod(character.spellcasting.spellAttackBonus)} />
              </div>
              <SpellSlots character={character} />
              <SpellList label="Cantrip'ler" ids={character.spellcasting.cantripIds} onInfo={setOpenSpell} />
              {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => (
                <SpellList
                  key={lvl}
                  label={`${lvl}. Seviye`}
                  ids={character.spellcasting!.levels[lvl]?.spellIds ?? []}
                  onInfo={setOpenSpell}
                />
              ))}
              {subclassSpells(character).length > 0 && (
                <SpellList
                  label="Otomatik Hazır (Domain/Oath/Patron)"
                  ids={subclassSpells(character).map((s) => s.id)}
                  onInfo={setOpenSpell}
                />
              )}
            </Section>
          )}

          {featGrantedSpells(character.feats ?? [], character.featSelections ?? {}).length > 0 && (
            <Section title="Feat Büyüleri" editStep="spells">
              <p className="hint" style={{ marginTop: 0 }}>
                Feat’lerden gelen büyüler. Spell slot harcamazlar (feat kuralına göre kullanılır).
              </p>
              {featGrantedSpells(character.feats ?? [], character.featSelections ?? {}).map((fs) => (
                <div key={fs.featId} style={{ marginTop: 8 }}>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ color: 'var(--gold-bright)' }}>{fs.featName}</b>
                    <span className="badge">Yetenek: {fs.ability}</span>
                    {fs.ritualOnly && <span className="badge">yalnız ritual</span>}
                  </div>
                  {fs.cantrips.length > 0 && <SpellList label="Cantrip'ler" ids={fs.cantrips} onInfo={setOpenSpell} />}
                  {fs.spells.length > 0 && <SpellList label="1. Seviye" ids={fs.spells} onInfo={setOpenSpell} />}
                </div>
              ))}
            </Section>
          )}

          <Section title="Kişilik" editStep="story">
            <StoryField label="Kişilik Özellikleri" value={character.personalityTraits} />
            <StoryField label="Ülküler" value={character.ideals} />
            <StoryField label="Bağlar" value={character.bonds} />
            <StoryField label="Kusurlar" value={character.flaws} />
          </Section>

          {(character.appearance || character.backstory || character.allies || character.treasure || character.additionalFeatures) && (
            <Section title="Görünüm & Hikaye" editStep="identity">
              <StoryField label="Görünüm" value={character.appearance} />
              <StoryField label="Hikaye" value={character.backstory} />
              <StoryField label="Müttefikler" value={[character.factionName, character.allies].filter(Boolean).join(' — ')} />
              <StoryField label="Ek Özellikler & Notlar" value={character.additionalFeatures} />
              <StoryField label="Hazine" value={character.treasure} />
              <div className="row muted" style={{ gap: 12, flexWrap: 'wrap', fontSize: 14 }}>
                {character.age && <span>Yaş: {character.age}</span>}
                {character.height && <span>Boy: {character.height}</span>}
                {character.weight && <span>Ağırlık: {character.weight}</span>}
                {character.eyes && <span>Göz: {character.eyes}</span>}
                {character.skin && <span>Ten: {character.skin}</span>}
                {character.hair && <span>Saç: {character.hair}</span>}
              </div>
            </Section>
          )}
        </div>
      </div>

      <ItemDetailModal item={openItem} onClose={() => setOpenItem(null)} />
      <SpellDetailModal spell={openSpell} onClose={() => setOpenSpell(null)} />
      <Modal
        open={Boolean(openResource)}
        onClose={() => setOpenResource(null)}
        title={openResource?.name}
        subtitle={
          openResource
            ? `${openResource.value}${openResource.recharge ? ` · Yenilenme: ${openResource.recharge}` : ''}`
            : undefined
        }
      >
        {openResource?.desc && <RuleText>{openResource.desc}</RuleText>}
      </Modal>
    </div>
  )
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 24, color: 'var(--gold-bright)' }}>{value}</div>
      <div className="hint" style={{ fontSize: 11 }}>{label}</div>
    </div>
  )
}
function StoryField({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <label>{label}</label>
      <div className="muted" style={{ whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  )
}
function SpellSlots({ character }: { character: Character }) {
  const levels = character.spellcasting?.levels ?? {}
  const rows = Object.entries(levels)
    .map(([lvl, st]) => ({ lvl: Number(lvl), total: st.slotsTotal, remaining: st.slotsRemaining }))
    .filter((r) => r.total > 0)
    .sort((a, b) => a.lvl - b.lvl)
  if (!rows.length) return null
  const pact = isPactCaster(character.classId)
  return (
    <div style={{ marginBottom: 8 }}>
      <label>{pact ? 'Pact Magic Slotları' : 'Spell Slotları'}</label>
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        {rows.map((r) => (
          <span key={r.lvl} className="badge">
            {r.lvl}. seviye: {r.remaining}/{r.total}
          </span>
        ))}
      </div>
    </div>
  )
}

function SpellList({ label, ids, onInfo }: { label: string; ids: string[]; onInfo: (s: Spell) => void }) {
  if (!ids.length) return null
  return (
    <div style={{ marginBottom: 6 }}>
      <label>{label}</label>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {ids.map((id) => {
          const spell = spellById(id)
          return (
            <button
              key={id}
              className="badge"
              style={{ cursor: spell ? 'pointer' : 'default' }}
              onClick={() => spell && onInfo(spell)}
              title={spell ? 'Künyeyi gör' : undefined}
            >
              {spell?.name ?? id} {spell && <span className="hint">ⓘ</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

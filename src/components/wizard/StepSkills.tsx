import { useMemo } from 'react'
import { config, classById, backgroundById } from '@/data'
import { Info, Tip } from '@/components/ui'
import { useChar } from './useChar'
import { formatMod, passivePerception, savingThrowModifier, skillModifier, isSkillProficient } from '@/lib/rules'
import { ABILITIES, type Ability } from '@/types/data'

const SKILL_KEYS = Object.keys(config.skills)

function skillsInText(text: string): string[] {
  if (!text) return []
  return SKILL_KEYS.filter((s) => new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(text))
}

export default function StepSkills() {
  const { character, updateFn } = useChar()
  const klass = classById(character.classId)
  const bg = backgroundById(character.backgroundId)

  const bgSkills = useMemo(() => skillsInText(bg?.skillProficiencies ?? ''), [bg])
  const classOptions = useMemo(() => skillsInText(klass?.skillChoices.options ?? ''), [klass])
  const classCount = klass?.skillChoices.count ?? 0

  // NOT: background becerileri c.skills'e YAZILMAZ; isSkillProficient türetir
  // (böylece background değişince eski proficiency kalmaz).

  const classChosenCount = classOptions.filter((s) => !bgSkills.includes(s) && character.skills[s]?.proficient).length

  function toggle(skill: string) {
    if (bgSkills.includes(skill)) return // background kilitli
    if (!classOptions.includes(skill)) return // sınıf seçeneği değil
    updateFn((c) => {
      const now = c.skills[skill]?.proficient
      if (!now && classChosenCount >= classCount) return
      c.skills[skill] = { proficient: !now }
    })
  }

  return (
    <div className="stack">
      <Info>
        <b>Beceriler</b> belirli eylemlerde ustalığını gösterir. <b>Yeterlilik (proficiency)</b> işaretli becerilerde
        seviyene bağlı bonus eklenir. Geçmişinden gelenler otomatik işaretlidir; sınıfın {classCount} tanesini seçmene
        izin verir.
      </Info>

      <div className="spread">
        <span className="badge">
          Sınıf becerisi: {classChosenCount} / {classCount}
        </span>
        <span className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="badge">Passive Perception: {passivePerception(character)}</span>
          <Tip label="?">
            Zar atmadan sürekli farkındalığın: 10 + Wisdom (Perception) modifier’ın. DM, gizli kapı ya da saklanan
            yaratıkları fark edip etmediğini bu sayıya bakarak belirler.
          </Tip>
        </span>
      </div>

      {/* Kurtarma yeterlilikleri (sınıftan, sabit) */}
      <div>
        <div className="row" style={{ gap: 6, alignItems: 'center', marginBottom: 4 }}>
          <label style={{ margin: 0 }}>Saving Throws — sınıftan (sabit)</label>
          <Tip label="?">
            Kurtarma atışı: bir tehlikeden (büyü, zehir, tuzak) kaçınmak için attığın d20. İşaretli iki yetenekte
            yeterlilik bonusu alırsın — sınıfının dirençli olduğu alanlar. Bunlar sınıftan gelir, değiştirilemez.
          </Tip>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {ABILITIES.map((a: Ability) => {
            const prof = character.savingThrowProficiencies.includes(a)
            return (
              <span key={a} className={prof ? 'badge badge-new' : 'badge'} style={{ opacity: prof ? 1 : 0.5 }}>
                {config.abilitiesTr[a]} {formatMod(savingThrowModifier(character, a))}
              </span>
            )
          })}
        </div>
      </div>

      <div className="divider" />

      <label>Skills (18)</label>
      <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
        {SKILL_KEYS.map((s) => {
          const prof = isSkillProficient(character, s)
          const isBg = bgSkills.includes(s)
          const isRace = character.raceExtraSkills.includes(s)
          const isOption = classOptions.includes(s)
          const selectable = isOption && !isBg && !isRace
          return (
            <label
              key={s}
              className="choice-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: selectable ? 'pointer' : 'default',
                opacity: !prof && !selectable ? 0.6 : 1,
                padding: '10px 12px',
              }}
            >
              <input type="checkbox" checked={Boolean(prof)} disabled={!selectable} onChange={() => toggle(s)} style={{ width: 'auto' }} />
              <span style={{ flex: 1 }}>
                <b>{s}</b> <span className="hint">({config.skillsTr[s]})</span>
                <br />
                <span className="hint">
                  {config.skills[s]} · {formatMod(skillModifier(character, s))}
                  {isBg ? ' · background' : ''}
                  {isRace ? ' · ırk' : ''}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

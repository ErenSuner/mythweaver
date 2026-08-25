import { races, raceById } from '@/data'
import { config } from '@/data'
import { RACE_BLURBS } from '@/data/blurbs'
import { Info } from '@/components/ui'
import RuleText from '@/components/RuleText'
import { useChar } from './useChar'
import type { Ability } from '@/types/data'
import { ABILITIES } from '@/types/data'

export default function StepRace() {
  const { character, update, updateFn } = useChar()
  const race = raceById(character.raceId)

  function pickRace(id: string) {
    update({ raceId: id, subraceId: '', raceAbilityChoice: {} })
  }

  return (
    <div className="stack">
      <Info>
        <b>Irk</b>, karakterinin türünü belirler. Yetenek puanlarına bonus, hız, diller ve özel yetenekler kazandırır.
      </Info>

      <div className="choice-grid">
        {races.map((r) => (
          <button key={r.id} className={`choice-card ${character.raceId === r.id ? 'selected' : ''}`} onClick={() => pickRace(r.id)}>
            <h3>{r.name}</h3>
            <span className="tr">{r.nameTr}</span>
            <p>{RACE_BLURBS[r.id] ?? r.description.split('.')[0] + '.'}</p>
          </button>
        ))}
      </div>

      {race && (
        <div className="panel" style={{ background: 'var(--panel-solid)' }}>
          <h2 style={{ fontSize: 'var(--fs-md)' }}>
            {race.name} <span className="tr">({race.nameTr})</span>
          </h2>
          <p className="muted">{race.description}</p>
          <div className="divider" />
          <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
            <div>
              <label>Yetenek Bonusu</label>
              <div>{race.abilityScoreText || '—'}</div>
            </div>
            <div>
              <label>Hız</label>
              <div>{race.speed ?? '—'} ft</div>
            </div>
            <div>
              <label>Diller</label>
              <div>{race.languages || '—'}</div>
            </div>
          </div>

          {race.traits.length > 0 && (
            <>
              <div className="divider" />
              <label>Özel Yetenekler</label>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {race.traits.map((t) => (
                  <li key={t.name} style={{ marginBottom: 8 }}>
                    <b>{t.name}:</b>
                    <RuleText clamp={280}>{t.description}</RuleText>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* subrace seçimi */}
          {race.subraces.length > 0 && (
            <>
              <div className="divider" />
              <label>Alt Irk (Subrace) — birini seç</label>
              <div className="choice-grid" style={{ marginTop: 8 }}>
                {race.subraces.map((s) => (
                  <button
                    key={s.id}
                    className={`choice-card ${character.subraceId === s.id ? 'selected' : ''}`}
                    onClick={() => update({ subraceId: s.id })}
                  >
                    <h3 style={{ fontSize: 'var(--fs-base)' }}>{s.name}</h3>
                    <p>{s.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* seçmeli ability bonusu (Half-Elf) */}
          {race.abilityBonusChoice && (
            <>
              <div className="divider" />
              <label>
                Seçmeli Bonus — {race.abilityBonusChoice.count} farklı yeteneğe +{race.abilityBonusChoice.amount}
              </label>
              <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {ABILITIES.map((a: Ability) => {
                  const chosen = Boolean(character.raceAbilityChoice[a])
                  const count = Object.keys(character.raceAbilityChoice).length
                  const disabled = !chosen && count >= race.abilityBonusChoice!.count
                  return (
                    <button
                      key={a}
                      className={`btn ${chosen ? 'btn-primary' : ''}`}
                      disabled={disabled}
                      onClick={() =>
                        updateFn((c) => {
                          if (c.raceAbilityChoice[a]) delete c.raceAbilityChoice[a]
                          else c.raceAbilityChoice[a] = race.abilityBonusChoice!.amount
                        })
                      }
                    >
                      {config.abilitiesTr[a]}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

import { classes, classById } from '@/data'
import { CLASS_BLURBS } from '@/data/blurbs'
import { Info, Tip } from '@/components/ui'
import RuleText from '@/components/RuleText'
import { useChar } from './useChar'

const STAT_TIPS: Record<string, string> = {
  'Hit Die':
    'Sınıfının can (HP) zarı. Her seviyede bu zarı atarak + Constitution modifier kadar HP kazanırsın; Short Rest’te HP geri kazanmak için de harcanır.',
  'Primary Ability': 'Sınıfın en çok dayandığı yetenek. Büyülerin ve en önemli atışların bu yeteneğe bağlıdır.',
  'Saving Throws':
    'Bu iki yetenekte kurtarma atışlarında yeterlilik bonusu alırsın — sınıfının dirençli olduğu tehlikeler.',
  Armor: 'Ustalıkla (proficiency) giyebileceğin zırh türleri. Yeterli olmadığın zırhı giyersen ceza alırsın.',
  Weapons: 'Ustalıkla kullanabileceğin silahlar. Yeterli olduğun silahta saldırıya yeterlilik bonusu eklenir.',
}

export default function StepClass() {
  const { character, update } = useChar()
  const klass = classById(character.classId)

  return (
    <div className="stack">
      <Info>
        <b>Sınıf</b>, karakterinin ne yapabildiğini belirler — savaşçı mı, büyücü mü, hırsız mı? Vuruş zarını (hit die),
        temel yeteneğini, zırh/silah yeterliliklerini ve özel becerilerini kazandırır.
      </Info>

      <div className="choice-grid">
        {classes.map((c) => (
          <button
            key={c.id}
            className={`choice-card ${character.classId === c.id ? 'selected' : ''}`}
            onClick={() => update({ classId: c.id, subclassId: '' })}
          >
            <h3>{c.name}</h3>
            <span className="tr">{c.nameTr}</span>
            {c.isCaster && <span className="badge" style={{ marginLeft: 8 }}>büyücü</span>}
            <p>{CLASS_BLURBS[c.id] ?? c.description.split('.')[0] + '.'}</p>
          </button>
        ))}
      </div>

      {klass && (
        <div className="panel" style={{ background: 'var(--panel-solid)' }}>
          <h2 style={{ fontSize: 'var(--fs-md)' }}>
            {klass.name} <span className="tr">({klass.nameTr})</span>
          </h2>
          <p className="muted">{klass.description}</p>
          <div className="divider" />
          <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
            <Stat label="Hit Die" value={klass.hitDie ? `d${klass.hitDie}` : '—'} />
            <Stat label="Primary Ability" value={klass.primaryAbility || '—'} />
            <Stat label="Saving Throws" value={klass.savingThrows.join(', ') || '—'} />
          </div>
          <div className="divider" />
          <Stat label="Armor" value={klass.armor || '—'} block />
          <Stat label="Weapons" value={klass.weapons || '—'} block />
          <Stat label="Skills" value={klass.skillChoices.raw || '—'} block />
          {klass.startingEquipment && <Stat label="Starting Equipment" value={klass.startingEquipment} block />}
          {klass.hpText && (
            <div style={{ marginTop: 10 }}>
              <label>Can Puanı (HP) Nasıl Hesaplanır?</label>
              <RuleText>{klass.hpText}</RuleText>
            </div>
          )}
          {klass.levelFeatures['1']?.length > 0 && (
            <>
              <div className="divider" />
              <label>1. Seviyede Kazandıkların</label>
              <div className="stack" style={{ gap: 10, marginTop: 6 }}>
                {klass.levelFeatures['1'].map((f) => (
                  <div key={f.name} className="panel" style={{ padding: 12 }}>
                    <b style={{ color: 'var(--gold-bright)' }}>{f.name}</b>
                    <RuleText clamp={320}>{f.description}</RuleText>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* subclass seçimi — subclassLevel bu karakterin seviyesine ulaşmışsa
              (Cleric/Sorcerer/Warlock için 1. seviyede zorunlu) */}
          {klass.subclassLevel != null && character.level >= klass.subclassLevel && klass.subclasses.length > 0 && (
            <>
              <div className="divider" />
              <label>Alt Sınıf (Subclass) — {klass.subclassLevel}. seviyede seçilir</label>
              <div className="choice-grid" style={{ marginTop: 6 }}>
                {klass.subclasses.map((s) => (
                  <button
                    key={s.id}
                    className={`choice-card ${character.subclassId === s.id ? 'selected' : ''}`}
                    onClick={() => update({ subclassId: s.id })}
                  >
                    <h3 style={{ fontSize: 'var(--fs-base)' }}>{s.name}</h3>
                    {s.nameTr && <span className="tr">{s.nameTr}</span>}
                    <RuleText clamp={200}>{s.description}</RuleText>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, block }: { label: string; value: string; block?: boolean }) {
  const tip = STAT_TIPS[label]
  return (
    <div style={{ marginTop: block ? 10 : 0 }}>
      {tip ? (
        <div style={{ marginBottom: 2 }}>
          <Tip label={label}>{tip}</Tip>
        </div>
      ) : (
        <label>{label}</label>
      )}
      <div style={{ color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}

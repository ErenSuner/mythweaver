import { useMemo, useState } from 'react'
import { classById, spellsForClass } from '@/data'
import { spellLimitsFor, subclassSpells } from '@/data/spell-progression'
import { Info, Tip } from '@/components/ui'
import SpellDetailModal from '@/components/SpellDetailModal'
import { useChar } from './useChar'
import type { Spell } from '@/types/data'

/* Büyü seçimi tek bir TOPLAM bütçeyle çalışır ve bu bütçe cast edilebilen
   tüm büyü seviyelerine dağılır — 5e'de seviye başına ayrı kota yoktur.
   Önceden yalnız 1. seviye büyüler seçilebiliyordu; 5. seviyeden başlayan
   bir caster 2-3. seviye yuvalarına sahip olup o büyüleri seçemiyordu. */

// Modele göre doğru terim: bard/sorcerer bilir, cleric hazırlar, wizard kitabına yazar.
const MODEL_LABEL: Record<string, { noun: string; verb: string; help: string }> = {
  known: {
    noun: 'Bildiğin büyüler',
    verb: 'bilirsin',
    help: 'Seçtiklerin kalıcıdır; seviye atladıkça sayı artar.',
  },
  prepared: {
    noun: 'Hazırladığın büyüler',
    verb: 'hazırlarsın',
    help: 'Sınıfının tüm listesinden her uzun dinlenmede yeniden seçebilirsin; buradaki seçim başlangıç hazırlığın.',
  },
  wizard: {
    noun: 'Büyü kitabın',
    verb: 'kitabına yazarsın',
    help: 'Kitabına 1. seviyede 6 büyü yazarsın, her seviye atlamada 2 tane daha eklenir.',
  },
}

export default function StepSpells() {
  const { character, updateFn } = useChar()
  const klass = classById(character.classId)
  const sc = character.spellcasting
  const [open, setOpen] = useState<Spell | null>(null)

  const limits = useMemo(() => spellLimitsFor(character), [character])

  // Cantrip'ler ayrı bütçe; büyüler cast edilebilir seviyeye kadar gruplanır.
  const { cantrips, byLevel } = useMemo(() => {
    const list = spellsForClass(character.classId)
    const groups: { level: number; spells: Spell[] }[] = []
    for (let lvl = 1; lvl <= limits.maxSpellLevel; lvl++) {
      const spells = list.filter((s) => s.level === lvl).sort((a, b) => a.name.localeCompare(b.name))
      if (spells.length) groups.push({ level: lvl, spells })
    }
    return {
      cantrips: list.filter((s) => s.level === 0).sort((a, b) => a.name.localeCompare(b.name)),
      byLevel: groups,
    }
  }, [character.classId, limits.maxSpellLevel])

  if (!sc || !klass) return <p className="muted">Bu sınıf büyü kullanmıyor.</p>

  // Paladin/Ranger 2. seviyeye kadar büyü almaz — boş seçici göstermek yerine
  // neden olmadığını söyle.
  if (limits.cantrips === 0 && limits.spellsTotal === 0) {
    return (
      <div className="stack">
        <Info>
          <b>{klass.name}</b> büyücülüğe <b>2. seviyede</b> başlar. Şu an seviye {character.level} olduğun için
          seçilecek büyü yok. Başlangıç seviyeni yükseltirsen bu adım büyülerle dolacak.
        </Info>
        <p className="hint">İleri diyerek devam edebilirsin.</p>
      </div>
    )
  }

  const words = MODEL_LABEL[limits.model] ?? MODEL_LABEL.known

  const cantripSel = sc.cantripIds
  const cantripsFull = cantripSel.length >= limits.cantrips

  // Tüm seviyelerdeki seçimlerin toplamı tek bütçeyi paylaşır.
  const selectedByLevel: Record<number, string[]> = {}
  let spellsChosen = 0
  for (let lvl = 1; lvl <= 9; lvl++) {
    const ids = sc.levels[lvl]?.spellIds ?? []
    selectedByLevel[lvl] = ids
    spellsChosen += ids.length
  }
  const spellsFull = spellsChosen >= limits.spellsTotal

  function toggleCantrip(id: string) {
    updateFn((c) => {
      const arr = c.spellcasting!.cantripIds
      const i = arr.indexOf(id)
      if (i >= 0) arr.splice(i, 1)
      else if (arr.length < limits.cantrips) arr.push(id)
    })
  }

  function toggleSpell(spell: Spell) {
    updateFn((c) => {
      const lv = (c.spellcasting!.levels[spell.level] ||= {
        slotsTotal: 0,
        slotsRemaining: 0,
        spellIds: [],
        preparedIds: [],
      })
      const i = lv.spellIds.indexOf(spell.id)
      if (i >= 0) {
        lv.spellIds.splice(i, 1)
        return
      }
      // Bütçe kontrolü seçim anındaki güncel toplam üzerinden yapılır.
      let total = 0
      for (let l = 1; l <= 9; l++) total += c.spellcasting!.levels[l]?.spellIds.length ?? 0
      if (total < limits.spellsTotal) lv.spellIds.push(spell.id)
    })
  }

  return (
    <div className="stack">
      <Info>
        <b>Büyücülük</b>: {klass.name} büyü kullanır. Büyü yeteneğin <b>{sc.spellcastingAbility}</b>. Bir hedefin
        büyünden kaçmak için <b>Büyü Kurtarma DC&apos;sini</b> geçmeli.
        <br />
        <b>Cantrip&apos;ler</b> (0. seviye) slot harcamaz, istediğin kadar kullanılır. Diğer büyüler bir{' '}
        <b>spell slot</b> harcar — günlük bir kaynaktır, uzun dinlenmeyle yenilenir. {words.help}
      </Info>

      <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
        <Stat label="Büyü Yeteneği" value={String(sc.spellcastingAbility)} />
        <Stat label="Büyü Kurtarma DC" value={String(sc.spellSaveDC)} />
        <Stat
          label="Büyü Saldırı Bonusu"
          value={sc.spellAttackBonus >= 0 ? `+${sc.spellAttackBonus}` : String(sc.spellAttackBonus)}
        />
      </div>

      {subclassSpells(character).length > 0 && (
        <Info>
          <b>Otomatik hazır büyüler</b> (alt sınıftan — sayına dahil <b>değil</b>):{' '}
          {subclassSpells(character)
            .map((s) => s.name)
            .join(', ')}
        </Info>
      )}

      <div className="divider" />
      <SpellPicker
        title={`Cantrip'ler (0. seviye) — seçili: ${cantripSel.length} / ${limits.cantrips}`}
        spells={cantrips}
        selected={cantripSel}
        full={cantripsFull}
        onToggle={(id) => toggleCantrip(id)}
        onInfo={setOpen}
      />

      {limits.spellsTotal > 0 && (
        <>
          <div className="divider" />
          <div className="section-head">
            <h2>{words.noun}</h2>
            <span className="section-meta">
              {spellsChosen} / {limits.spellsTotal}
              {limits.maxSpellLevel > 1 ? ` · ${limits.maxSpellLevel}. seviyeye kadar` : ''}
            </span>
          </div>
          <p className="hint" style={{ marginTop: -6 }}>
            Toplam {limits.spellsTotal} büyü {words.verb}. Bunları aşağıdaki seviyeler arasında istediğin gibi
            dağıtabilirsin.
          </p>

          {byLevel.map((g) => (
            <div key={g.level}>
              <div className="divider" />
              <SpellPicker
                title={`${g.level}. Seviye Büyüler — seçili: ${selectedByLevel[g.level].length}`}
                spells={g.spells}
                selected={selectedByLevel[g.level]}
                full={spellsFull}
                onToggle={(id) => toggleSpell(g.spells.find((s) => s.id === id)!)}
                onInfo={setOpen}
              />
            </div>
          ))}
        </>
      )}

      {/* büyü künyesi — tema içi modal */}
      <SpellDetailModal spell={open} onClose={() => setOpen(null)} />
    </div>
  )
}

const SPELL_STAT_TIPS: Record<string, string> = {
  'Büyü Yeteneği': 'Büyülerinin dayandığı yetenek. Kurtarma DC’n ve saldırı bonusun bunun modifier’ından hesaplanır.',
  'Büyü Kurtarma DC':
    'Büyünden etkilenen hedefin geçmesi gereken zorluk. 8 + yeterlilik bonusu + büyü yeteneği modifier’ı. Hedef kurtarma atışında bunu tutturamazsa büyünün tam etkisini yer.',
  'Büyü Saldırı Bonusu':
    'Hedefi tutturmak için atış gerektiren büyülerde (Fire Bolt gibi) saldırı atışına eklenen sayı. Yeterlilik bonusu + büyü yeteneği modifier’ı.',
}

function Stat({ label, value }: { label: string; value: string }) {
  const tip = SPELL_STAT_TIPS[label]
  return (
    <div>
      {tip ? (
        <div style={{ marginBottom: 2 }}>
          <Tip label={label}>{tip}</Tip>
        </div>
      ) : (
        <label>{label}</label>
      )}
      <div style={{ fontSize: 'var(--fs-md)', fontFamily: 'var(--serif)', color: 'var(--gold-bright)' }}>{value}</div>
    </div>
  )
}

function SpellPicker({
  title,
  spells,
  selected,
  full,
  onToggle,
  onInfo,
}: {
  title: string
  spells: Spell[]
  selected: string[]
  full: boolean
  onToggle: (id: string) => void
  onInfo: (s: Spell) => void
}) {
  return (
    <div>
      <label>{title}</label>
      <div
        className="choice-grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginTop: 6 }}
      >
        {spells.map((s) => {
          const on = selected.includes(s.id)
          const disabled = !on && full
          return (
            <div
              key={s.id}
              className={`choice-card ${on ? 'selected' : ''}`}
              style={{ padding: 12, opacity: disabled ? 0.5 : 1 }}
            >
              <div className="spread">
                <b>{s.name}</b>
                <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onInfo(s)}>
                  ⓘ
                </button>
              </div>
              <p className="hint" style={{ margin: '4px 0 8px' }}>
                {s.school}
              </p>
              <button
                className={`btn ${on ? 'btn-primary' : ''}`}
                style={{ width: '100%' }}
                disabled={disabled}
                onClick={() => onToggle(s.id)}
              >
                {on ? 'Seçili ✓' : 'Seç'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

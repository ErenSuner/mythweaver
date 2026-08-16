import { useMemo, useState } from 'react'
import { classById, spellsForClass } from '@/data'
import { spellLimitsFor, subclassSpells } from '@/data/spell-progression'
import { Info, Tip } from '@/components/ui'
import SpellDetailModal from '@/components/SpellDetailModal'
import { useChar } from './useChar'
import type { Spell } from '@/types/data'

export default function StepSpells() {
  const { character, updateFn } = useChar()
  const klass = classById(character.classId)
  const sc = character.spellcasting
  const [open, setOpen] = useState<Spell | null>(null)

  const { cantrips, level1 } = useMemo(() => {
    const list = spellsForClass(character.classId)
    return {
      cantrips: list.filter((s) => s.level === 0).sort((a, b) => a.name.localeCompare(b.name)),
      level1: list.filter((s) => s.level === 1).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [character.classId])

  const limits = useMemo(() => spellLimitsFor(character), [character])

  if (!sc || !klass) return <p className="muted">Bu sınıf büyü kullanmıyor.</p>

  const cantripSel = sc.cantripIds
  const lvl1Sel = sc.levels[1]?.spellIds ?? []
  const cantripsFull = cantripSel.length >= limits.cantrips
  const lvl1Full = lvl1Sel.length >= limits.level1Spells

  function toggleCantrip(id: string) {
    updateFn((c) => {
      const arr = c.spellcasting!.cantripIds
      const i = arr.indexOf(id)
      if (i >= 0) arr.splice(i, 1)
      else if (arr.length < limits.cantrips) arr.push(id)
    })
  }
  function toggleLvl1(id: string) {
    updateFn((c) => {
      const lv = (c.spellcasting!.levels[1] ||= { slotsTotal: 0, slotsRemaining: 0, spellIds: [], preparedIds: [] })
      const i = lv.spellIds.indexOf(id)
      if (i >= 0) lv.spellIds.splice(i, 1)
      else if (lv.spellIds.length < limits.level1Spells) lv.spellIds.push(id)
    })
  }

  return (
    <div className="stack">
      <Info>
        <b>Büyücülük</b>: {klass.name} büyü kullanır. Büyü yeteneğin <b>{sc.spellcastingAbility}</b>. Bir hedefin
        büyünden kaçmak için <b>Büyü Kurtarma DC'sini</b> geçmeli.
        <br />
        İki tür büyü seçersin: <b>Cantrip'ler</b> (0. seviye) slot harcamaz, istediğin kadar kullanılır.{' '}
        <b>1. seviye büyüler</b> ise bir <b>spell slot</b> (büyü slotu) harcar — günlük bir kaynaktır ve Long Rest
        (uzun dinlenme) ile yenilenir. Burada hangi büyüleri <i>bildiğini</i> seçersin; slot sayın seviyene göre otomatik gelir.
      </Info>

      <div className="row" style={{ flexWrap: 'wrap', gap: 18 }}>
        <Stat label="Büyü Yeteneği" value={String(sc.spellcastingAbility)} />
        <Stat label="Büyü Kurtarma DC" value={String(sc.spellSaveDC)} />
        <Stat label="Büyü Saldırı Bonusu" value={sc.spellAttackBonus >= 0 ? `+${sc.spellAttackBonus}` : String(sc.spellAttackBonus)} />
      </div>

      {subclassSpells(character).length > 0 && (
        <Info>
          <b>Otomatik hazır büyüler</b> (alt sınıftan — hazırlama sayına dahil <b>değil</b>):{' '}
          {subclassSpells(character).map((s) => s.name).join(', ')}
        </Info>
      )}

      <div className="divider" />
      <SpellPicker title={`Cantrip'ler (0. seviye) — seçili: ${cantripSel.length} / ${limits.cantrips}`} spells={cantrips} selected={cantripSel} full={cantripsFull} onToggle={toggleCantrip} onInfo={setOpen} />

      <div className="divider" />
      <SpellPicker title={`1. Seviye Büyüler — seçili: ${lvl1Sel.length} / ${limits.level1Spells}`} spells={level1} selected={lvl1Sel} full={lvl1Full} onToggle={toggleLvl1} onInfo={setOpen} />

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
      <div style={{ fontSize: 20, fontFamily: 'var(--serif)', color: 'var(--gold-bright)' }}>{value}</div>
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
      <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginTop: 6 }}>
        {spells.map((s) => {
          const on = selected.includes(s.id)
          const disabled = !on && full
          return (
            <div key={s.id} className={`choice-card ${on ? 'selected' : ''}`} style={{ padding: 12, opacity: disabled ? 0.5 : 1 }}>
              <div className="spread">
                <b>{s.name}</b>
                <button className="badge" style={{ cursor: 'pointer' }} onClick={() => onInfo(s)}>
                  ⓘ
                </button>
              </div>
              <p className="hint" style={{ margin: '4px 0 8px' }}>
                {s.school}
              </p>
              <button className={`btn ${on ? 'btn-primary' : ''}`} style={{ width: '100%' }} disabled={disabled} onClick={() => onToggle(s.id)}>
                {on ? 'Seçili ✓' : 'Seç'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

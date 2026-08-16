// Irk/subrace/background'dan gelen seçmeli slotları (dil, tool, skill, cantrip)
// picker olarak sunar. Kullanıcı elle yazmaz; listeden seçer.
import { useState } from 'react'
import { config, spellsForClass } from '@/data'
import { LANGUAGES, collectChoiceSlots, baseLanguages, toolSlotOptions, DRACONIC_ANCESTRY, FIGHTING_STYLES, FAVORED_ENEMIES, TERRAINS, type ChoiceSlot } from '@/data/grants'
import { isSkillProficient } from '@/lib/rules'
import ItemCard from '@/components/equipment/ItemCard'
import ItemDetailModal from '@/components/equipment/ItemDetailModal'
import type { Item } from '@/types/data'
import { useChar } from './useChar'

const SKILL_KEYS = Object.keys(config.skills)

export default function GuidedChoices() {
  const { character, updateFn } = useChar()
  const slots = collectChoiceSlots(character)
  if (slots.length === 0) return null

  return (
    <div className="stack">
      <div className="divider" />
      <h3 style={{ fontSize: 18 }}>Seçmeli Kazanımlar</h3>
      <p className="hint">Irkın/geçmişin sana seçim hakkı verdi. Listeden seç — elle yazmana gerek yok.</p>
      {slots.map((slot) => (
        <SlotPicker key={slot.key} slot={slot} />
      ))}
    </div>
  )
}

function SlotPicker({ slot }: { slot: ChoiceSlot }) {
  const { character, updateFn } = useChar()

  if (slot.type === 'language') {
    const known = new Set([...baseLanguages(character.raceId)])
    // diğer dil slotlarındaki seçimleri de dışla
    for (const k of ['lang-race', 'lang-subrace', 'lang-bg', 'lang-favored-enemy']) if (k !== slot.key) (character.choiceSelections[k] ?? []).forEach((l) => known.add(l))
    const selected = character.choiceSelections[slot.key] ?? []
    const options = LANGUAGES.filter((l) => !known.has(l.name))
    return (
      <PickerBox slot={slot} count={selected.length}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {options.map((l) => {
            const on = selected.includes(l.name)
            const full = !on && selected.length >= slot.count
            return (
              <button key={l.id} className={`btn ${on ? 'btn-primary' : ''}`} disabled={full}
                onClick={() => updateFn((c) => toggleArr(c.choiceSelections, slot.key, l.name, slot.count))}>
                {l.name} <span className="hint">({l.nameTr})</span>
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  if (slot.type === 'tool') {
    return <ToolSlotPicker slot={slot} />
  }

  // Fighting Style — tek seçim
  if (slot.type === 'fighting-style') {
    const selected = character.choiceSelections[slot.key] ?? []
    const opts = (slot.options ?? []).map((id) => FIGHTING_STYLES[id]).filter(Boolean)
    return (
      <PickerBox slot={slot} count={selected.length}>
        <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {opts.map((st) => {
            const on = selected.includes(st.id)
            return (
              <button key={st.id} className={`choice-card ${on ? 'selected' : ''}`} style={{ textAlign: 'left', padding: 12 }}
                onClick={() => updateFn((c) => { c.choiceSelections[slot.key] = on ? [] : [st.id] })}>
                <b>{st.name}</b> <span className="hint">({st.nameTr})</span>
                <p className="hint" style={{ margin: '4px 0 0' }}>{st.desc}</p>
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  // Expertise — sahip olunan proficiency'lerden count kadar seç (çift proficiency)
  if (slot.type === 'expertise') {
    const selected = character.choiceSelections[slot.key] ?? []
    const profSkills = SKILL_KEYS.filter((s) => isSkillProficient(character, s))
    const options: { id: string; label: string }[] = profSkills.map((s) => ({ id: s, label: config.skillsTr[s] }))
    if (slot.toolOption) options.push({ id: slot.toolOption, label: "Thieves' Tools" })
    return (
      <PickerBox slot={slot} count={selected.length}>
        {slot.help && <p className="hint" style={{ marginTop: 0 }}>{slot.help}</p>}
        {options.length === 0 ? (
          <p className="hint">Önce beceri (skill) seçimlerini tamamla — Expertise yalnızca sahip olduğun proficiency'lerden seçilir.</p>
        ) : (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {options.map((o) => {
              const on = selected.includes(o.id)
              const full = !on && selected.length >= slot.count
              return (
                <button key={o.id} className={`btn ${on ? 'btn-primary' : ''}`} disabled={full}
                  onClick={() => updateFn((c) => toggleArr(c.choiceSelections, slot.key, o.id, slot.count))}>
                  {o.label}
                </button>
              )
            })}
          </div>
        )}
      </PickerBox>
    )
  }

  // Alt sınıf beceri/expertise grantı — sabit listeden count kadar skill seç
  if (slot.type === 'skill-grant' || slot.type === 'expertise-grant') {
    const selected = character.choiceSelections[slot.key] ?? []
    const options = slot.options ?? []
    return (
      <PickerBox slot={slot} count={selected.length}>
        {slot.help && <p className="hint" style={{ marginTop: 0 }}>{slot.help}</p>}
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {options.map((s) => {
            const on = selected.includes(s)
            const full = !on && selected.length >= slot.count
            return (
              <button key={s} className={`btn ${on ? 'btn-primary' : ''}`} disabled={full}
                onClick={() => updateFn((c) => toggleArr(c.choiceSelections, slot.key, s, slot.count))}>
                {config.skillsTr[s] ?? s}
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  // Alt sınıf cantrip grantı (Nature domain: druid listesinden) — choiceSelections'a yazılır
  if (slot.type === 'grant-cantrip') {
    const cantrips = spellsForClass(slot.from ?? '').filter((s) => s.level === 0)
    const selected = character.choiceSelections[slot.key] ?? []
    return (
      <PickerBox slot={slot} count={selected.length}>
        {slot.help && <p className="hint" style={{ marginTop: 0 }}>{slot.help}</p>}
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {cantrips.map((sp) => {
            const on = selected.includes(sp.id)
            const full = !on && selected.length >= slot.count
            return (
              <button key={sp.id} className={`btn ${on ? 'btn-primary' : ''}`} disabled={full}
                onClick={() => updateFn((c) => toggleArr(c.choiceSelections, slot.key, sp.id, slot.count))}>
                {sp.name}
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  // Favored Enemy / Natural Explorer (terrain) — tek seçim, isimli liste
  if (slot.type === 'favored-enemy' || slot.type === 'terrain') {
    const list = slot.type === 'favored-enemy' ? FAVORED_ENEMIES : TERRAINS
    const selected = character.choiceSelections[slot.key] ?? []
    return (
      <PickerBox slot={slot} count={selected.length}>
        {slot.help && <p className="hint" style={{ marginTop: 0 }}>{slot.help}</p>}
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {list.map((o) => {
            const on = selected.includes(o.id)
            return (
              <button key={o.id} className={`btn ${on ? 'btn-primary' : ''}`}
                onClick={() => updateFn((c) => { c.choiceSelections[slot.key] = on ? [] : [o.id] })}>
                {o.name} <span className="hint">({o.nameTr})</span>
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  if (slot.type === 'ancestry') {
    // tek seçim (radyo): seçilen ejderha türü choiceSelections'a tek eleman olarak yazılır
    const selected = character.choiceSelections[slot.key] ?? []
    return (
      <PickerBox slot={slot} count={selected.length}>
        {slot.help && <p className="hint" style={{ marginTop: 0 }}>{slot.help}</p>}
        <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {DRACONIC_ANCESTRY.map((d) => {
            const on = selected.includes(d.id)
            return (
              <button key={d.id} className={`choice-card ${on ? 'selected' : ''}`} style={{ textAlign: 'left', padding: 12 }}
                onClick={() => updateFn((c) => { c.choiceSelections[slot.key] = on ? [] : [d.id] })}>
                <b>{d.name}</b> <span className="hint">({d.nameTr})</span>
                <p className="hint" style={{ margin: '4px 0 0' }}>Direnç: {d.damageType} ({d.damageTypeTr})</p>
                <p className="hint" style={{ margin: '2px 0 0' }}>Breath: {d.breath}</p>
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  if (slot.type === 'skill') {
    // sınıf/geçmişten zaten proficient olanları hariç tut
    const selected = character.raceExtraSkills
    return (
      <PickerBox slot={slot} count={selected.length}>
        <div className="choice-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {SKILL_KEYS.map((s) => {
            const alreadyProf = Boolean(character.skills[s]?.proficient) && !selected.includes(s)
            const on = selected.includes(s)
            const full = !on && selected.length >= slot.count
            return (
              <button key={s} className={`btn ${on ? 'btn-primary' : ''}`} disabled={alreadyProf || full}
                style={{ opacity: alreadyProf ? 0.4 : 1, justifyContent: 'flex-start' }}
                onClick={() => updateFn((c) => {
                  const i = c.raceExtraSkills.indexOf(s)
                  if (i >= 0) c.raceExtraSkills.splice(i, 1)
                  else if (c.raceExtraSkills.length < slot.count) c.raceExtraSkills.push(s)
                })}>
                {config.skillsTr[s]} {alreadyProf ? '(zaten var)' : ''}
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  if (slot.type === 'cantrip') {
    const cantrips = spellsForClass(slot.from ?? '').filter((s) => s.level === 0)
    const selected = character.raceCantripIds
    return (
      <PickerBox slot={slot} count={selected.length}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {cantrips.map((sp) => {
            const on = selected.includes(sp.id)
            const full = !on && selected.length >= slot.count
            return (
              <button key={sp.id} className={`btn ${on ? 'btn-primary' : ''}`} disabled={full}
                onClick={() => updateFn((c) => {
                  const i = c.raceCantripIds.indexOf(sp.id)
                  if (i >= 0) c.raceCantripIds.splice(i, 1)
                  else if (c.raceCantripIds.length < slot.count) c.raceCantripIds.push(sp.id)
                })}>
                {sp.name}
              </button>
            )
          })}
        </div>
      </PickerBox>
    )
  }

  return null
}

// Alet seçimi: düz buton yerine kart + "Detay ⓘ" — yeni oyuncu aletin ne olduğunu
// ve ne işe yaradığını (Xanathar alet rehberi) modalda okuyabilsin.
function ToolSlotPicker({ slot }: { slot: ChoiceSlot }) {
  const { character, updateFn } = useChar()
  const [detail, setDetail] = useState<Item | null>(null)
  const selected = character.choiceSelections[slot.key] ?? []
  const options = toolSlotOptions(slot)

  return (
    <PickerBox slot={slot} count={selected.length}>
      {slot.help && <p className="hint" style={{ marginTop: 0 }}>{slot.help}</p>}
      <div className="item-grid">
        {options.map((item) => {
          const on = selected.includes(item.id)
          const full = !on && selected.length >= slot.count
          return (
            <ItemCard
              key={item.id}
              item={item}
              selected={on}
              disabled={full}
              onSelect={() => updateFn((c) => toggleArr(c.choiceSelections, slot.key, item.id, slot.count))}
              onDetail={() => setDetail(item)}
            />
          )
        })}
      </div>
      <ItemDetailModal item={detail} onClose={() => setDetail(null)} />
    </PickerBox>
  )
}

function PickerBox({ slot, count, children }: { slot: ChoiceSlot; count: number; children: React.ReactNode }) {
  const done = count >= slot.count
  return (
    <div className="panel" style={{ padding: 14, borderColor: done ? 'var(--line)' : 'var(--maroon-bright)' }}>
      <div className="spread" style={{ marginBottom: 8 }}>
        <label style={{ margin: 0 }}>{slot.label}</label>
        <span className={done ? 'badge badge-new' : 'badge'}>
          {count}/{slot.count} {done ? '✓' : 'seç'}
        </span>
      </div>
      {children}
    </div>
  )
}

function toggleArr(obj: Record<string, string[]>, key: string, val: string, max: number) {
  const arr = obj[key] ?? (obj[key] = [])
  const i = arr.indexOf(val)
  if (i >= 0) arr.splice(i, 1)
  else if (arr.length < max) arr.push(val)
}

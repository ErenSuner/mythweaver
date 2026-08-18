import { classById, raceById } from '@/data'
import { ABILITIES, type Ability } from '@/types/data'
import {
  armorClass,
  passivePerception,
  initiative,
  savingThrowModifier,
  proficiencyBonus,
  formatMod,
} from '@/lib/rules'
import type { AdminCharacterRow } from '@/lib/admin-storage'

// DM tek bakışta parti özeti: karta tıklamadan AC/HP/save/passive.
export default function PartyStatTable({ rows }: { rows: AdminCharacterRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="panel" style={{ overflowX: 'auto', padding: 0 }}>
      <table className="party-stat-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, whiteSpace: 'nowrap' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--ink-dim)' }}>
            <Th>Karakter</Th>
            <Th>Irk · Sınıf · Sv</Th>
            <Th center>AC</Th>
            <Th center>HP</Th>
            <Th center>PB</Th>
            <Th center>Init</Th>
            <Th center>Algı</Th>
            {ABILITIES.map((a) => (
              <Th key={a} center>{a}</Th>
            ))}
            <Th center>Büyü DC</Th>
            <Th center>Hız</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const c = row.character
            const race = raceById(c.raceId)
            const klass = classById(c.classId)
            const dc = c.spellcasting?.spellSaveDC
            const draft = !c.completed
            return (
              <tr key={c.id} style={{ borderTop: '1px solid var(--line)', opacity: draft ? 0.6 : 1 }}>
                <Td>
                  <b>{c.characterName || 'İsimsiz Kahraman'}</b>
                  {draft && <span className="badge" style={{ marginLeft: 6 }}>taslak</span>}
                </Td>
                <Td muted>{race?.name ?? '—'} · {klass?.name ?? '—'} · {c.level}</Td>
                <Td center><b>{armorClass(c)}</b></Td>
                <Td center>
                  {c.currentHp}/{c.maxHp}
                  {c.tempHp > 0 && <span className="hint"> +{c.tempHp}</span>}
                </Td>
                <Td center>{formatMod(proficiencyBonus(c.level))}</Td>
                <Td center>{formatMod(initiative(c))}</Td>
                <Td center>{passivePerception(c)}</Td>
                {ABILITIES.map((a: Ability) => (
                  <Td key={a} center>{formatMod(savingThrowModifier(c, a))}</Td>
                ))}
                <Td center>{dc != null ? dc : '—'}</Td>
                <Td center>{c.speed}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <th style={{ padding: '10px 12px', textAlign: center ? 'center' : 'left', fontWeight: 600 }}>{children}</th>
}
function Td({ children, center, muted }: { children: React.ReactNode; center?: boolean; muted?: boolean }) {
  return (
    <td className={muted ? 'muted' : undefined} style={{ padding: '9px 12px', textAlign: center ? 'center' : 'left' }}>
      {children}
    </td>
  )
}

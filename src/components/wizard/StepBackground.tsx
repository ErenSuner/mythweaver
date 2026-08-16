import { useState } from 'react'
import { backgrounds, backgroundById } from '@/data'
import { Info } from '@/components/ui'
import DiceRollModal from '@/components/DiceRollModal'
import RuleText from '@/components/RuleText'
import { useChar } from './useChar'
import type { DiceRow } from '@/types/data'

type PersonalityField = 'personalityTraits' | 'ideals' | 'bonds' | 'flaws'

export default function StepBackground() {
  const { character, update } = useChar()
  const bg = backgroundById(character.backgroundId)
  // hangi alanlara kullanıcı elle dokundu (uyarı için)
  const [manual, setManual] = useState<Record<PersonalityField, boolean>>({
    personalityTraits: false,
    ideals: false,
    bonds: false,
    flaws: false,
  })

  return (
    <div className="stack">
      <Info>
        <b>Geçmiş (Background)</b>, karakterinin maceracı olmadan önce kim olduğunu anlatır. Beceri/araç/dil
        yeterlilikleri, başlangıç ekipmanı ve özel bir yetenek kazandırır. Ayrıca kişiliğini şekillendirir.
      </Info>

      <div className="choice-grid">
        {backgrounds.map((b) => (
          <button
            key={b.id}
            className={`choice-card ${character.backgroundId === b.id ? 'selected' : ''}`}
            onClick={() => update({ backgroundId: b.id })}
          >
            <h3>{b.name}</h3>
            <span className="tr">{b.nameTr}</span>
            <p>{b.skillProficiencies || b.description.slice(0, 90)}</p>
          </button>
        ))}
      </div>

      {bg && (
        <div className="panel" style={{ background: 'var(--panel-solid)' }}>
          <h2 style={{ fontSize: 20 }}>{bg.name}</h2>
          <p className="muted">{bg.description}</p>
          <div className="divider" />
          <Field label="Beceri Yeterlilikleri" value={bg.skillProficiencies} />
          <Field label="Diller" value={bg.languages} />
          <Field label="Araç Yeterlilikleri" value={bg.toolProficiencies} />
          <Field label="Ekipman" value={bg.equipment} />
          {bg.feature && (
            <>
              <div className="divider" />
              <Field label={`Özellik: ${bg.feature.name}`} value={bg.feature.description} />
            </>
          )}

          <div className="divider" />
          <h3 style={{ fontSize: 17 }}>Kişilik</h3>
          <p className="hint">
            Her biri için zar at (kendi tablosundan rastgele) ya da kendi metnini yaz. Zar, kutudaki yazıyı
            değiştirir.
          </p>
          {(
            [
              ['personalityTraits', 'Personality Traits (Kişilik)', bg.personalityTraits],
              ['ideals', 'Ideals (Ülküler)', bg.ideals],
              ['bonds', 'Bonds (Bağlar)', bg.bonds],
              ['flaws', 'Flaws (Kusurlar)', bg.flaws],
            ] as [PersonalityField, string, DiceRow[]][]
          ).map(([field, label, rows]) => (
            <DicePick
              key={field}
              label={label}
              backgroundName={bg.name}
              rows={rows}
              value={character[field]}
              overwriteWarning={manual[field] && character[field].trim().length > 0}
              onType={(v) => {
                setManual((m) => ({ ...m, [field]: v.trim().length > 0 }))
                update({ [field]: v })
              }}
              onRoll={(v) => {
                setManual((m) => ({ ...m, [field]: false }))
                update({ [field]: v })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div style={{ marginTop: 8 }}>
      <label>{label}</label>
      <RuleText>{value}</RuleText>
    </div>
  )
}

function DicePick({
  label,
  backgroundName,
  rows,
  value,
  overwriteWarning,
  onType,
  onRoll,
}: {
  label: string
  backgroundName: string
  rows: DiceRow[]
  value: string
  overwriteWarning: boolean
  onType: (v: string) => void
  onRoll: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 14 }}>
      <div className="spread">
        <label>{label}</label>
        {rows.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
            🎲 Zar at ({rows.length})
          </button>
        )}
      </div>
      <textarea value={value} onChange={(e) => onType(e.target.value)} placeholder="Kendi metnini yaz ya da zar at…" />
      <DiceRollModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        subtitle={`${backgroundName} — d${rows.length} tablosu. Zar at ya da beğendiğin satıra tıkla.`}
        rows={rows}
        overwriteWarning={overwriteWarning}
        onAccept={(text) => {
          onRoll(text)
          setOpen(false)
        }}
      />
    </div>
  )
}

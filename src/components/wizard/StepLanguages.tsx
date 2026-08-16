import { Info } from '@/components/ui'
import { useChar } from './useChar'
import { innateCantripFor } from '@/data/grants'
import GuidedChoices from './GuidedChoices'

export default function StepLanguages() {
  const { character } = useChar()
  const innate = innateCantripFor(character)

  return (
    <div className="stack">
      <Info>
        <b>Diller &amp; Yeterlilikler</b> ırk, sınıf ve geçmişinden otomatik toplanır. Seçim gereken yerler aşağıda
        picker olarak çıkar — elle bir şey yazmana gerek yok.
      </Info>

      {/* otomatik derlenen özet */}
      <div>
        <label>Other Proficiencies &amp; Languages (otomatik)</label>
        <div className="panel" style={{ background: 'var(--panel-solid)', whiteSpace: 'pre-wrap' }}>
          {character.otherProficienciesLanguages || '—'}
        </div>
      </div>

      {innate && (
        <div className="info">
          Alt ırkından gelen ücretsiz cantrip: <b>{innate}</b> (otomatik biliniyorsun).
        </div>
      )}

      {/* seçmeli slotlar */}
      <GuidedChoices />
    </div>
  )
}

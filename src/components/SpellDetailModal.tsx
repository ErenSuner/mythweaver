// Bir büyünün tam künyesi: seviye, okul, menzil, süre, bileşenler, kural metni.
// Hem büyü seçme adımında (StepSpells) hem karakter sayfasında (CharacterCard) kullanılır.
import { Modal } from '@/components/Modal'
import RuleText from '@/components/RuleText'
import type { Spell } from '@/types/data'

export default function SpellDetailModal({ spell, onClose }: { spell: Spell | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(spell)}
      onClose={onClose}
      wide
      title={spell?.name}
      subtitle={spell ? `${spell.school} · ${spell.castingTime} · ${spell.range} · ${spell.duration}` : undefined}
    >
      {spell && (
        <>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <span className="badge">{spell.level === 0 ? 'Cantrip' : `${spell.level}. seviye`}</span>
            <span className="badge">Bileşenler: {spell.components}</span>
          </div>
          <RuleText>{spell.description}</RuleText>
        </>
      )}
    </Modal>
  )
}

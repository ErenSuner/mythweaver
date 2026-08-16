// Jargon terimi künyesi — RuleText içinde tıklanan sözlük terimini gösterir.
import { Modal } from '@/components/Modal'
import type { GlossaryTerm } from '@/data/glossary'

export default function GlossaryModal({ term, onClose }: { term: GlossaryTerm | null; onClose: () => void }) {
  if (!term) return null
  return (
    <Modal open onClose={onClose} title={term.term} subtitle={term.tr}>
      <p style={{ color: 'var(--ink-dim)', fontSize: 15, margin: 0 }}>{term.description}</p>
    </Modal>
  )
}

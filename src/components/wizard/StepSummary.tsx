import { Info } from '@/components/ui'
import { useChar } from './useChar'
import CharacterCard from '@/components/sheet/CharacterCard'

export default function StepSummary() {
  const { character } = useChar()
  return (
    <div className="stack">
      <Info>
        İşte efsanen! Aşağıda tüm seçimlerin resmi karakter sayfasına sadık şekilde toplandı. "Tamamla" dediğinde
        karakter kaydedilir; kartından düzenleyebilir, seviye atlatabilir ve JSON olarak dışa aktarabilirsin.
      </Info>
      <CharacterCard character={character} />
    </div>
  )
}

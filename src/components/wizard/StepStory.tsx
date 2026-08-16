import { Info } from '@/components/ui'
import { useChar } from './useChar'

export default function StepStory() {
  const { character, update } = useChar()
  return (
    <div className="stack">
      <Info>
        Kişilik ayrıntıların (geçmiş adımından geldi — burada düzenleyebilirsin) ve hikayen. Bu alanlar karakterini
        canlandırmanı kolaylaştırır.
      </Info>

      <Area label="Personality Traits (Kişilik Özellikleri)" value={character.personalityTraits} onChange={(v) => update({ personalityTraits: v })} />
      <Area label="Ideals (Ülküler)" value={character.ideals} onChange={(v) => update({ ideals: v })} />
      <Area label="Bonds (Bağlar)" value={character.bonds} onChange={(v) => update({ bonds: v })} />
      <Area label="Flaws (Kusurlar)" value={character.flaws} onChange={(v) => update({ flaws: v })} />

      <div className="divider" />

      <Area label="Character Backstory (Hikaye)" value={character.backstory} onChange={(v) => update({ backstory: v })} big />
      <Area label="Allies & Organizations (Müttefikler)" value={character.allies} onChange={(v) => update({ allies: v })} />
      <div>
        <label>Faction / Organizasyon Adı</label>
        <input type="text" value={character.factionName} onChange={(e) => update({ factionName: e.target.value })} />
      </div>
      <Area label="Treasure (Hazine)" value={character.treasure} onChange={(v) => update({ treasure: v })} />
      <Area label="Additional Features & Traits (Ek Özellikler)" value={character.additionalFeatures} onChange={(v) => update({ additionalFeatures: v })} />
    </div>
  )
}

function Area({ label, value, onChange, big }: { label: string; value: string; onChange: (v: string) => void; big?: boolean }) {
  return (
    <div>
      <label>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} style={big ? { minHeight: 140 } : undefined} />
    </div>
  )
}

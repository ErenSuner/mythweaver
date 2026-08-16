import { Info } from '@/components/ui'
import { useChar } from './useChar'

// Hizalama: iki eksen — Düzen (Lawful↔Chaotic) ve Ahlak (Good↔Evil).
const ALIGNMENTS: { value: string; tr: string }[] = [
  { value: 'Lawful Good', tr: 'Kurala bağlı ve iyi niyetli — onurlu kahraman.' },
  { value: 'Neutral Good', tr: 'İyiliği kural kaygısı olmadan yapar — yardımsever.' },
  { value: 'Chaotic Good', tr: 'Özgür ruhlu ama iyi kalpli — asi kahraman.' },
  { value: 'Lawful Neutral', tr: 'Düzene ve koda sadık; iyi/kötü ikincil — yargıç, asker.' },
  { value: 'True Neutral', tr: 'Dengeyi korur, uçlardan kaçınır — tarafsız.' },
  { value: 'Chaotic Neutral', tr: 'Kendi özgürlüğünü her şeyin üstünde tutar — bağımsız.' },
  { value: 'Lawful Evil', tr: 'Kuralları ve gücü bencilce kullanır — hesaplı zorba.' },
  { value: 'Neutral Evil', tr: 'Çıkarına olanı yapar, vicdan tanımaz — fırsatçı.' },
  { value: 'Chaotic Evil', tr: 'Yıkım ve bencillikten beslenir — kaos ve zulüm.' },
]

export default function StepIdentity() {
  const { character, update } = useChar()
  const T = (k: keyof typeof character) => (character[k] as string) || ''

  return (
    <div className="stack">
      <Info>Karakterinin dış görünüşü ve kimliği. Bu alanlar hikaye içindir; mekanik etkisi yoktur.</Info>

      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: '1 1 240px' }}>
          <label>Karakter Adı</label>
          <input type="text" value={T('characterName')} onChange={(e) => update({ characterName: e.target.value })} />
        </div>
        <div style={{ flex: '1 1 240px' }}>
          <label>Oyuncu Adı (Player Name)</label>
          <input type="text" value={T('playerName')} onChange={(e) => update({ playerName: e.target.value })} />
        </div>
      </div>

      <div>
        <label>Alignment (Hizalama)</label>
        <p className="hint" style={{ margin: '2px 0 6px' }}>
          Karakterinin ahlaki pusulası — iki eksen: <b>Düzen</b> (Lawful=kurallı ↔ Chaotic=özgür, arada Neutral) ve{' '}
          <b>Ahlak</b> (Good=iyi ↔ Evil=kötü, arada Neutral). İkisini birleştir. Sadece rol yapma rehberidir; mekanik
          etkisi yoktur.
        </p>
        <select value={character.alignment} onChange={(e) => update({ alignment: e.target.value })}>
          <option value="">— seç —</option>
          {ALIGNMENTS.map((a) => (
            <option key={a.value} value={a.value} title={a.tr}>
              {a.value} — {a.tr}
            </option>
          ))}
        </select>
        {character.alignment && (
          <p className="hint" style={{ marginTop: 6 }}>
            {ALIGNMENTS.find((a) => a.value === character.alignment)?.tr}
          </p>
        )}
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
        {(['age', 'height', 'weight', 'eyes', 'skin', 'hair'] as const).map((k) => (
          <div key={k} style={{ flex: '1 1 140px' }}>
            <label>{LABELS[k]}</label>
            <input type="text" value={T(k)} onChange={(e) => update({ [k]: e.target.value })} />
          </div>
        ))}
      </div>

      <div>
        <label>Görünüm (Character Appearance)</label>
        <textarea value={T('appearance')} onChange={(e) => update({ appearance: e.target.value })} />
      </div>
    </div>
  )
}

const LABELS: Record<string, string> = {
  age: 'Yaş (Age)',
  height: 'Boy (Height)',
  weight: 'Ağırlık (Weight)',
  eyes: 'Göz (Eyes)',
  skin: 'Ten (Skin)',
  hair: 'Saç (Hair)',
}

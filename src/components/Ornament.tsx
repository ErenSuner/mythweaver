/* Filigree ornament katmanı — tezhipli çerçevenin köşe ve ayraç glyph'leri.
   currentColor kullanır, yani iki temada da yaldız rengini bedavaya alır.

   Kullanım:
     <div className="panel artifact"><Corners />…</div>
     <div className="choice-card artifact-sm"><Corners only={['tl', 'br']} />…</div>
     <Flourish />

   Kısıt: sadece "eser" yüzeylerinde. Uzun formlarda ve DM panelinde yok. */

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const ALL: Corner[] = ['tl', 'tr', 'bl', 'br']

/** Tek köşe: dış braket + iç paralel braket + filigree kıvrım + yaprak. */
function CornerGlyph({ at }: { at: Corner }) {
  return (
    <svg className={`orn orn-${at}`} viewBox="0 0 54 54" aria-hidden="true" focusable="false">
      <path d="M1.5 30 V8 Q1.5 1.5 8 1.5 H30" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 34 V15 Q8 8 15 8 H34" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />
      <path
        d="M15 40 C15 27 23 19 34 19 C41 19 45 24 45 29 C45 33.5 41.5 36.5 37.5 36.5 C34.5 36.5 32.5 34.5 32.5 32 C32.5 30 34 28.5 36 28.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path d="M12 12 C21 11 28 16 30.5 24 C22 24.5 14.5 20 12 12 Z" fill="currentColor" opacity="0.22" />
      <circle cx="37" cy="32" r="1.5" fill="currentColor" />
    </svg>
  )
}

/** Köşe ornamentleri. Kapsayıcıda .artifact ya da .artifact-sm olmalı. */
export function Corners({ only = ALL }: { only?: Corner[] }) {
  return (
    <>
      {only.map((c) => (
        <CornerGlyph key={c} at={c} />
      ))}
    </>
  )
}

/** Yatay ayraç: iki kıvrım arasında elmas. Bölüm sonu / başlık altı. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `flourish ${className}` : 'flourish'}
      viewBox="0 0 190 16"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 8 H74" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M116 8 H190" stroke="currentColor" strokeWidth="1" fill="none" />
      <path
        d="M74 8 C80 8 82 2.5 88 2.5 C92 2.5 94 5 95 8 C94 11 92 13.5 88 13.5 C82 13.5 80 8 74 8 Z"
        fill="currentColor"
        opacity="0.32"
      />
      <path
        d="M116 8 C110 8 108 2.5 102 2.5 C98 2.5 96 5 95 8 C96 11 98 13.5 102 13.5 C108 13.5 110 8 116 8 Z"
        fill="currentColor"
        opacity="0.32"
      />
      <path d="M95 3.2 L98.6 8 L95 12.8 L91.4 8 Z" fill="currentColor" />
    </svg>
  )
}

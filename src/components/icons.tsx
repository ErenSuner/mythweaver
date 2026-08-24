import type { SVGProps } from 'react'

/* İnce-çizgili, currentColor ikon seti. Temaya (D&D editöryel) uygun landmark glyph'ler.
   Kullanım: <Icon name="campaign" size={18} /> ya da doğrudan <CampaignIcon /> */

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 20, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }
}

// Karakterler — miğfer / kahraman
export function CharactersIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 11a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-1v-4M4 11v5a2 2 0 0 0 2 2h1v-4" />
      <path d="M4 11h16M12 3v8" />
    </svg>
  )
}

// Campaign — sancak / bayrak
export function CampaignIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 3v18" />
      <path d="M6 4h11l-2.2 3.5L17 11H6" />
    </svg>
  )
}

// DM — taç
export function DmIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.5 10h-13L4 8Z" />
      <path d="M5.5 18h13" />
    </svg>
  )
}

// Evren — küre
export function UniverseIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9S14.5 18.5 12 21c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  )
}

// Ayarlar — dişli
export function SettingsIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  )
}

// Çıkış
export function LogoutIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" />
    </svg>
  )
}

// Yeni / ekle
export function PlusIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// d20 — marka amblemi
export function DiceIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 2 3 7.2v9.6L12 22l9-5.2V7.2L12 2Z" />
      <path d="M12 2v6.5M12 8.5 4 6M12 8.5 20 6M12 8.5l-5 5.5m5-5.5 5 5.5M7 14l5 8m5-8-5 8M7 14l-4-2.5M17 14l4-2.5M7 14h10" />
    </svg>
  )
}

// Gun isigi — gunes (Scriptorium).
// Not: once pencere denendi; 24'luk kutuda kenarlara dayanan dikdortgen
// 17px'te eksik-glyph kutusuna benziyordu. Okunabilirlik once gelir.
export function DaylightIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22" />
      <path d="M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
    </svg>
  )
}

// Mum isigi — yanan mum (Grimoire)
export function CandleIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 2.5c1.9 2.1 2.8 3.5 2.8 4.9a2.8 2.8 0 0 1-5.6 0c0-1.4.9-2.8 2.8-4.9Z" />
      <rect x="8.5" y="11" width="7" height="10.5" rx="1" />
      <path d="M12 11v-.8" />
    </svg>
  )
}

// Duzenle — kalem
export function EditIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  )
}

// Oyuncular — iki figur
export function PlayersIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1.2A4.8 4.8 0 0 1 7.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V20" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 5.6M17.5 14h.7a3.8 3.8 0 0 1 3.8 3.8V20" opacity="0.6" />
    </svg>
  )
}

// Sil — kutu
export function TrashIcon(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h16M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12" />
    </svg>
  )
}

const REGISTRY = {
  characters: CharactersIcon,
  campaign: CampaignIcon,
  dm: DmIcon,
  universe: UniverseIcon,
  settings: SettingsIcon,
  logout: LogoutIcon,
  plus: PlusIcon,
  dice: DiceIcon,
  daylight: DaylightIcon,
  candle: CandleIcon,
  edit: EditIcon,
  players: PlayersIcon,
  trash: TrashIcon,
}

export type IconName = keyof typeof REGISTRY

export function Icon({ name, ...rest }: IconProps & { name: IconName }) {
  const Cmp = REGISTRY[name]
  return <Cmp {...rest} />
}

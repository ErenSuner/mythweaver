// Geçmiş (background) başlangıç ekipmanı + altını — backgrounds.json'daki serbest
// Türkçe metnin yapılandırılmış hâli. Altın buradan otomatik gelir; kullanıcı
// hiçbir yere elle altın yazmaz.
import type { EquipChoice, EquipPick, Grant } from './starting-equipment'

export interface BackgroundStartingEquipment {
  /** kemer çantasındaki altın (gp) */
  gold: number
  fixed: Grant[]
  choices?: EquipChoice[]
  /** koşulsuz ama listeden seçilecek eşyalar (ör. "seçtiğin bir müzik aleti") */
  fixedPicks?: (EquipPick & { id: string })[]
}

const anyInstrument = (id: string, label: string, help?: string): EquipPick & { id: string } => ({
  id,
  label,
  help,
  from: { kind: 'tool', toolGroup: 'instrument' },
  count: 1,
})
const anyArtisanTools = (id: string, label: string, help?: string): EquipPick & { id: string } => ({
  id,
  label,
  help,
  from: { kind: 'tool', toolGroup: 'artisan' },
  count: 1,
})

export const BACKGROUND_STARTING_EQUIPMENT: Record<string, BackgroundStartingEquipment> = {
  acolyte: {
    gold: 15,
    fixed: [
      { itemId: 'incense-stick', qty: 5 },
      { itemId: 'vestments-ceremonial' },
      { itemId: 'clothes-common' },
    ],
    choices: [
      {
        id: 'prayer-item',
        label: 'İbadet eşyan',
        options: [
          { id: 'a', label: 'Dua kitabı (Prayer book)', grants: [{ itemId: 'prayer-book' }] },
          { id: 'b', label: 'Dua çarkı (Prayer wheel)', grants: [{ itemId: 'prayer-wheel' }] },
        ],
      },
    ],
    fixedPicks: [
      {
        id: 'bg-holy-symbol',
        label: 'Göreve girişte hediye edilen kutsal sembolünü seç',
        from: { kind: 'ids', ids: ['holy-symbol-amulet', 'holy-symbol-emblem', 'holy-symbol-reliquary'] },
        count: 1,
      },
    ],
  },

  charlatan: {
    gold: 15,
    fixed: [{ itemId: 'clothes-fine' }, { itemId: 'disguise-kit' }, { itemId: 'fake-trinkets' }],
  },

  criminal: {
    gold: 15,
    fixed: [{ itemId: 'crowbar' }, { itemId: 'clothes-common' }, { itemId: 'thieves-tools' }],
    fixedPicks: [
      {
        id: 'bg-gaming-set',
        label: 'Oyun setini seç (yeterlilik kazanacaksın)',
        help: 'Oyun seti yeterliliği; kumar masasında hile yakalamaya, rakibin kişiliğini okumaya ve sosyal ortamda oyunu bahane olarak kullanmaya yarar.',
        from: { kind: 'tool', toolGroup: 'gaming' },
        count: 1,
      },
    ],
  },

  entertainer: {
    gold: 15,
    fixed: [{ itemId: 'clothes-costume' }, { itemId: 'fan-gift' }, { itemId: 'disguise-kit' }],
    fixedPicks: [anyInstrument('bg-instrument', 'Müzik aletini seç', 'Bu alette yeterlilik kazanırsın; Performance ve History kontrollerinde işine yarar.')],
  },

  'folk-hero': {
    gold: 10,
    fixed: [{ itemId: 'pot-iron' }, { itemId: 'clothes-common' }],
    fixedPicks: [
      anyArtisanTools('bg-artisan-tools', 'Zanaat aleti setini seç', 'Bu alette yeterlilik kazanırsın. Her zanaat aleti farklı beceriye avantaj ve özel bir kullanım verir.'),
    ],
  },

  'guild-artisan': {
    gold: 15,
    fixed: [{ itemId: 'guild-letter' }, { itemId: 'clothes-travelers' }],
    fixedPicks: [anyArtisanTools('bg-artisan-tools', 'Zanaat aleti setini seç', 'Loncanın uzmanlık alanı. Bu alette yeterlilik kazanırsın.')],
  },

  hermit: {
    gold: 5,
    fixed: [
      { itemId: 'scroll-case-notes' },
      { itemId: 'winter-blanket' },
      { itemId: 'clothes-common' },
      { itemId: 'herbalism-kit' },
    ],
  },

  noble: {
    gold: 25,
    fixed: [{ itemId: 'clothes-fine' }, { itemId: 'signet-ring' }, { itemId: 'pedigree-scroll' }],
    fixedPicks: [
      {
        id: 'bg-gaming-set',
        label: 'Oyun setini seç (yeterlilik kazanacaksın)',
        help: 'Soylular arasında oyun, sosyal bir silahtır: rakibi okumak ve masaya oturmak için bahane.',
        from: { kind: 'tool', toolGroup: 'gaming' },
        count: 1,
      },
    ],
  },

  outlander: {
    gold: 10,
    fixed: [
      { itemId: 'staff-walking' },
      { itemId: 'hunting-trap' },
      { itemId: 'animal-trophy' },
      { itemId: 'clothes-travelers' },
    ],
    fixedPicks: [anyInstrument('bg-instrument', 'Müzik aletini seç', 'Yolculukta çalınan bir alet; bu alette yeterlilik kazanırsın.')],
  },

  sage: {
    gold: 10,
    fixed: [
      { itemId: 'ink-1-ounce-bottle' },
      { itemId: 'ink-pen' },
      { itemId: 'small-knife' },
      { itemId: 'colleague-letter' },
      { itemId: 'clothes-common' },
    ],
  },

  sailor: {
    gold: 10,
    fixed: [
      { itemId: 'belaying-pin' },
      { itemId: 'rope-silk-50-feet' },
      { itemId: 'lucky-charm' },
      { itemId: 'clothes-common' },
      { itemId: 'navigators-tools' },
    ],
  },

  soldier: {
    gold: 10,
    fixed: [{ itemId: 'rank-insignia' }, { itemId: 'enemy-trophy' }, { itemId: 'clothes-common' }],
    fixedPicks: [
      {
        id: 'bg-gaming-set',
        label: 'Oyun setini seç (yeterlilik kazanacaksın)',
        help: 'Ordu kampında zar ve kart, askerin baş eğlencesidir.',
        from: { kind: 'tool', toolGroup: 'gaming' },
        count: 1,
      },
    ],
  },

  urchin: {
    gold: 10,
    fixed: [
      { itemId: 'small-knife' },
      { itemId: 'city-map' },
      { itemId: 'parent-token' },
      { itemId: 'clothes-common' },
      { itemId: 'disguise-kit' },
      { itemId: 'thieves-tools' },
    ],
  },
}

export const backgroundEquipmentFor = (bgId: string): BackgroundStartingEquipment | undefined => BACKGROUND_STARTING_EQUIPMENT[bgId]

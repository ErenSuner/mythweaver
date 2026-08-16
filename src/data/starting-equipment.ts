// Sınıf başlangıç ekipmanı — PHB'deki (a)/(b) seçimlerinin yapılandırılmış hâli.
// classes.json'daki serbest Türkçe metin ("herhangi bir savaş yakın dövüş silahı")
// burada gerçek bir eşya listesine (ItemFilter) bağlanır; kullanıcı listeden seçer,
// hiçbir şeyi elle yazmaz.
import { items, itemById } from '@/data'
import type { Item, ItemCategory, ToolGroup } from '@/types/data'

// ---- şema ----
export type ItemFilter =
  | { kind: 'weapon'; weaponClass?: 'simple' | 'martial'; weaponRange?: 'melee' | 'ranged' }
  | { kind: 'tool'; toolGroup: ToolGroup }
  | { kind: 'category'; category: ItemCategory }
  | { kind: 'ids'; ids: string[] }

export interface Grant {
  itemId: string
  qty?: number
}

/** Bir seçenek: ya sabit eşya(lar) verir ya da bir listeden seçtirir (ya da ikisi). */
export interface EquipOption {
  id: string
  label: string
  grants?: Grant[]
  pick?: EquipPick
}

export interface EquipPick {
  label: string
  help?: string
  from: ItemFilter
  count: number
  /** aynı eşyadan birden fazla seçilebilir mi (ör. "iki basit yakın dövüş silahı") */
  allowDuplicates?: boolean
}

export interface EquipChoice {
  id: string
  label: string
  help?: string
  options: EquipOption[]
}

export interface ClassStartingEquipment {
  /** (a)/(b) seçimleri */
  choices: EquipChoice[]
  /** koşulsuz verilen eşyalar */
  fixed: Grant[]
  /** koşulsuz ama listeden seçilmesi gereken eşyalar (ör. "bir kutsal sembol") */
  fixedPicks?: (EquipPick & { id: string })[]
}

// ---- filtre çözümü ----
export function resolveFilter(f: ItemFilter): Item[] {
  switch (f.kind) {
    case 'weapon':
      return items.filter(
        (i) =>
          i.category === 'weapon' &&
          (!f.weaponClass || i.weaponClass === f.weaponClass) &&
          (!f.weaponRange || i.weaponRange === f.weaponRange),
      )
    case 'tool':
      return items.filter((i) => i.category === 'tool' && i.toolGroup === f.toolGroup)
    case 'category':
      return items.filter((i) => i.category === f.category)
    case 'ids':
      return f.ids.map((id) => itemById(id)).filter((i): i is Item => Boolean(i))
  }
}

const ARCANE_FOCUS = ['arcane-focus-crystal', 'arcane-focus-orb', 'arcane-focus-rod', 'arcane-focus-staff', 'arcane-focus-wand']
const DRUIDIC_FOCUS = ['druidic-focus-sprig-of-mistletoe', 'druidic-focus-totem', 'druidic-focus-wooden-staff', 'druidic-focus-yew-wand']
const HOLY_SYMBOL = ['holy-symbol-amulet', 'holy-symbol-emblem', 'holy-symbol-reliquary']

const anyMartialMelee: EquipPick = {
  label: 'Bir savaş (martial) yakın dövüş silahı seç',
  help: 'Savaş silahları daha güçlü hasar verir ama yeterlilik ister — sınıfın tüm savaş silahlarını kullanabiliyor.',
  from: { kind: 'weapon', weaponClass: 'martial', weaponRange: 'melee' },
  count: 1,
}
const anyMartial: EquipPick = {
  label: 'Bir savaş (martial) silahı seç',
  from: { kind: 'weapon', weaponClass: 'martial' },
  count: 1,
}
const anySimple: EquipPick = {
  label: 'Bir basit (simple) silah seç',
  help: 'Basit silahlar herkesin kolayca kullanabildiği temel silahlardır.',
  from: { kind: 'weapon', weaponClass: 'simple' },
  count: 1,
}
const anySimpleMelee: EquipPick = {
  label: 'Bir basit (simple) yakın dövüş silahı seç',
  from: { kind: 'weapon', weaponClass: 'simple', weaponRange: 'melee' },
  count: 1,
}

// ---- sınıf tabloları ----
export const CLASS_STARTING_EQUIPMENT: Record<string, ClassStartingEquipment> = {
  barbarian: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Ana yakın dövüş silahın',
        options: [
          { id: 'a', label: 'Büyük balta (Greataxe)', grants: [{ itemId: 'greataxe' }] },
          { id: 'b', label: 'Herhangi bir savaş yakın dövüş silahı', pick: anyMartialMelee },
        ],
      },
      {
        id: 'side-weapon',
        label: 'İkincil silahın',
        options: [
          { id: 'a', label: 'İki el baltası (2× Handaxe)', grants: [{ itemId: 'handaxe', qty: 2 }] },
          { id: 'b', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
    ],
    fixed: [{ itemId: 'explorers-pack' }, { itemId: 'javelin', qty: 4 }],
  },

  bard: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Silahın',
        options: [
          { id: 'a', label: 'Pala (Rapier)', grants: [{ itemId: 'rapier' }] },
          { id: 'b', label: 'Uzun kılıç (Longsword)', grants: [{ itemId: 'longsword' }] },
          { id: 'c', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Diplomat çantası (Diplomat's Pack)", grants: [{ itemId: 'diplomats-pack' }] },
          { id: 'b', label: "Eğlendirici çantası (Entertainer's Pack)", grants: [{ itemId: 'entertainers-pack' }] },
        ],
      },
      {
        id: 'instrument',
        label: 'Müzik aletin',
        help: 'Bard için müzik aleti aynı zamanda büyü odağıdır (spellcasting focus).',
        options: [
          { id: 'a', label: 'Lut (Lute)', grants: [{ itemId: 'lute' }] },
          {
            id: 'b',
            label: 'Başka bir müzik aleti',
            pick: { label: 'Müzik aletini seç', from: { kind: 'tool', toolGroup: 'instrument' }, count: 1 },
          },
        ],
      },
    ],
    fixed: [{ itemId: 'leather' }, { itemId: 'dagger' }],
  },

  cleric: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Silahın',
        options: [
          { id: 'a', label: 'Gürz (Mace)', grants: [{ itemId: 'mace' }] },
          { id: 'b', label: 'Savaş çekici (Warhammer) — yalnızca yeterliliğin varsa', grants: [{ itemId: 'warhammer' }] },
        ],
      },
      {
        id: 'armor',
        label: 'Zırhın',
        options: [
          { id: 'a', label: 'Pullu zırh (Scale mail) — AC 14 + Dex (maks 2)', grants: [{ itemId: 'scale-mail' }] },
          { id: 'b', label: 'Deri zırh (Leather) — AC 11 + Dex', grants: [{ itemId: 'leather' }] },
          { id: 'c', label: 'Zincir zırh (Chain mail) — AC 16, yalnızca ağır zırh yeterliliğin varsa', grants: [{ itemId: 'chain-mail' }] },
        ],
      },
      {
        id: 'ranged',
        label: 'Menzilli seçeneğin',
        options: [
          {
            id: 'a',
            label: 'Hafif arbalet + 20 ok (Light crossbow & 20 bolts)',
            grants: [{ itemId: 'crossbow-light' }, { itemId: 'ammunition-crossbow-bolts-20' }],
          },
          { id: 'b', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Rahip çantası (Priest's Pack)", grants: [{ itemId: 'priests-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'shield' }],
    fixedPicks: [
      {
        id: 'holy-symbol',
        label: 'Kutsal sembolünü seç',
        help: 'Kutsal sembol, cleric için büyü odağıdır — büyü yaparken malzeme bileşenlerinin yerine geçer.',
        from: { kind: 'ids', ids: HOLY_SYMBOL },
        count: 1,
      },
    ],
  },

  druid: {
    choices: [
      {
        id: 'offhand',
        label: 'Kalkan mı silah mı?',
        options: [
          { id: 'a', label: 'Tahta kalkan (Shield) — AC +2', grants: [{ itemId: 'shield' }] },
          { id: 'b', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
      {
        id: 'main-weapon',
        label: 'Ana silahın',
        options: [
          { id: 'a', label: 'Kama (Scimitar)', grants: [{ itemId: 'scimitar' }] },
          { id: 'b', label: 'Herhangi bir basit yakın dövüş silahı', pick: anySimpleMelee },
        ],
      },
    ],
    fixed: [{ itemId: 'leather' }, { itemId: 'explorers-pack' }],
    fixedPicks: [
      {
        id: 'druidic-focus',
        label: 'Druidik odağını seç',
        help: 'Druidic focus, druid büyülerinin malzeme bileşenlerinin yerine geçer.',
        from: { kind: 'ids', ids: DRUIDIC_FOCUS },
        count: 1,
      },
    ],
  },

  fighter: {
    choices: [
      {
        id: 'armor',
        label: 'Zırhın',
        options: [
          { id: 'a', label: 'Zincir zırh (Chain mail) — AC 16, gizlenmede dezavantaj', grants: [{ itemId: 'chain-mail' }] },
          {
            id: 'b',
            label: 'Deri zırh + uzun yay + 20 ok',
            grants: [{ itemId: 'leather' }, { itemId: 'longbow' }, { itemId: 'ammunition-arrows-20' }],
          },
        ],
      },
      {
        id: 'main-weapon',
        label: 'Savaş silahı düzenin',
        options: [
          {
            id: 'a',
            label: 'Bir savaş silahı + kalkan',
            grants: [{ itemId: 'shield' }],
            pick: anyMartial,
          },
          {
            id: 'b',
            label: 'İki savaş silahı',
            pick: { label: 'İki savaş silahı seç', from: { kind: 'weapon', weaponClass: 'martial' }, count: 2, allowDuplicates: true },
          },
        ],
      },
      {
        id: 'ranged',
        label: 'İkincil seçeneğin',
        options: [
          {
            id: 'a',
            label: 'Hafif arbalet + 20 ok',
            grants: [{ itemId: 'crossbow-light' }, { itemId: 'ammunition-crossbow-bolts-20' }],
          },
          { id: 'b', label: 'İki el baltası (2× Handaxe)', grants: [{ itemId: 'handaxe', qty: 2 }] },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Zindan macerası çantası (Dungeoneer's Pack)", grants: [{ itemId: 'dungeoneers-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [],
  },

  monk: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Silahın',
        options: [
          { id: 'a', label: 'Kısa kılıç (Shortsword)', grants: [{ itemId: 'shortsword' }] },
          { id: 'b', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Zindan macerası çantası (Dungeoneer's Pack)", grants: [{ itemId: 'dungeoneers-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'dart', qty: 10 }],
  },

  paladin: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Savaş silahı düzenin',
        options: [
          { id: 'a', label: 'Bir savaş silahı + kalkan', grants: [{ itemId: 'shield' }], pick: anyMartial },
          {
            id: 'b',
            label: 'İki savaş silahı',
            pick: { label: 'İki savaş silahı seç', from: { kind: 'weapon', weaponClass: 'martial' }, count: 2, allowDuplicates: true },
          },
        ],
      },
      {
        id: 'side-weapon',
        label: 'İkincil silahın',
        options: [
          { id: 'a', label: '5 cirit (5× Javelin)', grants: [{ itemId: 'javelin', qty: 5 }] },
          { id: 'b', label: 'Herhangi bir basit yakın dövüş silahı', pick: anySimpleMelee },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Rahip çantası (Priest's Pack)", grants: [{ itemId: 'priests-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'chain-mail' }],
    fixedPicks: [
      {
        id: 'holy-symbol',
        label: 'Kutsal sembolünü seç',
        help: 'Paladin için kutsal sembol büyü odağıdır.',
        from: { kind: 'ids', ids: HOLY_SYMBOL },
        count: 1,
      },
    ],
  },

  ranger: {
    choices: [
      {
        id: 'armor',
        label: 'Zırhın',
        options: [
          { id: 'a', label: 'Pullu zırh (Scale mail) — AC 14 + Dex (maks 2), gizlenmede dezavantaj', grants: [{ itemId: 'scale-mail' }] },
          { id: 'b', label: 'Deri zırh (Leather) — AC 11 + Dex, sessiz', grants: [{ itemId: 'leather' }] },
        ],
      },
      {
        id: 'melee',
        label: 'Yakın dövüş silahların',
        options: [
          { id: 'a', label: 'İki kısa kılıç (2× Shortsword)', grants: [{ itemId: 'shortsword', qty: 2 }] },
          {
            id: 'b',
            label: 'İki basit yakın dövüş silahı',
            pick: { label: 'İki basit yakın dövüş silahı seç', from: { kind: 'weapon', weaponClass: 'simple', weaponRange: 'melee' }, count: 2, allowDuplicates: true },
          },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Zindan macerası çantası (Dungeoneer's Pack)", grants: [{ itemId: 'dungeoneers-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'longbow' }, { itemId: 'ammunition-arrows-20' }, { itemId: 'quiver' }],
  },

  rogue: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Ana silahın',
        options: [
          { id: 'a', label: 'Pala (Rapier) — 1d8, finesse', grants: [{ itemId: 'rapier' }] },
          { id: 'b', label: 'Kısa kılıç (Shortsword) — 1d6, finesse & light', grants: [{ itemId: 'shortsword' }] },
        ],
      },
      {
        id: 'side-weapon',
        label: 'İkincil silahın',
        options: [
          { id: 'a', label: 'Kısa yay + 20 ok (Shortbow & 20 arrows)', grants: [{ itemId: 'shortbow' }, { itemId: 'ammunition-arrows-20' }] },
          { id: 'b', label: 'Kısa kılıç (Shortsword)', grants: [{ itemId: 'shortsword' }] },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Hırsız çantası (Burglar's Pack)", grants: [{ itemId: 'burglars-pack' }] },
          { id: 'b', label: "Zindan macerası çantası (Dungeoneer's Pack)", grants: [{ itemId: 'dungeoneers-pack' }] },
          { id: 'c', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'leather' }, { itemId: 'dagger', qty: 2 }, { itemId: 'thieves-tools' }],
  },

  sorcerer: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Silahın',
        options: [
          {
            id: 'a',
            label: 'Hafif arbalet + 20 ok',
            grants: [{ itemId: 'crossbow-light' }, { itemId: 'ammunition-crossbow-bolts-20' }],
          },
          { id: 'b', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
      {
        id: 'focus',
        label: 'Büyü odağın',
        help: 'İkisi de aynı işi görür: büyülerin ucuz malzeme bileşenlerini karşılar. Component pouch bir kesedir; arcane focus bir kristal/asa/değnek gibi görünür bir eşyadır.',
        options: [
          { id: 'a', label: 'Component pouch (Bileşen kesesi)', grants: [{ itemId: 'component-pouch' }] },
          {
            id: 'b',
            label: 'Arcane focus (Gizli güç odağı)',
            pick: { label: 'Arcane focus türünü seç', from: { kind: 'ids', ids: ARCANE_FOCUS }, count: 1 },
          },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Zindan macerası çantası (Dungeoneer's Pack)", grants: [{ itemId: 'dungeoneers-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'dagger', qty: 2 }],
  },

  warlock: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Silahın',
        options: [
          {
            id: 'a',
            label: 'Hafif arbalet + 20 ok',
            grants: [{ itemId: 'crossbow-light' }, { itemId: 'ammunition-crossbow-bolts-20' }],
          },
          { id: 'b', label: 'Herhangi bir basit silah', pick: anySimple },
        ],
      },
      {
        id: 'focus',
        label: 'Büyü odağın',
        help: 'İkisi de aynı işi görür: büyülerin ucuz malzeme bileşenlerini karşılar.',
        options: [
          { id: 'a', label: 'Component pouch (Bileşen kesesi)', grants: [{ itemId: 'component-pouch' }] },
          {
            id: 'b',
            label: 'Arcane focus (Gizli güç odağı)',
            pick: { label: 'Arcane focus türünü seç', from: { kind: 'ids', ids: ARCANE_FOCUS }, count: 1 },
          },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Bilgin çantası (Scholar's Pack)", grants: [{ itemId: 'scholars-pack' }] },
          { id: 'b', label: "Zindan macerası çantası (Dungeoneer's Pack)", grants: [{ itemId: 'dungeoneers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'leather' }, { itemId: 'dagger', qty: 2 }],
    fixedPicks: [
      {
        id: 'extra-simple',
        label: 'Ek bir basit silah seç',
        help: 'Warlock başlangıç ekipmanı bir basit silah daha içerir.',
        from: { kind: 'weapon', weaponClass: 'simple' },
        count: 1,
      },
    ],
  },

  wizard: {
    choices: [
      {
        id: 'main-weapon',
        label: 'Silahın',
        options: [
          { id: 'a', label: 'Quarterstaff (Asa) — 1d6, versatile 1d8', grants: [{ itemId: 'quarterstaff' }] },
          { id: 'b', label: 'Hançer (Dagger) — 1d4, fırlatılabilir', grants: [{ itemId: 'dagger' }] },
        ],
      },
      {
        id: 'focus',
        label: 'Büyü odağın',
        help: 'İkisi de aynı işi görür: büyülerin ucuz malzeme bileşenlerini karşılar.',
        options: [
          { id: 'a', label: 'Component pouch (Bileşen kesesi)', grants: [{ itemId: 'component-pouch' }] },
          {
            id: 'b',
            label: 'Arcane focus (Gizli güç odağı)',
            pick: { label: 'Arcane focus türünü seç', from: { kind: 'ids', ids: ARCANE_FOCUS }, count: 1 },
          },
        ],
      },
      {
        id: 'pack',
        label: 'Çantan',
        options: [
          { id: 'a', label: "Bilgin çantası (Scholar's Pack)", grants: [{ itemId: 'scholars-pack' }] },
          { id: 'b', label: "Kaşif çantası (Explorer's Pack)", grants: [{ itemId: 'explorers-pack' }] },
        ],
      },
    ],
    fixed: [{ itemId: 'spellbook' }],
  },
}

export const startingEquipmentFor = (classId: string): ClassStartingEquipment | undefined => CLASS_STARTING_EQUIPMENT[classId]

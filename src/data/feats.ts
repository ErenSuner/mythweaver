// Feat verisi — PHB'nin 42 feat'i (kaynak: helper_files/dnd_5e_feats.md).
// Mekanik etkiler karakter sayfasına türetilir:
//  - sabit sayısal (HP, initiative, hız, passive perception)
//  - sabit VE seçmeli +1 ability (half-feat)
//  - proficiency grantları (skill, tool, silah, zırh, dil) — char.featSelections'tan
//  - büyü grantları (Magic Initiate / Ritual Caster / Spell Sniper) — ayrı blok
// Karmaşık/savaş-içi koşullu feat'ler açıklama metni olarak gösterilir.
import type { Ability } from '@/types/data'
import type { FeatSelection } from '@/types/character'

export type ArmorKind = 'light' | 'medium' | 'heavy' | 'shield'

export interface Feat {
  id: string
  name: string
  nameTr: string
  desc: string
  // --- ön koşul ---
  prereq?: string // görüntü metni
  prereqSpellcasting?: boolean // en az bir büyü yeteneği
  prereqAbilityMin?: { anyOf: Ability[]; min: number } // "Dex 13" / "Int ya da Wis 13"
  // --- sabit sayısal etkiler ---
  hpPerLevel?: number
  initiativeBonus?: number
  speedBonus?: number
  passivePerceptionBonus?: number
  abilityBonus?: { ability: Ability; amount: number } // sabit (seçimsiz) half-feat
  // --- seçim gerektiren grantlar ---
  abilityChoice?: Ability[] // +1'in dağıtılacağı seçenekler
  grantsSaveProf?: boolean // Resilient: seçilen ability'de save proficiency
  grantsSkills?: number // Skilled: 3 (skill VEYA tool karışık)
  grantsWeapons?: number // Weapon Master: 4
  grantsLanguages?: number // Linguist: 3
  armorGrant?: ArmorKind[] // sabit zırh proficiency grantı
  grantsSpells?: { cantrips: number; level1: number; ritualOnly?: boolean; attackCantripOnly?: boolean }
  damageChoice?: boolean // Elemental Adept: hasar türü seçimi (metin)
}

export const FEATS: Feat[] = [
  {
    id: 'alert',
    name: 'Alert',
    nameTr: 'Tetikte',
    desc: 'Initiative’a +5. Bilinçliyken sürprize uğratılamazsın; görmediğin saldırganlar sana Advantage kazanmaz.',
    initiativeBonus: 5,
  },
  {
    id: 'athlete',
    name: 'Athlete',
    nameTr: 'Atlet',
    desc: 'Seçtiğin Strength ya da Dexterity +1. Prone iken ayağa kalkmak 5 ft harcar; tırmanış hızını yarıya indirmez; koşarak atlarken 5 ft yeter.',
    abilityChoice: ['Strength', 'Dexterity'],
  },
  {
    id: 'actor',
    name: 'Actor',
    nameTr: 'Aktör',
    desc: '+1 Charisma. Taklit/aldatmada (Deception, Performance) avantaj; duyduğun sesleri/konuşmaları taklit edebilirsin.',
    abilityBonus: { ability: 'Charisma', amount: 1 },
  },
  {
    id: 'charger',
    name: 'Charger',
    nameTr: 'Hücumcu',
    desc: 'Dash eyleminden sonra bonus action ile melee saldırı ya da itme (shove) yapabilirsin. Önce 10 ft düz koşarsan +5 hasar ya da 10 ft itme.',
  },
  {
    id: 'crossbow-expert',
    name: 'Crossbow Expert',
    nameTr: 'Tatar Yayı Uzmanı',
    desc: 'Tatar yaylarının loading özelliğini yok sayarsın; yakında düşman varken menzilli atışta dezavantaj yok; tek elli silahla saldırınca hand crossbow ile bonus atış.',
  },
  {
    id: 'defensive-duelist',
    name: 'Defensive Duelist',
    nameTr: 'Savunmacı Düellocu',
    desc: 'Finesse silahı tutarken bir melee saldırı sana isabet ederse, reaction ile yeterlilik bonusunu AC’ne ekleyip saldırıyı ıskalatabilirsin.',
    prereq: 'Çeviklik (Dexterity) 13+',
    prereqAbilityMin: { anyOf: ['Dexterity'], min: 13 },
  },
  {
    id: 'dual-wielder',
    name: 'Dual Wielder',
    nameTr: 'Çift Silah Kullanıcı',
    desc: 'İki silahla dövüşürken AC +1; light olmayan tek elli silahlarla da two-weapon fighting yapabilirsin; aynı anda iki silah çekebilirsin.',
  },
  {
    id: 'dungeon-delver',
    name: 'Dungeon Delver',
    nameTr: 'Zindan Kâşifi',
    desc: 'Gizli kapı/tuzak aramada avantaj; tuzak kurtarma zarlarında avantaj; tuzak hasarına direnç; normal tempoda da tuzak arayabilirsin.',
  },
  {
    id: 'durable',
    name: 'Durable',
    nameTr: 'Dayanıklı',
    desc: '+1 Constitution. Hit Dice ile iyileşirken en az 2× Constitution modifier kadar HP kazanırsın.',
    abilityBonus: { ability: 'Constitution', amount: 1 },
  },
  {
    id: 'elemental-adept',
    name: 'Elemental Adept',
    nameTr: 'Element Ustası',
    desc: 'Bir hasar türü seç (asit/soğuk/ateş/yıldırım/gök gürültüsü). Büyülerin o türe karşı direnci yok sayar; o türde hasar zarındaki 1’leri 2 sayarsın.',
    prereq: 'En az bir büyü yapabilme yeteneği',
    prereqSpellcasting: true,
    damageChoice: true,
  },
  {
    id: 'grappler',
    name: 'Grappler',
    nameTr: 'Kıstırıcı',
    desc: 'Kıstırdığın yaratığa saldırıda avantaj; eylemle sabitleyip (pin) ikinizi de restrained yapabilirsin; bir boyut büyük yaratıklar otomatik kurtulamaz.',
    prereq: 'Güç (Strength) 13+',
    prereqAbilityMin: { anyOf: ['Strength'], min: 13 },
  },
  {
    id: 'great-weapon-master',
    name: 'Great Weapon Master',
    nameTr: 'Büyük Silah Ustası',
    desc: 'Kritik veya öldürücü vuruşta bonus action ile ekstra melee saldırı. Ağır (heavy) silahla -5 isabet / +10 hasar seçebilirsin.',
  },
  {
    id: 'healer',
    name: 'Healer',
    nameTr: 'Şifacı',
    desc: 'Healer’s kit ile stabilize edilen yaratık 1 HP kazanır. Eylemle kit kullanıp 1d6+4 + hedefin maksimum Hit Dice’ı kadar HP verirsin (dinlenene dek bir kez).',
  },
  {
    id: 'heavily-armored',
    name: 'Heavily Armored',
    nameTr: 'Ağır Zırhlı',
    desc: '+1 Strength ve ağır (heavy) zırhta yeterlilik kazanırsın.',
    prereq: 'Orta (medium) zırhta yeterlilik',
    abilityBonus: { ability: 'Strength', amount: 1 },
    armorGrant: ['heavy'],
  },
  {
    id: 'heavy-armor-master',
    name: 'Heavy Armor Master',
    nameTr: 'Ağır Zırh Ustası',
    desc: '+1 Strength. Ağır zırh giyerken sihirsiz silahlardan gelen ezme/delme/kesme hasarı 3 azalır.',
    prereq: 'Ağır (heavy) zırhta yeterlilik',
    abilityBonus: { ability: 'Strength', amount: 1 },
  },
  {
    id: 'inspiring-leader',
    name: 'Inspiring Leader',
    nameTr: 'İlham Veren Lider',
    desc: '10 dakikalık konuşmayla 30 ft içindeki 6 dost yaratığa seviyen + Charisma modifier kadar geçici HP verirsin (dinlenene dek bir kez).',
    prereq: 'Charisma 13+',
    prereqAbilityMin: { anyOf: ['Charisma'], min: 13 },
  },
  {
    id: 'keen-mind',
    name: 'Keen Mind',
    nameTr: 'Keskin Zihin',
    desc: '+1 Intelligence. Kuzeyi ve gün doğumuna/batımına kalan saati her zaman bilirsin; son 1 ayda gördüğün/duyduğunu hatırlarsın.',
    abilityBonus: { ability: 'Intelligence', amount: 1 },
  },
  {
    id: 'lightly-armored',
    name: 'Lightly Armored',
    nameTr: 'Hafif Zırhlı',
    desc: 'Seçtiğin Strength ya da Dexterity +1 ve hafif (light) zırhta yeterlilik kazanırsın.',
    abilityChoice: ['Strength', 'Dexterity'],
    armorGrant: ['light'],
  },
  {
    id: 'linguist',
    name: 'Linguist',
    nameTr: 'Dilbilimci',
    desc: '+1 Intelligence, seçtiğin 3 dil öğrenirsin ve başkalarının zor çözeceği yazılı şifreler oluşturabilirsin.',
    abilityBonus: { ability: 'Intelligence', amount: 1 },
    grantsLanguages: 3,
  },
  {
    id: 'lucky',
    name: 'Lucky',
    nameTr: 'Şanslı',
    desc: '3 şans puanın var; bir d20 atışını (kendi ya da sana yapılan) yeniden atmak için harcarsın. Long Rest ile yenilenir.',
  },
  {
    id: 'mage-slayer',
    name: 'Mage Slayer',
    nameTr: 'Büyücü Katili',
    desc: '5 ft içindeki bir yaratık büyü yaparsa reaction ile melee saldırı; büyüye konsantre yaratığa hasar verince kurtarması dezavantajlı; yakında yapılan büyülere karşı kurtarmada avantaj.',
  },
  {
    id: 'magic-initiate',
    name: 'Magic Initiate',
    nameTr: 'Sihir Acemisi',
    desc: 'Bir sınıf seç (bard/cleric/druid/sorcerer/warlock/wizard). O listeden 2 cantrip + 1 adet 1. seviye büyü öğrenirsin (büyüyü günde bir kez slotsuz yaparsın).',
    grantsSpells: { cantrips: 2, level1: 1 },
  },
  {
    id: 'martial-adept',
    name: 'Martial Adept',
    nameTr: 'Savaş Uzmanı',
    desc: 'Battle Master manevralarından 2’sini öğrenirsin ve bir d6 üstünlük zarı (superiority die) kazanırsın. Kısa/uzun dinlenmede yenilenir.',
  },
  {
    id: 'medium-armor-master',
    name: 'Medium Armor Master',
    nameTr: 'Orta Zırh Ustası',
    desc: 'Orta zırh Stealth’e dezavantaj getirmez; Dexterity 16+ ise orta zırhta AC bonusu 2 yerine 3 olur.',
    prereq: 'Orta (medium) zırhta yeterlilik',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    nameTr: 'Hareketli',
    desc: 'Hız +10 ft. Dash sonrası difficult terrain seni yavaşlatmaz. Melee saldırdığın hedeften o tur opportunity attack yemezsin.',
    speedBonus: 10,
  },
  {
    id: 'moderately-armored',
    name: 'Moderately Armored',
    nameTr: 'Orta Düzeyde Zırhlı',
    desc: 'Seçtiğin Strength ya da Dexterity +1; orta (medium) zırhta ve kalkanlarda yeterlilik kazanırsın.',
    prereq: 'Hafif (light) zırhta yeterlilik',
    abilityChoice: ['Strength', 'Dexterity'],
    armorGrant: ['medium', 'shield'],
  },
  {
    id: 'mounted-combatant',
    name: 'Mounted Combatant',
    nameTr: 'Binekli Savaşçı',
    desc: 'Binekliyken: daha küçük binmemiş yaratıklara melee’de avantaj; bineğine gelen saldırıyı üstüne çekebilir; bineğinin Dexterity kurtarmalarını iyileştirirsin.',
  },
  {
    id: 'observant',
    name: 'Observant',
    nameTr: 'Dikkatli',
    desc: 'Seçtiğin Intelligence ya da Wisdom +1. Dudak okuyabilirsin. Passive Perception ve Investigation +5.',
    abilityChoice: ['Intelligence', 'Wisdom'],
    passivePerceptionBonus: 5,
  },
  {
    id: 'polearm-master',
    name: 'Polearm Master',
    nameTr: 'Kargı Ustası',
    desc: 'Glaive/halberd/quarterstaff ile saldırınca sapın ucuyla bonus action 1d4 ezme saldırısı; reach silahına giren yaratıklar opportunity attack tetikler.',
  },
  {
    id: 'resilient',
    name: 'Resilient',
    nameTr: 'Dirençli',
    desc: 'Seçtiğin bir yetenek +1 ve o yetenekte saving throw proficiency kazanırsın.',
    abilityChoice: ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'],
    grantsSaveProf: true,
  },
  {
    id: 'ritual-caster',
    name: 'Ritual Caster',
    nameTr: 'Ritüel Büyücüsü',
    desc: 'Bir sınıf seç; o listeden ritual etiketli 2 adet 1. seviye büyü içeren bir ritüel kitabı edinirsin. Bu büyüleri yalnız ritüel olarak yaparsın.',
    prereq: 'Intelligence ya da Wisdom 13+',
    prereqAbilityMin: { anyOf: ['Intelligence', 'Wisdom'], min: 13 },
    grantsSpells: { cantrips: 0, level1: 2, ritualOnly: true },
  },
  {
    id: 'savage-attacker',
    name: 'Savage Attacker',
    nameTr: 'Vahşi Saldırgan',
    desc: 'Turda bir kez, bir melee silah saldırısının hasar zarlarını yeniden atıp iki sonuçtan birini seçebilirsin.',
  },
  {
    id: 'sentinel',
    name: 'Sentinel',
    nameTr: 'Nöbetçi',
    desc: 'Opportunity attack isabetinde hedefin hızı 0 olur; Disengage yapsalar bile fırsat saldırısı yaparsın; 5 ft içinde müttefikine saldıranı reaction ile vurabilirsin.',
  },
  {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    nameTr: 'Keskin Nişancı',
    desc: 'Uzun menzil cezası yok; yarım/dörtte üç örtüyü yok sayarsın; menzilli silahla -5 isabet / +10 hasar seçebilirsin.',
  },
  {
    id: 'shield-master',
    name: 'Shield Master',
    nameTr: 'Kalkan Ustası',
    desc: 'Attack eyleminden sonra kalkanla bonus action itme; sadece seni hedefleyen Dexterity kurtarmalarına kalkan bonusu; başarılı kurtarmada hasarı sıfıra indirebilirsin.',
  },
  {
    id: 'skilled',
    name: 'Skilled',
    nameTr: 'Yetenekli',
    desc: 'Seçtiğin herhangi 3 beceri ya da aletin (skill/tool) kombinasyonunda yeterlilik kazanırsın.',
    grantsSkills: 3,
  },
  {
    id: 'skulker',
    name: 'Skulker',
    nameTr: 'Sinsi',
    desc: 'Hafif örtülü (lightly obscured) yerde saklanmayı deneyebilirsin; menzilli ıskalama konumunu açığa çıkarmaz; loş ışık Perception’a dezavantaj getirmez.',
    prereq: 'Çeviklik (Dexterity) 13+',
    prereqAbilityMin: { anyOf: ['Dexterity'], min: 13 },
  },
  {
    id: 'spell-sniper',
    name: 'Spell Sniper',
    nameTr: 'Büyü Keskin Nişancısı',
    desc: 'Saldırı zarı gerektiren büyülerin menzili iki katına çıkar; yarım/dörtte üç örtüyü yok sayarsın; bir sınıf listesinden saldırı cantrip’i öğrenirsin.',
    prereq: 'En az bir büyü yapabilme yeteneği',
    prereqSpellcasting: true,
    grantsSpells: { cantrips: 1, level1: 0, attackCantripOnly: true },
  },
  {
    id: 'tavern-brawler',
    name: 'Tavern Brawler',
    nameTr: 'Meyhane Kavgacısı',
    desc: 'Seçtiğin Strength ya da Constitution +1. Doğaçlama silah ve silahsız vuruşta yeterlilik; silahsız vuruş 1d4; isabette bonus action ile kıstırma (grapple).',
    abilityChoice: ['Strength', 'Constitution'],
  },
  {
    id: 'tough',
    name: 'Tough',
    nameTr: 'Sağlam',
    desc: 'Maksimum HP’n seviyenin iki katı kadar artar; her seviyede ayrıca +2 HP.',
    hpPerLevel: 2,
  },
  {
    id: 'war-caster',
    name: 'War Caster',
    nameTr: 'Savaş Büyücüsü',
    desc: 'Konsantrasyon korumada avantaj; ellerin doluyken somatik bileşen yapabilirsin; opportunity attack yerine tek hedefli 1-eylem cantrip cast edebilirsin.',
    prereq: 'En az bir büyü yapabilme yeteneği',
    prereqSpellcasting: true,
  },
  {
    id: 'weapon-master',
    name: 'Weapon Master',
    nameTr: 'Silah Ustası',
    desc: 'Seçtiğin Strength ya da Dexterity +1 ve seçtiğin 4 silahta yeterlilik kazanırsın.',
    abilityChoice: ['Strength', 'Dexterity'],
    grantsWeapons: 4,
  },
]

export const featById = (id: string): Feat | undefined => FEATS.find((f) => f.id === id)

// Feat'in seçtiği sınıfa göre büyü yapma yeteneği.
export function spellAbilityForClass(classId: string): Ability {
  if (classId === 'wizard') return 'Intelligence'
  if (classId === 'cleric' || classId === 'druid') return 'Wisdom'
  return 'Charisma' // bard, sorcerer, warlock
}

// Seçili feat'lerden gelen sayısal bir etkinin toplamı (HP, initiative, hız…).
export function featNumeric(featIds: string[], key: 'hpPerLevel' | 'initiativeBonus' | 'speedBonus' | 'passivePerceptionBonus'): number {
  return featIds.reduce((n, id) => n + (featById(id)?.[key] ?? 0), 0)
}

// Sabit half-feat ability bonusları (seçimsiz).
export function featAbilityBonuses(featIds: string[]): Partial<Record<Ability, number>> {
  const out: Partial<Record<Ability, number>> = {}
  for (const id of featIds) {
    const ab = featById(id)?.abilityBonus
    if (ab) out[ab.ability] = (out[ab.ability] ?? 0) + ab.amount
  }
  return out
}

// Seçmeli half-feat +1'leri (char.featSelections.ability).
export function featSelectionAbilityBonuses(sel: Record<string, FeatSelection>): Partial<Record<Ability, number>> {
  const out: Partial<Record<Ability, number>> = {}
  for (const [id, s] of Object.entries(sel)) {
    const feat = featById(id)
    if (feat?.abilityChoice && s.ability) out[s.ability] = (out[s.ability] ?? 0) + 1
  }
  return out
}

// Resilient'ten gelen save proficiency ability'leri.
export function featSaveProficiencies(featIds: string[], sel: Record<string, FeatSelection>): Ability[] {
  const out: Ability[] = []
  for (const id of featIds) {
    if (featById(id)?.grantsSaveProf && sel[id]?.ability) out.push(sel[id].ability!)
  }
  return out
}

// Skilled'dan gelen beceri proficiency'leri.
export function featGrantedSkills(featIds: string[], sel: Record<string, FeatSelection>): string[] {
  return featIds.flatMap((id) => (featById(id)?.grantsSkills ? sel[id]?.skills ?? [] : []))
}

// Skilled'dan gelen alet proficiency'leri.
export function featGrantedTools(featIds: string[], sel: Record<string, FeatSelection>): string[] {
  return featIds.flatMap((id) => (featById(id)?.grantsSkills ? sel[id]?.tools ?? [] : []))
}

// Weapon Master'dan gelen silah proficiency'leri.
export function featGrantedWeapons(featIds: string[], sel: Record<string, FeatSelection>): string[] {
  return featIds.flatMap((id) => (featById(id)?.grantsWeapons ? sel[id]?.weapons ?? [] : []))
}

// Linguist'ten gelen diller.
export function featGrantedLanguages(featIds: string[], sel: Record<string, FeatSelection>): string[] {
  return featIds.flatMap((id) => (featById(id)?.grantsLanguages ? sel[id]?.languages ?? [] : []))
}

// Zırh feat'lerinden gelen sabit zırh proficiency'leri.
export function featGrantedArmor(featIds: string[]): ArmorKind[] {
  return featIds.flatMap((id) => featById(id)?.armorGrant ?? [])
}

// Büyü veren feat'lerin (Magic Initiate / Ritual Caster / Spell Sniper) seçili büyüleri.
export interface FeatSpells {
  featId: string
  featName: string
  ability: Ability
  cantrips: string[]
  spells: string[]
  ritualOnly: boolean
}
export function featGrantedSpells(featIds: string[], sel: Record<string, FeatSelection>): FeatSpells[] {
  const out: FeatSpells[] = []
  for (const id of featIds) {
    const feat = featById(id)
    const s = sel[id]
    if (!feat?.grantsSpells || !s?.spellClass) continue
    out.push({
      featId: id,
      featName: feat.name,
      ability: spellAbilityForClass(s.spellClass),
      cantrips: s.cantrips ?? [],
      spells: s.spells ?? [],
      ritualOnly: Boolean(feat.grantsSpells.ritualOnly),
    })
  }
  return out
}

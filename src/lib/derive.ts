// Türetilmiş alanları yeniden hesaplar. Kullanıcı seçimlerini (skill proficiency,
// seçilen büyüler, elle AC) korur; yalnız hesaplanan alanları günceller.
import { classById, raceById, backgroundById, itemById, config } from '@/data'
import { baseLanguages, collectChoiceSlots, draconicAncestryById, fightingStyleById, favoredEnemyById, terrainById, subclassGrant } from '@/data/grants'
import { spellById } from '@/data'
import { spellSlotsFor } from '@/data/spell-progression'
import {
  featById,
  featNumeric,
  featGrantedLanguages,
  featGrantedWeapons,
  featGrantedTools,
  featGrantedSkills,
  featGrantedArmor,
  type ArmorKind,
} from '@/data/feats'
import {
  buildInventory,
  chosenToolProficiencies,
  composeEquipmentText,
  currencyFromGp,
  remainingGoldGp,
  armorSpeedPenalty,
} from './inventory'
import type { Character, GainedFeature, Spellcasting } from '@/types/character'
import {
  firstLevelHp,
  averageLevelHp,
  finalAbilityScores,
  spellSaveDC,
  spellAttackBonus,
  armorClass,
  isSkillProficient,
  backgroundSkills,
} from './rules'
import { abilityModifier } from './rules'

// sınıf + subclass'ın current seviyeye kadar tüm özellikleri (kümülatif, sıralı)
export function cumulativeFeatures(char: Character): GainedFeature[] {
  const klass = classById(char.classId)
  if (!klass) return []
  const out: GainedFeature[] = []
  const sub = klass.subclasses.find((s) => s.id === char.subclassId)
  for (let lvl = 1; lvl <= char.level; lvl++) {
    for (const f of klass.levelFeatures[String(lvl)] || []) {
      out.push({ name: f.name, level: f.level, description: f.description, source: klass.id })
    }
    // yalnızca SEÇİLEN alt sınıfın o seviyedeki özellikleri
    for (const f of sub?.levelFeatures?.[String(lvl)] ?? []) {
      out.push({ name: f.name, level: f.level, description: f.description, source: sub!.id })
    }
  }
  if (sub) {
    // alt sınıfın tanıtım metni (bazı sınıflarda tüm özellikler bu metnin içinde)
    out.push({ name: sub.name, level: klass.subclassLevel ?? char.level, description: sub.description, source: sub.id })
  }
  // background özelliği (Shelter of the Faithful, Criminal Contact vb.) — sheet'te görünsün
  const bg = backgroundById(char.backgroundId)
  if (bg?.feature) out.push({ name: `Background: ${bg.feature.name}`, level: 1, description: bg.feature.description, source: 'background' })
  // seçilen feat'ler (seçmeli ability/sınıf varsa ada ekle)
  for (const id of char.feats ?? []) {
    const f = featById(id)
    if (!f) continue
    const sel = char.featSelections?.[id]
    const pick = sel?.ability ? ` — ${config.abilitiesTr[sel.ability]}` : sel?.spellClass ? ` — ${classById(sel.spellClass)?.name ?? sel.spellClass}` : ''
    out.push({ name: `Feat: ${f.name} (${f.nameTr})${pick}`, level: 1, description: f.desc, source: 'feat' })
  }
  return out
}

// Karakterin bildiği tüm diller (ırk + seçilen + alt sınıf otomatik) — yapısal liste.
// Sheet'te ayrı "Diller" bölümü için; composeProficiencies aynı mantığı metne döker.
export function characterLanguages(c: Character): string[] {
  const langSlots = ['lang-race', 'lang-subrace', 'lang-bg', 'lang-favored-enemy']
  const chosenLangs = langSlots.flatMap((k) => c.choiceSelections[k] ?? [])
  const grant = subclassGrant(c.subclassId)
  const autoLangs = grant?.autoLanguage ? [grant.autoLanguage] : []
  const featLangs = featGrantedLanguages(c.feats ?? [], c.featSelections ?? {})
  return [...new Set([...baseLanguages(c.raceId), ...chosenLangs, ...autoLangs, ...featLangs])].filter(Boolean)
}

// Dil + araç + zırh/silah yeterliliklerini seçimlerden derle
export function composeProficiencies(c: Character): string {
  const klass = classById(c.classId)
  const bg = backgroundById(c.backgroundId)
  const grant = subclassGrant(c.subclassId)
  const langs = characterLanguages(c)

  const notYok = (s?: string) => (s && !/^yok$/i.test(s.trim()) ? s : '')
  // background tool metninden seçim ifadelerini ("bir çeşit oyun seti", "… seç")
  // ayıkla — o seçimler pickedTools ile somut adla zaten gösterildiğinden çift olmasın.
  const cleanBgTools = (s?: string): string => {
    const t = notYok(s)
    if (!t) return ''
    return t
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p && !/bir çeşit|bir tür|herhangi|seç/i.test(p))
      .join(', ')
  }
  // ekipman adımında seçilen somut aletler (oyun seti, müzik aleti, zanaat aleti…)
  const pickedTools = chosenToolProficiencies(c).map((id) => itemById(id)?.name ?? id)
  const tools = [
    notYok(klass?.tools),
    cleanBgTools(bg?.toolProficiencies),
    ...(c.choiceSelections['tool-race'] ?? []),
    ...(c.choiceSelections['tool-class'] ?? []),
    ...pickedTools,
  ].filter(Boolean)

  // --- feat grantları ---
  const ARMOR_TR: Record<ArmorKind, string> = {
    light: 'Hafif (light) zırh',
    medium: 'Orta (medium) zırh',
    heavy: 'Ağır (heavy) zırh',
    shield: 'Kalkan (shield)',
  }
  const featArmor = [...new Set(featGrantedArmor(c.feats ?? []))].map((k) => ARMOR_TR[k])
  const featWeapons = featGrantedWeapons(c.feats ?? [], c.featSelections ?? {}).map((id) => itemById(id)?.name ?? id)
  const featTools = featGrantedTools(c.feats ?? [], c.featSelections ?? {}).map((id) => itemById(id)?.name ?? id)
  const featSkills = featGrantedSkills(c.feats ?? [], c.featSelections ?? {}).map((s) => config.skillsTr[s] ?? s)

  // alt sınıf + feat zırh/silah grantları
  const armorParts = [klass?.armor && !/^yok$/i.test(klass.armor) ? klass.armor : '', grant?.heavyArmor ? 'Ağır (heavy) zırh' : '', ...featArmor].filter(Boolean)
  const weaponParts = [klass?.weapons || '', grant?.martialWeapons ? 'Martial (savaş) silahları' : '', ...featWeapons].filter(Boolean)
  const allTools = [...tools, ...featTools]

  const lines: string[] = []
  if (langs.length) lines.push(`Diller: ${langs.join(', ')}`)
  if (armorParts.length) lines.push(`Zırh: ${armorParts.join(', ')}`)
  if (weaponParts.length) lines.push(`Silahlar: ${weaponParts.join(', ')}`)
  if (allTools.length) lines.push(`Araçlar: ${allTools.join('; ')}`)
  if (featSkills.length) lines.push(`Feat Becerileri: ${featSkills.join(', ')}`)

  // Dragonborn ejderha soyu — direnç + breath weapon bilgisi
  const ancestryId = c.choiceSelections['ancestry-race']?.[0]
  const ancestry = ancestryId ? draconicAncestryById(ancestryId) : undefined
  if (ancestry) {
    lines.push(`Ejderha Soyu: ${ancestry.name} (${ancestry.nameTr})`)
    lines.push(`Direnç (Resistance): ${ancestry.damageType} (${ancestry.damageTypeTr})`)
    lines.push(`Breath Weapon: ${ancestry.breath}`)
  }

  // sınıf seviye-1 seçimleri (bilgi olarak)
  const fsId = c.choiceSelections['fighting-style']?.[0]
  const fs = fsId ? fightingStyleById(fsId) : undefined
  if (fs) lines.push(`Dövüş Stili: ${fs.name} (${fs.nameTr})`)
  const feId = c.choiceSelections['favored-enemy']?.[0]
  const fe = feId ? favoredEnemyById(feId) : undefined
  if (fe) lines.push(`Tercihli Düşman: ${fe.name} (${fe.nameTr})`)
  const terrId = c.choiceSelections['terrain']?.[0]
  const terr = terrId ? terrainById(terrId) : undefined
  if (terr) lines.push(`Doğal Kaşif — Arazi: ${terr.name} (${terr.nameTr})`)
  const expSel = c.choiceSelections['expertise'] ?? []
  if (expSel.length) {
    const names = expSel.map((id) => (id === 'thieves-tools' ? "Thieves' Tools" : config.skillsTr[id] ?? id))
    lines.push(`Uzmanlık (Expertise): ${names.join(', ')}`)
  }

  // --- alt sınıf (subclass) grant bilgileri ---
  const domExp = c.choiceSelections['expertise-domain'] ?? []
  if (domExp.length) lines.push(`Domain Expertise: ${domExp.map((id) => config.skillsTr[id] ?? id).join(', ')}`)
  const domSkill = c.choiceSelections['skill-domain'] ?? []
  if (domSkill.length) lines.push(`Domain Becerisi: ${domSkill.map((id) => config.skillsTr[id] ?? id).join(', ')}`)
  const domCantrip = c.choiceSelections['cantrip-domain'] ?? []
  if (domCantrip.length) lines.push(`Domain Cantrip: ${domCantrip.map((id) => spellById(id)?.name ?? id).join(', ')}`)
  const dracId = c.choiceSelections['ancestry-draconic']?.[0]
  const drac = dracId ? draconicAncestryById(dracId) : undefined
  if (drac) lines.push(`Ejderha Atası: ${drac.name} (${drac.nameTr}) — ${drac.damageType} bağı`)
  return lines.join('\n')
}

export function recomputeDerived(input: Character): Character {
  const c = { ...input }
  const race = raceById(c.raceId)
  const klass = classById(c.classId)

  // hız (ırktan; subrace hız override'ı varsa onu kullan — Wood Elf 35 ft)
  const subrace = race?.subraces.find((s) => s.id === c.subraceId)
  if (race?.speed != null) c.speed = race.speed
  if (subrace?.speed != null) c.speed = subrace.speed
  const baseSpeed = c.speed

  // saving throw proficiency (sınıftan)
  if (klass) c.savingThrowProficiencies = [...klass.savingThrows]

  // ırk/background değişince geçersiz kalan seçimleri temizle
  const slots = collectChoiceSlots(c)
  const validKeys = new Set(slots.map((s) => s.key))
  for (const k of Object.keys(c.choiceSelections)) {
    if (/^(lang-|tool-|skill-|cantrip-|ancestry-|fighting-style|expertise|favored-enemy|terrain)/.test(k) && !validKeys.has(k)) delete c.choiceSelections[k]
  }
  const skillSlot = slots.find((s) => s.type === 'skill')
  if (!skillSlot) c.raceExtraSkills = []
  else if (c.raceExtraSkills.length > skillSlot.count) c.raceExtraSkills = c.raceExtraSkills.slice(0, skillSlot.count)

  // background becerileri artık c.skills'te tutulmaz (isSkillProficient türetir);
  // eski davranıştan kalan kayıtları temizle ki sınıf-seçimi sayımı bozulmasın
  for (const s of backgroundSkills(c)) delete c.skills[s]
  // Expertise: artık proficient olmayan (ör. beceri seçiminden çıkarılan) skill'leri at
  const expSlot = slots.find((s) => s.type === 'expertise')
  if (expSlot && c.choiceSelections['expertise']) {
    c.choiceSelections['expertise'] = c.choiceSelections['expertise'].filter(
      (id) => id === expSlot.toolOption || isSkillProficient(c, id),
    )
  }
  const cantripSlot = slots.find((s) => s.type === 'cantrip')
  if (!cantripSlot) c.raceCantripIds = []
  // NOT: raceExtraSkills c.skills'e YAZILMAZ; isSkillProficient ayrı kaynak sayar

  // --- envanter & para (tamamı seçimlerden türer; elle giriş yok) ---
  // giyilen zırh artık envanterde değilse temizle
  c.inventory = buildInventory(c)
  const ownedIds = new Set(c.inventory.map((e) => e.itemId))
  // 'none' = kullanıcı bilinçli zırhsız (envanterde item değil, sıfırlama)
  if (c.equippedArmorId && c.equippedArmorId !== 'none' && !ownedIds.has(c.equippedArmorId)) c.equippedArmorId = ''
  if (c.equippedShield && !ownedIds.has('shield')) c.equippedShield = false
  // zırh sahibiyse ve HENÜZ SEÇMEMİŞSE ('') en yüksek AC'li zırhı otomatik giy.
  // 'none' seçtiyse dokunma (bilinçli zırhsız).
  if (!c.equippedArmorId) {
    const armors = [...ownedIds].map((id) => itemById(id)).filter((i) => i?.category === 'armor')
    const best = armors.sort((a, b) => (b!.acBase ?? 0) - (a!.acBase ?? 0))[0]
    if (best) c.equippedArmorId = best.id
  }
  // kalkan varsayılan takılı; kullanıcı bilinçli kapattıysa (shieldOff) zorlama
  if (!c.equippedShield && ownedIds.has('shield') && !c.shieldOff) c.equippedShield = true
  c.currency = currencyFromGp(remainingGoldGp(c))
  c.equipment = composeEquipmentText(c)

  // Diğer Yeterlilikler & Diller — otomatik derlenir (serbest metin yok)
  c.otherProficienciesLanguages = composeProficiencies(c)

  // HP
  if (klass?.hitDie != null && c.raceId) {
    const first = firstLevelHp(c)
    const perLevel = averageLevelHp(c)
    // subrace HP bonusu (Hill Dwarf Dwarven Toughness: her seviyede +1)
    const subraceHpBonus = (subrace?.hpPerLevelBonus ?? 0) * c.level
    // alt sınıf HP bonusu (Draconic Resilience: her seviyede +1)
    const subclassHpBonus = (subclassGrant(c.subclassId)?.hpPerLevelBonus ?? 0) * c.level
    // feat HP bonusu (Tough: her seviyede +2)
    const featHpBonus = featNumeric(c.feats ?? [], 'hpPerLevel') * c.level
    const derivedMax = first + (c.level - 1) * perLevel + subraceHpBonus + subclassHpBonus + featHpBonus
    c.maxHp = derivedMax
    c.hitDiceTotal = `${c.level}d${klass.hitDie}`
    if (c.currentHp <= 0 || c.currentHp > c.maxHp) c.currentHp = c.maxHp
    if (c.hitDiceRemaining <= 0 || c.hitDiceRemaining > c.level) c.hitDiceRemaining = c.level
  }

  // AC + ağır zırhın Güç şartı karşılanmıyorsa hız cezası
  c.armorClass = armorClass(c)
  c.speed = baseSpeed - armorSpeedPenalty(c.equippedArmorId ? itemById(c.equippedArmorId) : undefined, finalAbilityScores(c).Strength) + featNumeric(c.feats ?? [], 'speedBonus')

  // özellikler (kümülatif)
  c.featuresAndTraits = cumulativeFeatures(c)

  // büyücülük
  if (klass?.isCaster && klass.spellcastingAbility && c.raceId) {
    const ability = klass.spellcastingAbility
    const prev: Spellcasting | null = c.spellcasting
    const levels = prev?.levels ?? {}
    // spell slot'ları seviye tablosundan doldur (kullanılmış slotu koru, total değişince yenile)
    const slotMap = spellSlotsFor(c)
    for (let sl = 1; sl <= 9; sl++) {
      const count = slotMap[sl] ?? 0
      const cur = levels[sl]
      if (count > 0) {
        const prevTotal = cur?.slotsTotal ?? 0
        const state = cur ?? { slotsTotal: 0, slotsRemaining: 0, spellIds: [], preparedIds: [] }
        state.slotsTotal = count
        if (prevTotal !== count || state.slotsRemaining > count) state.slotsRemaining = count
        levels[sl] = state
      } else if (cur) {
        cur.slotsTotal = 0
        cur.slotsRemaining = 0
      }
    }
    c.spellcasting = {
      spellcastingClass: klass.name,
      spellcastingAbility: ability,
      spellSaveDC: spellSaveDC(c, ability),
      spellAttackBonus: spellAttackBonus(c, ability),
      cantripIds: prev?.cantripIds ?? [],
      levels,
    }
  } else {
    c.spellcasting = null
  }

  return c
}

export { abilityModifier, finalAbilityScores }

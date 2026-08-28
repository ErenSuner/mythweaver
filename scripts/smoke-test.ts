// Çekirdek mantık uçtan uca testi (browser'sız). vite-node ile alias çözülür.
import { emptyCharacter, featureKey } from '@/lib/character-factory'
import { recomputeDerived } from '@/lib/derive'
import { finalAbilityScores, armorClass, passivePerception, abilityModifier } from '@/lib/rules'
import { applyLevelUp, previewLevelUp } from '@/lib/levelup'
import type { Character } from '@/types/character'

let pass = 0
let fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.error(`  ✗ ${name} ${extra}`) }
}

// ---- 1) Wood Elf Wizard ----
console.log('\n[Wood Elf Wizard]')
let wiz = emptyCharacter()
wiz.raceId = 'elf'
wiz.subraceId = 'wood-elf'
wiz.classId = 'wizard'
wiz.backgroundId = 'sage'
wiz.baseAbilityScores = { Strength: 8, Dexterity: 15, Constitution: 14, Intelligence: 15, Wisdom: 12, Charisma: 10 }
wiz = recomputeDerived(wiz)
const wf = finalAbilityScores(wiz)
// Elf +2 Dex, Wood Elf +1 Wis
check('Dex 15+2=17', wf.Dexterity === 17, `got ${wf.Dexterity}`)
check('Wis 12+1=13', wf.Wisdom === 13, `got ${wf.Wisdom}`)
check('Int 15 (caster)', wf.Intelligence === 15)
check('isCaster spellcasting set', wiz.spellcasting !== null)
check('spell ability Intelligence', wiz.spellcasting?.spellcastingAbility === 'Intelligence')
// DC = 8 + prof(2) + IntMod(+2) = 12
check('spell save DC 12', wiz.spellcasting?.spellSaveDC === 12, `got ${wiz.spellcasting?.spellSaveDC}`)
// HP L1 = d6(6) + CON mod(+2) = 8
check('HP L1 = 8', wiz.maxHp === 8, `got ${wiz.maxHp}`)
// AC = 10 + Dex mod(+3) = 13
check('AC 13', armorClass(wiz) === 13, `got ${armorClass(wiz)}`)
check('speed 35 (wood elf)', wiz.speed === 35, `got ${wiz.speed}`)
check('L1 features present', wiz.featuresAndTraits.length > 0)
check('saves Int+Wis', wiz.savingThrowProficiencies.includes('Intelligence') && wiz.savingThrowProficiencies.includes('Wisdom'))

// ---- 2) Dwarf Barbarian + level ups ----
console.log('\n[Dwarf Barbarian]')
let barb = emptyCharacter()
barb.raceId = 'dwarf'
barb.subraceId = 'mountain-dwarf'
barb.classId = 'barbarian'
barb.backgroundId = 'soldier'
barb.baseAbilityScores = { Strength: 15, Dexterity: 13, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 }
barb = recomputeDerived(barb)
const bf = finalAbilityScores(barb)
// Dwarf +2 Con, Mountain +2 Str
check('Str 15+2=17', bf.Strength === 17, `got ${bf.Strength}`)
check('Con 15+2=17', bf.Constitution === 17, `got ${bf.Constitution}`)
// HP L1 = d12(12) + CON mod(+3) = 15
check('HP L1 = 15', barb.maxHp === 15, `got ${barb.maxHp}`)
check('not caster', barb.spellcasting === null)
check('speed 25 (dwarf)', barb.speed === 25, `got ${barb.speed}`)

// level 1 -> 2
const p2 = previewLevelUp(barb)!
check('preview to level 2', p2.toLevel === 2)
check('L2 features exist', p2.features.length > 0)
barb = applyLevelUp(barb, {})
check('level now 2', barb.level === 2)
check('NEW badge keys set', barb.lastGainedFeatureKeys.length > 0)
// HP L2 = 15 + (avg d12=7 + CON3) = 15+10=25
check('HP L2 = 25', barb.maxHp === 25, `got ${barb.maxHp}`)
const l2keys = new Set(barb.lastGainedFeatureKeys)
const newInList = barb.featuresAndTraits.some((f) => l2keys.has(featureKey(f.name, f.level)))
check('new feature appears in cumulative list & flagged', newInList)

// level 2 -> 3 (subclass)
const p3 = previewLevelUp(barb)!
check('L3 needs subclass', p3.needsSubclass === true, `needsSubclass=${p3.needsSubclass}`)
const firstSub = (await import('@/data')).classById('barbarian')!.subclasses[0]
barb = applyLevelUp(barb, { subclassId: firstSub.id })
check('level now 3', barb.level === 3)
check('subclass applied', barb.subclassId === firstSub.id)
check('subclass feature in list', barb.featuresAndTraits.some((f) => f.source === firstSub.id))
check('old L2 NEW badges cleared (only L3 new)', [...barb.lastGainedFeatureKeys].every((k) => k.includes('::3') || k.includes(firstSub.name)))

// level 3 -> 4 (ASI)
const p4 = previewLevelUp(barb)!
check('L4 needs ASI', p4.needsASI === true)
const beforeStr = finalAbilityScores(barb).Strength
barb = applyLevelUp(barb, { asi: { Strength: 2 } })
check('ASI +2 Str applied', finalAbilityScores(barb).Strength === beforeStr + 2, `got ${finalAbilityScores(barb).Strength}`)
check('history has 3 entries', barb.levelUpHistory.length === 3, `got ${barb.levelUpHistory.length}`)

// ---- 2b) Kural düzeltmeleri ----
console.log('\n[Kural düzeltmeleri]')

// ASI: Fighter'ın ekstra ASI seviyeleri (6, 14) statik liste dışında da yakalanır
let fig = emptyCharacter()
fig.classId = 'fighter'
fig.level = 5
check('Fighter L6 ekstra ASI algılandı', previewLevelUp(fig)!.needsASI === true)
fig.level = 4
check('Fighter L5 (Extra Attack) ASI değil', previewLevelUp(fig)!.needsASI === false)
fig.level = 13
check('Fighter L14 ekstra ASI algılandı', previewLevelUp(fig)!.needsASI === true)

// Ability score 20'de kapanır (ASI/half-feat şişirmesi engellenir)
let cap = emptyCharacter()
cap.classId = 'fighter'
cap.raceId = 'elf'
cap.baseAbilityScores.Dexterity = 18 // +2 elf +4 asi = 24 -> 20
cap.asiBonuses.Dexterity = 4
check('ability score 20 cap', finalAbilityScores(cap).Dexterity === 20, `got ${finalAbilityScores(cap).Dexterity}`)

// Passive Perception expertise'i sayar
let pp = emptyCharacter()
pp.classId = 'rogue'
pp.raceId = 'elf'
pp.level = 1
pp.baseAbilityScores.Wisdom = 14 // mod +2
pp.skills['Perception'] = { proficient: true }
pp.choiceSelections['expertise'] = ['Perception']
pp = recomputeDerived(pp)
// 10 + Wis(2) + prof(2) + expertise(2) = 16
check('passive perception expertise dahil', passivePerception(pp) === 16, `got ${passivePerception(pp)}`)

// Sınıf değişince eski class-skill proficiency'si düşer
let sc = emptyCharacter()
sc.classId = 'rogue'
sc.raceId = 'elf'
sc.skills['Stealth'] = { proficient: true }
sc = recomputeDerived(sc)
check('rogue Stealth korunur', Boolean(sc.skills['Stealth']?.proficient))
sc.classId = 'cleric'
sc = recomputeDerived(sc)
check('sınıf değişince seçilemeyen skill düşer', !sc.skills['Stealth'])

// HP: 0 (downed) düzenlemede full'a dönmez
let hp = emptyCharacter()
hp.classId = 'fighter'
hp.raceId = 'elf'
hp = recomputeDerived(hp)
check('HP ilk hesapta full', hp.currentHp === hp.maxHp && hp.currentHp > 0)
hp.completed = true // downed koruması yalnız oynanan (tamamlanmış) karakterde
hp.currentHp = 0 // düşmüş
hp = recomputeDerived({ ...hp, characterName: 'X' }) // alakasız düzenleme
check('0 HP korunur (full olmaz)', hp.currentHp === 0, `got ${hp.currentHp}`)

// Sihirbaz sürerken tavan büyürse current de büyür — kimse vurmadan 5/7 olmaz.
// (Eskiden HP sınıf seçilince kilitleniyor, sonraki adımda CON artınca fark kalıyordu.)
let wip = emptyCharacter()
wip.classId = 'wizard'
wip.raceId = 'human'
wip = recomputeDerived(wip) // CON henüz atanmamış
const wipFirstMax = wip.maxHp
wip.baseAbilityScores = { ...wip.baseAbilityScores, Constitution: 16 }
wip = recomputeDerived(wip)
check('sihirbazda tavan büyüdü', wip.maxHp > wipFirstMax, `${wipFirstMax} -> ${wip.maxHp}`)
check('sihirbazda current full kalır', wip.currentHp === wip.maxHp, `got ${wip.currentHp}/${wip.maxHp}`)

// Tamamlanmış karakter: tavan artışı cana yansır, alınan hasar korunur.
let lvl = emptyCharacter()
lvl.classId = 'fighter'
lvl.raceId = 'human'
lvl.baseAbilityScores = { ...lvl.baseAbilityScores, Constitution: 14 }
lvl = recomputeDerived(lvl)
lvl.completed = true
lvl.currentHp = lvl.maxHp - 3 // 3 hasar almış
const beforeMax = lvl.maxHp
lvl = recomputeDerived({ ...lvl, level: 2 })
check('seviye atlayınca tavan arttı', lvl.maxHp > beforeMax, `${beforeMax} -> ${lvl.maxHp}`)
check(
  'kazanılan HP cana yansır, hasar korunur',
  lvl.currentHp === lvl.maxHp - 3,
  `got ${lvl.currentHp}/${lvl.maxHp}`,
)

// ---- 3) Veri bütünlüğü (parser) ----
console.log('\n[Veri bütünlüğü]')
const races = (await import('@/data')).races
const bgs = (await import('@/data')).backgrounds
check('tüm ırklarda languages dolu', races.every((r) => r.languages), races.filter((r) => !r.languages).map((r) => r.id).join(','))
check('dwarf languages doğru', races.find((r) => r.id === 'dwarf')?.languages === 'Common + Dwarvish.')
check('tüm background skillProficiencies dolu', bgs.every((b) => b.skillProficiencies))
check('tüm background equipment dolu', bgs.every((b) => b.equipment))
check('charlatan skill = Deception, Sleight of Hand', bgs.find((b) => b.id === 'charlatan')?.skillProficiencies === 'Deception, Sleight of Hand')
check('tüm background 4 zar kategorisi dolu', bgs.every((b) => b.personalityTraits.length && b.ideals.length && b.bonds.length && b.flaws.length))
check('background açıklamalarında ham tablo yok', bgs.every((b) => !b.description.includes('|')))

// ---- 4) Guided choices ----
console.log('\n[Guided choices]')
const { collectChoiceSlots } = await import('@/data/grants')
const { composeProficiencies } = await import('@/lib/derive')
const { choicesComplete } = await import('@/lib/validation')

// High Elf Wizard + Acolyte: subrace dil + cantrip + background 2 dil
let he = emptyCharacter()
he.raceId = 'elf'; he.subraceId = 'high-elf'; he.classId = 'wizard'; he.backgroundId = 'acolyte'
he = recomputeDerived(he)
let slots = collectChoiceSlots(he)
check('High Elf: subrace dil slotu var', slots.some((s) => s.key === 'lang-subrace'))
check('High Elf: cantrip slotu var', slots.some((s) => s.type === 'cantrip' && s.from === 'wizard'))
check('Acolyte: 2 dil slotu', slots.find((s) => s.key === 'lang-bg')?.count === 2)
check('başlangıçta choices eksik', choicesComplete(he) === false)
// seç
he.choiceSelections['lang-subrace'] = ['Draconic']
he.choiceSelections['lang-bg'] = ['Giant', 'Orc']
const wizCantrip = (await import('@/data')).spellsForClass('wizard').find((s) => s.level === 0)!
he.raceCantripIds = [wizCantrip.id]
he = recomputeDerived(he)
check('choices tamam', choicesComplete(he) === true)
check('composeProficiencies seçilen dilleri içerir', /Draconic/.test(he.otherProficienciesLanguages) && /Giant/.test(he.otherProficienciesLanguages))

// Half-Elf: +2 skill + 1 dil
let hef = emptyCharacter()
hef.raceId = 'half-elf'; hef.classId = 'bard'; hef.backgroundId = 'charlatan'
hef = recomputeDerived(hef)
slots = collectChoiceSlots(hef)
check('Half-Elf: skill slotu count 2', slots.find((s) => s.type === 'skill')?.count === 2)
check('Half-Elf: ırk dil slotu', slots.some((s) => s.key === 'lang-race'))
hef.raceExtraSkills = ['Arcana', 'History']
hef = recomputeDerived(hef)
check('Half-Elf extra skill proficient sayılır', (await import('@/lib/rules')).isSkillProficient(hef, 'Arcana'))

// Dwarf: tool slotu
let dw = emptyCharacter()
dw.raceId = 'dwarf'; dw.classId = 'fighter'; dw.backgroundId = 'soldier'
dw = recomputeDerived(dw)
check('Dwarf: tool slotu 3 seçenekli', collectChoiceSlots(dw).find((s) => s.type === 'tool')?.options?.length === 3)

// prune: ırk değişince eski skill temizlenir
let sw = { ...hef, raceId: 'dwarf', subraceId: 'mountain-dwarf' }
sw = recomputeDerived(sw as any)
check('ırk Dwarf olunca raceExtraSkills temizlenir', sw.raceExtraSkills.length === 0)

// ---- 5) Ekipman & envanter ----
console.log('\n[Ekipman & envanter]')
{
  const { items, itemById, startingWealth, toolGuideForItem, conditions } = await import('@/data')
  const { CLASS_STARTING_EQUIPMENT, resolveFilter } = await import('@/data/starting-equipment')
  const { BACKGROUND_STARTING_EQUIPMENT } = await import('@/data/background-equipment')
  const { buildInventory, remainingGoldGp, startingGoldGp, pendingEquipChoices, choiceKey, optionPickKey, fixedPickKey, currencyFromGp, inventoryWeight, armorClassFrom } =
    await import('@/lib/inventory')
  const { classes, backgrounds } = await import('@/data')

  // veri bütünlüğü: tüm referans verilen item id'leri gerçekten var mı
  const missing: string[] = []
  for (const [cid, eq] of Object.entries(CLASS_STARTING_EQUIPMENT)) {
    for (const g of eq.fixed) if (!itemById(g.itemId)) missing.push(`${cid}.fixed:${g.itemId}`)
    for (const ch of eq.choices)
      for (const o of ch.options) {
        for (const g of o.grants ?? []) if (!itemById(g.itemId)) missing.push(`${cid}.${ch.id}.${o.id}:${g.itemId}`)
        if (o.pick && resolveFilter(o.pick.from).length < o.pick.count) missing.push(`${cid}.${ch.id}.${o.id}: pick havuzu yetersiz`)
      }
    for (const p of eq.fixedPicks ?? []) if (resolveFilter(p.from).length < p.count) missing.push(`${cid}.pick.${p.id}: havuz yetersiz`)
  }
  for (const [bid, eq] of Object.entries(BACKGROUND_STARTING_EQUIPMENT)) {
    for (const g of eq.fixed) if (!itemById(g.itemId)) missing.push(`${bid}.fixed:${g.itemId}`)
    for (const ch of eq.choices ?? [])
      for (const o of ch.options) for (const g of o.grants ?? []) if (!itemById(g.itemId)) missing.push(`${bid}.${ch.id}.${o.id}:${g.itemId}`)
    for (const p of eq.fixedPicks ?? []) if (resolveFilter(p.from).length < p.count) missing.push(`${bid}.pick.${p.id}: havuz yetersiz`)
  }
  check('tüm ekipman referansları geçerli', missing.length === 0, missing.join(', '))

  check('12 sınıfın hepsinde başlangıç ekipmanı var', classes.every((c) => Boolean(CLASS_STARTING_EQUIPMENT[c.id])))
  check('13 geçmişin hepsinde ekipman+altın var', backgrounds.every((b) => Boolean(BACKGROUND_STARTING_EQUIPMENT[b.id])))
  check('12 sınıfın başlangıç serveti var', classes.every((c) => startingWealth.some((w) => w.classId === c.id)))
  check('paket içerikleri çözülüyor', items.filter((i) => i.category === 'pack').every((p) => (p.contents ?? []).every((c) => Boolean(itemById(c.itemId)))))
  check('herbalism kit alet rehberi var', Boolean(toolGuideForItem('herbalism-kit')?.sampleDCs.length))
  check('lute -> müzik aleti rehberine bağlı', toolGuideForItem('lute')?.id === 'musical-instruments')
  check('15 durum parse edildi', conditions.length === 15)
  check('exhaustion 6 seviyeli', conditions.find((c) => c.id === 'exhaustion')?.levels?.length === 6)

  // AC hesabı
  check('zırhsız AC = 10 + Dex', armorClassFrom(undefined, 3, false) === 13)
  check('deri zırh AC 11 + Dex', armorClassFrom(itemById('leather'), 3, false) === 14)
  check('pullu zırh Dex maks 2', armorClassFrom(itemById('scale-mail'), 3, false) === 16)
  check('zincir zırh sabit 16', armorClassFrom(itemById('chain-mail'), 3, false) === 16)
  check('kalkan +2', armorClassFrom(itemById('chain-mail'), 3, true) === 18)

  // hazır paket akışı: Barbarian + Soldier
  let barbEq = emptyCharacter()
  barbEq.raceId = 'dwarf'; barbEq.subraceId = 'mountain-dwarf'; barbEq.classId = 'barbarian'; barbEq.backgroundId = 'soldier'
  barbEq.baseAbilityScores = { Strength: 15, Dexterity: 13, Constitution: 15, Intelligence: 8, Wisdom: 12, Charisma: 10 }
  barbEq = recomputeDerived(barbEq)
  check('ekipman seçimleri başta eksik', pendingEquipChoices(barbEq).length > 0)

  barbEq.equipChoices[choiceKey('class', 'main-weapon')] = 'b'
  barbEq.equipPicks[optionPickKey('class', 'main-weapon', 'b')] = ['greatsword']
  barbEq.equipChoices[choiceKey('class', 'side-weapon')] = 'a'
  barbEq.equipPicks[fixedPickKey('bg', 'bg-gaming-set')] = ['dice-set']
  barbEq = recomputeDerived(barbEq)
  check('ekipman seçimleri tamamlandı', pendingEquipChoices(barbEq).length === 0, JSON.stringify(pendingEquipChoices(barbEq)))

  const inv = buildInventory(barbEq)
  const has = (id: string) => inv.find((e) => e.itemId === id)
  check('seçilen martial silah envanterde', Boolean(has('greatsword')))
  check('2 el baltası envanterde', has('handaxe')?.qty === 2)
  check('4 cirit envanterde', has('javelin')?.qty === 4)
  check("kaşif çantası envanterde", Boolean(has('explorers-pack')))
  check('geçmiş eşyası envanterde', Boolean(has('rank-insignia')))
  check('seçilen oyun seti envanterde', Boolean(has('dice-set')))
  check('soldier 10 gp verir', startingGoldGp(barbEq) === 10)
  check('hazır pakette altın harcanmaz', remainingGoldGp(barbEq) === 10)
  check('currency GP=10', barbEq.currency.GP === 10)
  check('oyun seti yeterlilik metnine girdi', barbEq.otherProficienciesLanguages.includes('Dice set'))
  check('ekipman metni derlendi', barbEq.equipment.includes('Greatsword'))
  check('envanter ağırlığı > 0', inventoryWeight(barbEq) > 0)

  // altın modu: Fighter + Noble
  let ft = emptyCharacter()
  ft.raceId = 'human'; ft.classId = 'fighter'; ft.backgroundId = 'noble'
  ft.baseAbilityScores = { Strength: 15, Dexterity: 14, Constitution: 14, Intelligence: 10, Wisdom: 10, Charisma: 12 }
  ft.startingKit = { mode: 'gold', goldRolled: 100, goldRollDice: [4, 3, 2, 1] }
  ft.equipPicks[fixedPickKey('bg', 'bg-gaming-set')] = ['dragonchess-set']
  ft.purchases = [{ itemId: 'chain-mail', qty: 1 }, { itemId: 'longsword', qty: 1 }]
  ft = recomputeDerived(ft)
  check('altın modu: sınıf ekipmanı gelmez', !buildInventory(ft).some((e) => e.source === 'class'))
  check('altın: 100 + noble 25 = 125', startingGoldGp(ft) === 125)
  check('harcama sonrası kalan 35 gp', remainingGoldGp(ft) === 35, `got ${remainingGoldGp(ft)}`)
  check('satın alınan zırh giyildi', ft.equippedArmorId === 'chain-mail')
  check('AC 16 (chain mail, Dex sayılmaz)', ft.armorClass === 16, `got ${ft.armorClass}`)
  check('Str 15 < 13? hayır — hız cezası yok', ft.speed === 30, `got ${ft.speed}`)

  // Str şartı karşılanmayınca hız -10
  let weak = { ...ft, baseAbilityScores: { ...ft.baseAbilityScores, Strength: 8 } }
  weak = recomputeDerived(weak as any)
  check('Güç 8 + chain mail = hız 20', weak.speed === 20, `got ${weak.speed}`)

  // para bozdurma
  const cur = currencyFromGp(12.35)
  check('12.35 gp -> 12 gp 3 sp 5 cp', cur.GP === 12 && cur.SP === 3 && cur.CP === 5, JSON.stringify(cur))
}

// ---- 6) Alt sınıf verisi & metin biçimi ----
console.log('\n[Alt sınıflar]')
{
  const { classes, classById } = await import('@/data')
  const { subclassFeaturesAt, previewLevelUp } = await import('@/lib/levelup')

  // devam başlıkları ("Domain Büyüleri:", "Cantrip Nedir?") alt sınıf sayılmamalı
  const junk = classes.flatMap((c) => c.subclasses.filter((s) => /[:?]\s*$/.test(s.name) || !s.nameTr).map((s) => `${c.id}/${s.id}`))
  check('sahte alt sınıf yok', junk.length === 0, junk.join(', '))

  const dupes = classes.flatMap((c) => {
    const seen = new Set<string>()
    return c.subclasses.filter((s) => (seen.has(s.id) ? true : (seen.add(s.id), false))).map((s) => `${c.id}/${s.id}`)
  })
  check('alt sınıf id tekrarı yok', dupes.length === 0, dupes.join(', '))

  const counts: Record<string, number> = { barbarian: 2, bard: 2, cleric: 7, druid: 2, fighter: 3, monk: 3, paladin: 3, ranger: 2, rogue: 3, sorcerer: 2, warlock: 3, wizard: 8 }
  const wrong = classes.filter((c) => c.subclasses.length !== counts[c.id]).map((c) => `${c.id}=${c.subclasses.length}`)
  check('alt sınıf sayıları PHB ile uyumlu', wrong.length === 0, wrong.join(', '))

  check('tüm alt sınıf açıklamaları dolu', classes.every((c) => c.subclasses.every((s) => s.description.trim().length > 20)))
  check(
    'wizard 8 okulun hepsi açıklamalı',
    classById('wizard')!.subclasses.every((s) => s.description.includes('Savant') && s.description.length > 500),
  )

  // alt sınıf özellikleri sınıfın geneline sızmamalı
  const barb = classById('barbarian')!
  const lvl3 = (barb.levelFeatures['3'] ?? []).map((f) => f.name)
  check('Frenzy sınıf geneline yazılmadı', !lvl3.some((n) => /Frenzy/i.test(n)), lvl3.join(', '))
  check('Frenzy Berserker altında', subclassFeaturesAt('barbarian', 'path-of-the-berserker', 3).some((f) => /Frenzy/i.test(f.name)))
  check('Totem Spirit Berserker altinda yok', !subclassFeaturesAt('barbarian', 'path-of-the-berserker', 3).some((f) => /Totem/i.test(f.name)))

  // seçilen alt sınıfın özellikleri karaktere gelir, diğerininki gelmez
  let bb = emptyCharacter()
  bb.raceId = 'dwarf'; bb.subraceId = 'mountain-dwarf'; bb.classId = 'barbarian'; bb.backgroundId = 'soldier'
  bb.baseAbilityScores = { Strength: 15, Dexterity: 13, Constitution: 14, Intelligence: 8, Wisdom: 12, Charisma: 10 }
  bb.level = 3
  bb.subclassId = 'path-of-the-berserker'
  bb = recomputeDerived(bb)
  const names = bb.featuresAndTraits.map((f) => f.name)
  check('Berserker özelliği listede', names.some((n) => /Frenzy/i.test(n)))
  check('Totem Warrior özelliği listede DEĞİL', !names.some((n) => /Spirit Seeker|Totem Spirit/i.test(n)), names.join(', '))

  // level-up önizlemesi seçilen alt sınıfı hesaba katar
  let pre = emptyCharacter()
  pre.raceId = 'human'; pre.classId = 'barbarian'; pre.backgroundId = 'soldier'
  pre.baseAbilityScores = { Strength: 15, Dexterity: 13, Constitution: 14, Intelligence: 8, Wisdom: 12, Charisma: 10 }
  pre.level = 2
  pre = recomputeDerived(pre)
  const pv = previewLevelUp(pre, 'path-of-the-totem-warrior')
  check('3. seviye önizlemesi alt sınıf özelliği içerir', Boolean(pv?.features.some((f) => /Spirit Seeker/i.test(f.name))), (pv?.features ?? []).map((f) => f.name).join(', '))
}

console.log(`\n=== ${pass} geçti, ${fail} kaldı ===`)
if (fail > 0) process.exit(1)

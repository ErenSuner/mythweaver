// Küçük seçim kartları için kısa, tam TR açıklamalar (kesik "…" yok).
// Detay kartları guide açıklamasını aynen gösterir; bunlar yalnız kart özeti.

export const RACE_BLURBS: Record<string, string> = {
  dwarf: 'Dağların dayanıklı, klanına bağlı savaşçıları. Zehire dirençli, taş ustası.',
  elf: 'Zarif ve büyülü; keskin duyulu, uykuya ihtiyaç duymayan uzun ömürlü ırk.',
  halfling: 'Küçük, şanslı ve cesur. Fark edilmeden hayatta kalmakta usta.',
  human: 'Çok yönlü ve uyumlu; her yeteneğe hafif bonus alan dengeli ırk.',
  dragonborn: 'Ejderha soyundan; nefes silahı ve elementsel dirençle onurlu savaşçılar.',
  gnome: 'Meraklı ve yaratıcı; büyüye karşı dirençli, küçük mucit ırk.',
  'half-elf': 'İki dünyanın çocuğu; karizmatik, çok yönlü, iki serbest yetenek bonusu.',
  'half-orc': 'Güçlü ve dayanıklı; ölümün eşiğinde ayakta kalan sağlam savaşçılar.',
  tiefling: 'Cehennem soyundan; ateşe dirençli, karanlıkta gören, doğuştan büyülü.',
}

export const CLASS_BLURBS: Record<string, string> = {
  barbarian: 'Öfkesini silaha çeviren, en dayanıklı ön saf savaşçısı. Basit ve güçlü.',
  bard: 'Müzik ve sözle büyü yapan çok yönlü sanatçı; hem destek hem esneklik.',
  cleric: 'Tanrısının gücünü taşıyan kutsal savaşçı; iyileştirme ve ilahi büyü.',
  druid: 'Doğanın koruyucusu; hayvana dönüşür, elementleri ve doğa büyüsünü kullanır.',
  fighter: 'Silah ustası; en esnek savaşçı, her dövüş tarzına uyum sağlar.',
  monk: 'Bedenini silah yapan disiplinli dövüşçü; hız ve çeviklikle savaşır.',
  paladin: 'Yemine bağlı kutsal şövalye; ağır zırh, ilahi güç ve koruma.',
  ranger: 'Vahşi doğanın avcısı; iz sürer, uzaktan vurur, doğa büyüsü kullanır.',
  rogue: 'Kurnaz ve çevik; gizlilik, hile ve öldürücü sinsi saldırı ustası.',
  sorcerer: 'Doğuştan büyü gücü taşıyan; büyüyü esnetip bükebilen içgüdüsel büyücü.',
  warlock: 'Güçlü bir varlıkla pakt yapan; benzersiz büyü sistemiyle karanlık güç.',
  wizard: 'Büyüyü çalışarak öğrenen usta; en geniş büyü kitaplığına sahip.',
}

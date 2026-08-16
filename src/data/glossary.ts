// Jargon sözlüğü — yeni oyuncu için tekrar bakılabilir terim tanımları.
// RuleText içinde geçen terimler tıklanabilir olur ve GlossaryModal açar.
// Info kutuları tek seferliktir; bu sözlük kalıcıdır (her yerde erişilir).

export interface GlossaryTerm {
  id: string
  /** metinde eşleşecek birincil terim (İngilizce) */
  term: string
  /** ek eşleşme sözcükleri (kısaltma, Türkçe karşılık vb.) */
  aliases?: string[]
  tr: string
  description: string
}

export const glossary: GlossaryTerm[] = [
  {
    id: 'modifier',
    term: 'modifier',
    aliases: ['modifiye'],
    tr: 'Bonus / Düzeltici',
    description:
      'Bir yetenek puanının oyundaki gerçek etkisi. Formül: (puan − 10) ÷ 2 (aşağı yuvarlanır). Örn. 14 puan = +2 modifier. Saldırı, kurtarma ve beceri atışlarına bu sayı eklenir.',
  },
  {
    id: 'proficiency-bonus',
    term: 'proficiency bonus',
    aliases: ['proficiency', 'yeterlilik bonusu', 'yeterlilik'],
    tr: 'Yeterlilik Bonusu',
    description:
      'Ustalaştığın (proficient) şeylerde atışlarına eklenen, seviyene bağlı bonus. 1-4. seviyede +2, sonra kademeli artar (17. seviyede +6). Yeterli olduğun silah, beceri, kurtarma ve büyülerde uygulanır.',
  },
  {
    id: 'hit-die',
    term: 'hit die',
    aliases: ['hit dice', 'vuruş zarı', 'hit point die'],
    tr: 'Vuruş Zarı',
    description:
      'Sınıfının can (HP) zarı. Her seviyede bu zarı atarak (ya da ortalamasını alarak) + Constitution modifier kadar HP kazanırsın. Short Rest sırasında da HP geri kazanmak için harcanır.',
  },
  {
    id: 'armor-class',
    term: 'armor class',
    aliases: ['AC'],
    tr: 'Zırh Sınıfı',
    description:
      'Sana vurmanın ne kadar zor olduğu. Bir düşmanın saldırı atışı senin AC’ne eşit veya üstündeyse saldırı isabet eder. Zırh, kalkan ve Dexterity modifier ile belirlenir.',
  },
  {
    id: 'initiative',
    term: 'initiative',
    aliases: ['inisiyatif'],
    tr: 'İnisiyatif',
    description:
      'Savaşta sıranın kimde olduğunu belirler. Savaş başında Dexterity modifier ekleyerek d20 atarsın; yüksek sonuç daha erken hareket eder.',
  },
  {
    id: 'saving-throw',
    term: 'saving throw',
    aliases: ['saving throws', 'kurtarma', 'kurtarma atışı'],
    tr: 'Kurtarma Atışı',
    description:
      'Bir tehlikeden (büyü, zehir, tuzak) kaçınmak için attığın d20. İlgili yetenek modifier’ı eklenir; o kurtarmada proficient isen yeterlilik bonusu da eklenir. Bir hedef DC’yi tutturursa etkiden kurtulur ya da hasarı azaltır.',
  },
  {
    id: 'passive-perception',
    term: 'passive perception',
    aliases: ['pasif algı'],
    tr: 'Pasif Algılama',
    description:
      'Zar atmadan sürekli farkındalığın. Değeri 10 + Wisdom (Perception) modifier’ın. Gizli kapı, pusu ya da saklanan yaratıkları DM bu sayıya bakarak fark edip etmediğini belirler.',
  },
  {
    id: 'cantrip',
    term: 'cantrip',
    aliases: ['cantripler', 'cantrip’ler'],
    tr: '0. Seviye Büyü',
    description:
      'Slot harcamayan, istediğin kadar kullanabileceğin büyü. Seviye atladıkça bazıları güçlenir. Fire Bolt, Mage Hand gibi.',
  },
  {
    id: 'spell-slot',
    term: 'spell slot',
    aliases: ['spell slots', 'büyü slotu', 'slot'],
    tr: 'Büyü Slotu',
    description:
      'Seviyeli (1+) büyü yapmak için harcanan günlük kaynak. Bir büyüyü kullanınca uygun seviyede bir slot tükenir; slotlar Long Rest ile yenilenir. Cantrip’ler slot harcamaz.',
  },
  {
    id: 'spell-save-dc',
    term: 'spell save dc',
    aliases: ['save dc', 'büyü kurtarma DC', 'kurtarma DC'],
    tr: 'Büyü Kurtarma DC’si',
    description:
      'Büyünden etkilenen hedefin geçmesi gereken zorluk sayısı. 8 + yeterlilik bonusu + büyü yeteneği modifier’ın. Hedef kurtarma atışında bunu tutturamazsa büyünün tam etkisini yer.',
  },
  {
    id: 'spell-attack-bonus',
    term: 'spell attack bonus',
    aliases: ['büyü saldırı bonusu'],
    tr: 'Büyü Saldırı Bonusu',
    description:
      'Hedefi tutturmak için atış gerektiren büyülerde (Fire Bolt gibi) saldırı atışına eklediğin sayı. Yeterlilik bonusu + büyü yeteneği modifier’ın.',
  },
  {
    id: 'concentration',
    term: 'concentration',
    aliases: ['konsantrasyon'],
    tr: 'Konsantrasyon',
    description:
      'Bazı büyüler sürerken odaklanma gerektirir. Aynı anda yalnızca bir konsantrasyon büyüsü tutabilirsin. Hasar alınca Constitution kurtarması (DC 10 ya da hasarın yarısı) atarsın; başarısız olursan büyü sonlanır.',
  },
  {
    id: 'advantage',
    term: 'advantage',
    aliases: ['avantaj'],
    tr: 'Avantaj',
    description:
      'İki d20 at, yükseğini kullan. Elverişli bir durumdayken (örn. düşman görünmezliğini kaybettiğinde) uygulanır.',
  },
  {
    id: 'disadvantage',
    term: 'disadvantage',
    aliases: ['dezavantaj'],
    tr: 'Dezavantaj',
    description: 'İki d20 at, düşüğünü kullan. Elverişsiz bir durumdayken (örn. karanlıkta nişan alırken) uygulanır.',
  },
  {
    id: 'long-rest',
    term: 'long rest',
    aliases: ['uzun dinlenme'],
    tr: 'Uzun Dinlenme',
    description:
      'En az 8 saatlik dinlenme. HP’nin tamamını, harcanan spell slotları ve çoğu sınıf kaynağını (rage, ki vb.) geri kazandırır. Günde bir kez yararlanılabilir.',
  },
  {
    id: 'short-rest',
    term: 'short rest',
    aliases: ['kısa dinlenme'],
    tr: 'Kısa Dinlenme',
    description:
      'En az 1 saatlik mola. Hit Dice harcayarak HP geri kazanabilirsin; Warlock slotları, Fighter Action Surge gibi bazı özellikler burada yenilenir.',
  },
  {
    id: 'darkvision',
    term: 'darkvision',
    aliases: ['karanlıkta görüş'],
    tr: 'Karanlıkta Görüş',
    description:
      'Belirli bir menzil içinde (genelde 60 feet) karanlığı loş ışık gibi görürsün; loş ışığı ise parlak ışık gibi. Renkleri değil gri tonları görürsün. Birçok ırkın doğuştan yeteneği.',
  },
  {
    id: 'expertise',
    term: 'expertise',
    aliases: ['uzmanlık'],
    tr: 'Uzmanlık',
    description:
      'Bir beceri veya araçta yeterlilik bonusunun iki katını alırsın. Rogue ve Bard gibi sınıfların imza yeteneği.',
  },
]

const BY_ID = new Map(glossary.map((g) => [g.id, g]))
export const glossaryById = (id: string) => BY_ID.get(id)

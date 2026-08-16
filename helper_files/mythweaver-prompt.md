# Mythweaver — Muse Spark 1.2 Build Prompt

## Uygulama Özeti
"Mythweaver" adında, D&D 5e için adım adım karakter oluşturma sihirbazı (wizard) uygulaması yap. Uygulama iki referans dosyasını kullanacak:

1. **`dnd5e_ultimate_character_creation_guide.md`** — Tüm oyun kuralı verisinin kaynağı (Bölüm 1: Irklar, Bölüm 2: Sınıflar — 1. ile 20. seviye arası tüm sınıf özellikleri ve subclass'lar dahil, Bölüm 3: Background'lar, ve sınıf bazlı büyü listeleri).
2. **`5E_CharacterSheet_Fillable.pdf`** — Resmi WotC karakter sayfası şablonu. Uygulamanın veri modeli ve nihai "karakter kartı" görünümü, bu sheet'teki TÜM alanları birebir kapsamalı: Character Name, Class & Level, Background, Player Name, Race, Alignment, Experience Points, altı Ability Score + modifier, Saving Throws (proficiency işaretli), 18 Skill (proficiency işaretli, ability bazlı), Passive Wisdom (Perception), Inspiration, Proficiency Bonus, Armor Class, Initiative, Speed, Hit Point Maximum, Current HP, Temporary HP, Hit Dice, Death Saves, Attacks & Spellcasting tablosu, Equipment (CP/SP/EP/GP/PP + eşya listesi), Other Proficiencies & Languages, Features & Traits, Personality Traits, Ideals, Bonds, Flaws; ikinci sayfa: Age/Height/Weight/Eyes/Skin/Hair, Character Appearance, Character Backstory, Allies & Organizations (+ Symbol), Additional Features & Traits, Treasure; büyücü sınıflarında üçüncü sayfa: Spellcasting Class, Spellcasting Ability, Spell Save DC, Spell Attack Bonus, Cantrips + 1-9 seviye spell slot/known tabloları.

Hedef kitle: D&D'ye tamamen yeni başlayan oyuncular. Bu yüzden her adımda açıklayıcı, öğretici, sabırlı bir ton kullan — jargonu asla açıklamasız bırakma.

## Veri Kaynağı
- Yüklenen character creation guide dosyasını (13.000+ satır; Irklar/Sınıflar/Background/Büyüler olarak bölümlenmiş) oku ve içindeki ırk, sınıf (seviye seviye özellik kazanımları dahil), background, skill, equipment ve büyü bilgilerini yapılandırılmış JSON veri dosyalarına dönüştür (örn. `races.json`, `classes.json` — her sınıf için `levelFeatures: { [level]: Feature[] }` şeklinde bir yapı, `backgrounds.json`, `spells.json`).
- Tüm oyun kuralı verisi bu statik JSON'lardan gelsin — LLM çağrısı ile kural üretilmesin, sadece dosyadaki içerik kullanılsın.
- Karakter sayfası PDF'i, veri modelinin (character schema) taban alanlarını belirlesin — uygulamanın state şeması bu alanların hepsini içermeli, hiçbiri atlanmamalı.
- Dosyada eksik/belirsiz bir kural varsa, uydurma; bunun yerine placeholder bırak ve bana not düş.

## Akış (Adım Adım Sihirbaz)
Sihirbaz, resmi karakter sayfasındaki HER alanı dolduracak şekilde ilerlesin — sadece ırk/sınıf/background seçimi değil, tam bir sheet doldurma deneyimi olsun. Her adımda geri dönülebilsin ve ilerleme kaybolmasın:

1. **Hoş Geldin / Giriş** — D&D'nin ne olduğuna dair kısa, sıcak bir açıklama; karakter oluşturmanın ne anlama geldiği.
2. **Irk (Race) Seçimi** — Her ırk kısa açıklama + ırksal özellikler ile kart şeklinde gösterilsin. Seçilince ability score bonusları, hız, dil, özel yetenekler otomatik uygulansın. Subrace varsa seçim adımı eklensin.
3. **Sınıf (Class) Seçimi** — Her sınıf için oynanış tarzı açıklaması. Hit dice, primary ability, saving throw proficiency, armor/weapon/tool proficiency, skill seçenekleri gösterilsin.
4. **Yetenek Puanları (Ability Scores) — Point Buy** — İnteraktif point buy arayüzü (standart D&D 5e point buy kuralları: 27 puan, 8-15 aralığı, maliyet tablosu dosyadan okunacak). Her yetenek puanının ne işe yaradığı kısa açıklamalarla gösterilsin. Irk bonusları otomatik yansısın; modifier'lar canlı hesaplansın.
5. **Geçmiş (Background) Seçimi** — Background kartları, verdiği skill/tool/language proficiency, equipment ve feature ile. Personality Trait / Ideal / Bond / Flaw için önerilen tablo (d8 vb.) gösterilsin; kullanıcı zar atabilir veya kendisi serbest metin girebilir.
6. **Yetenekler / Beceriler (Skills & Saving Throws)** — Sınıf ve background'dan gelen proficiency'ler otomatik işaretlensin, kalan seçimlik skill'ler açıklamalı checkbox ile seçilsin. Passive Wisdom (Perception) otomatik hesaplansın.
7. **Zırh, Silah & Ekipman Seçimi** — Sınıf/background'a göre başlangıç ekipman seçenekleri (silah/zırh seçim dallanmaları dahil — örn. "büyük balta ya da herhangi bir savaş silahı"). AC (Armor Class) seçilen zırha göre otomatik hesaplansın. Para birimi (CP/SP/EP/GP/PP) alanları doldurulsun.
8. **Diller & Diğer Yeterlilikler** — Irk/sınıf/background'dan gelen diller ve tool proficiency'ler otomatik toplanıp "Other Proficiencies & Languages" alanına yazılsın; ekstra dil seçimi varsa burada sorulsun.
9. **Büyüler (Spellcasting)** — Eğer sınıf büyücüyse: Spellcasting Ability, Spell Save DC, Spell Attack Bonus otomatik hesaplansın; cantrip ve seviye 1 spell'lerden seçim yaptırılsın (dosyadaki sınıf bazlı büyü listelerinden). Büyücü değilse bu adım otomatik atlansın.
10. **Kimlik & Görünüm** — Karakter adı, Player Name, Alignment, Age, Height, Weight, Eyes, Skin, Hair, Character Appearance (serbest metin).
11. **Kişilik & Hikaye** — Personality Traits, Ideals, Bonds, Flaws (background adımından gelenler burada düzenlenebilir), Character Backstory, Allies & Organizations, Treasure (opsiyonel serbest metin alanları).
12. **Özet & Karakter Kartı** — Tüm seçimlerin toplandığı, resmi sheet'e sadık final karakter kartı görünümü.

Her adımda: "Bu ne işe yarar?" tarzı kısa tooltip/info kutucukları olsun. İlerleme çubuğu (progress bar) üstte görünsün.

## Seviye Atlama (Level Up) ve "Yeni Kazanılanlar" Vurgusu
- Karakter kartında bir **Level Up** akışı olmalı: kullanıcı seviyeyi artırdığında (örn. 1 → 2), o sınıfın ilgili seviyede kazandırdığı tüm yeni özellikler (guide'daki `levelFeatures` verisinden) otomatik olarak karaktere eklensin. HP artışı (hit die + CON modifier), Ability Score Improvement seviyeleri, Extra Attack, subclass seçim seviyeleri gibi özel durumlar da bu akışta ele alınsın (gerekiyorsa ek seçim adımı açılsın, örn. ASI'de hangi stat artırılacak).
- **Features & Traits** listesinde her özellik, hangi seviyede kazanıldığını gösteren küçük bir etiket taşısın (örn. "Lv. 3").
- Karakterin **mevcut seviyesinde sahip olduğu tüm özellikler** listede görünsün (kümülatif — geçmiş seviyelerden kazanılanlar dahil).
- **En son seviye atlamasında kazanılan özellikler yeşil renkte / "YENİ" rozetiyle** işaretlensin, böylece kullanıcı bir önceki seviyeye göre neyin yeni eklendiğini bir bakışta ayırt edebilsin. Bu vurgu, kullanıcı bir sonraki seviye atlamasına kadar (veya bilinçli olarak "gördüm" deyip kapatana kadar) kalıcı olsun.
- Seviye atlama geçmişi (hangi seviyede ne kazanıldığı) karakterin verisinde saklanmalı ki bu vurgulama her zaman doğru çalışsın.

## Çoklu Karakter Yönetimi & Kullanıcı Hesabı (Supabase)
- Uygulama bir **kullanıcı girişi (auth)** sistemi içersin — Supabase Auth (email/şifre veya magic link, tercihen ikisi de) kullanılsın.
- Giriş yaptıktan sonra kullanıcıyı bir **"Karakterlerim"** ana ekranı karşılasın: kullanıcının daha önce oluşturduğu tüm karakterler kart/liste halinde gösterilsin (isim, ırk, sınıf, seviye özet bilgisiyle).
- **"Yeni Karakter Oluştur"** butonu ile sihirbaz akışı başlatılsın; tamamlanan/yarım kalan karakterler otomatik kaydedilsin (adım adım ilerlerken de ara ara kaydedilsin ki kullanıcı yarıda bırakıp geri dönebilsin).
- Her karakter Supabase veritabanında kullanıcıya bağlı bir satır olarak **kalıcı** saklansın (tam karakter sheet verisi + seviye atlama geçmişi + "son kazanılan özellikler" state'i dahil, JSON/jsonb kolon olarak tutulabilir).
- Kullanıcı bir karaktere tıklayınca o karakterin tam sayfasına gidilsin: görüntüleme, düzenleme (yetenek düzenleme, ekipman güncelleme, level up) ve silme mümkün olsun.
- Row Level Security (RLS) ile her kullanıcı sadece kendi karakterlerini görebilsin/düzenleyebilsin — Supabase tarafında bu güvenlik kuralı kurulsun.

## Çıktı
- Uygulama içinde interaktif, resmi WotC sheet'ine sadık, güzel tasarlanmış tam bir karakter kartı gösterilsin (tüm alanlar: istatistikler, ırk/sınıf/background özellikleri, ekipman, kişilik/hikaye, büyüler dahil).
- Kullanıcı istediği karakteri **JSON olarak indirebilsin** (başka bir sisteme aktarım için) — karakter sayfasında bir "Export JSON" butonu.
- PDF/resim export şart değil, JSON export yeterli.

## Görsel Tema
- Türkçe arayüz.
- Fantastik/atmosferik tema: koyu, mistik tonlar (lacivert, bordo, eski altın/bronz vurgular), parşömen/rün dokuları çağrıştıran ama okunabilir bir tipografi.
- "Mythweaver" ismine uygun: karakter yaratımı bir "efsane dokuma" ritüeli gibi hissettirilsin — geçişlerde/başlıklarda bu temayı destekleyen dil kullan (örn. "İpliğini seç" yerine adım başlıkları hikaye anlatıcılığı hissi versin, ama abartıp kullanılabilirliği bozma).
- Mobil ve masaüstünde düzgün çalışsın (responsive).

## Teknik Notlar
- Kalıcılık artık Supabase üzerinden sağlandığı için localStorage'a ihtiyaç yok; sihirbazın her adımı Supabase'e ara kayıt (auto-save/draft) yapmalı ki bağlantı kopsa/sayfa kapansa bile ilerleme kaybolmasın.
- Point buy hesaplama mantığı, level-up özellik tabloları ve tüm kural verisi dosyadan (guide'dan çıkarılan JSON) okunmalı, hardcode edilmiş varsayımlarla değil.
- Karakter veri şeması (character schema), `5E_CharacterSheet_Fillable.pdf`'teki tüm alanları bire bir karşılayacak şekilde tasarlanmalı — ability scores + modifiers, saving throws (proficiency flag), 18 skill (proficiency flag + ability bağlantısı), combat stats (AC/initiative/speed/HP/hit dice/death saves), attacks & spellcasting tablosu, equipment + currency, other proficiencies & languages, features & traits (seviye etiketli), personality/ideals/bonds/flaws, appearance/backstory/allies/treasure, ve spellcasting sayfası (varsa).
- Supabase şeması en az şu tabloları içermeli: `users` (Supabase Auth ile gelir), `characters` (kullanıcıya FK, tam karakter JSON'u + seviye/level-up geçmişi + son güncelleme zamanı).

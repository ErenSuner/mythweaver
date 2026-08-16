import { Info } from '@/components/ui'

export default function StepWelcome() {
  return (
    <div className="stack">
      <p>
        <b>Dungeons &amp; Dragons</b>, hayal gücüyle oynanan bir masaüstü rol yapma oyunudur. Sen bir kahraman
        canlandırırsın; bir anlatıcı (Dungeon Master) dünyayı betimler, sen de kararlar verir ve zar atarak sonuçları
        belirlersin.
      </p>
      <p>
        <b>Karakter oluşturmak</b>, bu kahramanı tanımlamaktır: hangi ırktan geldiği, ne tür bir savaşçı ya da büyücü
        olduğu, neyde iyi olduğu ve nasıl bir geçmişe sahip olduğu. Bu sihirbaz seni adım adım, resmi karakter
        sayfasındaki her alanı dolduracak şekilde yönlendirecek.
      </p>
      <Info>
        Endişelenme — her adımda ne yaptığını açıklayacağız. İstediğin an geri dönebilir, seçimlerini
        değiştirebilirsin. İlerlemen otomatik kaydedilir.
      </Info>
      <p className="hint">Hazır olduğunda "İleri" de ve efsaneni dokumaya başla.</p>
    </div>
  )
}

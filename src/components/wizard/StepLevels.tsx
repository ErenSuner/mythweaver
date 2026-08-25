import { Info } from '@/components/ui'
import LevelUpPanel from '@/components/sheet/LevelUpPanel'
import { useChar } from './useChar'

/* Hedef seviyeye kadar seviye atlama adımı.
   Paralel bir mantık yazılmaz: karakter sayfasındaki LevelUpPanel aynı
   store üzerinde çalıştığı için doğrudan yeniden kullanılır. Her seviye
   uygulandığında store'daki karakter değişir, panel bir sonraki seviye
   için yeniden kurulur (key={character.level}). */

export default function StepLevels() {
  const { character } = useChar()
  const target = character.startingLevel ?? 1
  const done = character.level >= target

  if (done) {
    return (
      <div className="stack">
        <Info>
          Karakterin <b>seviye {character.level}</b> olarak hazır. Kazandığın özellikler karakter kartında yeşil{' '}
          <b>&quot;YENİ&quot;</b> rozetiyle işaretli — özet adımında hepsini görebilirsin.
        </Info>
        <p className="hint">İleri diyerek devam et.</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <Info>
        Hedef <b>seviye {target}</b>. Şu an <b>seviye {character.level}</b>. Kalan {target - character.level} seviye
        tek tek uygulanacak; her seviyede o seviyenin gerektirdiği seçimler sorulur.
      </Info>

      {/* key: seviye değişince panelin iç seçimleri sıfırlansın */}
      <LevelUpPanel key={character.level} onClose={() => {}} hideClose />
    </div>
  )
}

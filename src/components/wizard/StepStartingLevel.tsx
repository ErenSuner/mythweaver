import { Info } from '@/components/ui'
import { useChar } from './useChar'

/* Bazı masalar 1. seviyeden başlamaz. Burada hedef seviye seçilir; sonraki
   "Seviyeleri Yükselt" adımı 1'den o seviyeye kadar her seviyenin sorularını
   (alt sınıf, ASI/feat, sınıf seçimleri) tek tek sorar. */

const MAX_LEVEL = 20
// Masalarda en sık kullanılan başlangıçlar; gerisi tam listeden seçilir.
const COMMON = [1, 3, 5, 10]

export default function StepStartingLevel() {
  const { character, update } = useChar()
  const target = character.startingLevel ?? 1
  // Seviye atlandıktan sonra geri alınamaz: uygulanan kazanımlar geri sökülmüyor.
  const floor = character.level

  function pick(level: number) {
    if (level < floor) return
    update({ startingLevel: level })
  }

  return (
    <div className="stack">
      <p>
        Karakterler genelde <b>1. seviyeden</b> başlar, ama bazı hikâyeler deneyimli maceracılarla açılır. Dungeon
        Master&apos;ın sana bir başlangıç seviyesi söylediyse burada seç.
      </p>

      <div>
        <label>Sık kullanılanlar</label>
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          {COMMON.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`tab${target === lv ? ' active' : ''}`}
              aria-pressed={target === lv}
              disabled={lv < floor}
              onClick={() => pick(lv)}
            >
              Seviye {lv}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="starting-level">Başlangıç seviyesi</label>
        <select
          id="starting-level"
          value={target}
          onChange={(e) => pick(Number(e.target.value))}
          style={{ maxWidth: 220 }}
        >
          {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((lv) => (
            <option key={lv} value={lv} disabled={lv < floor}>
              Seviye {lv}
              {lv < floor ? ' — geçildi' : ''}
            </option>
          ))}
        </select>
      </div>

      {target > 1 ? (
        <Info>
          Önce 1. seviye karakterini normal şekilde kuracaksın. Sonra <b>Seviyeleri Yükselt</b> adımında{' '}
          {target - 1} seviyenin kazanımları tek tek sorulacak: alt sınıf, yetenek artışı ya da feat, ve sınıfına özel
          seçimler. Bu, karakter sayfasındaki &quot;Seviye Atla&quot; akışının aynısı.
        </Info>
      ) : (
        <p className="hint">1. seviyede kalırsan bu adımdan sonra doğrudan devam edersin.</p>
      )}

      {floor > 1 && (
        <p className="hint">
          Şu an <b>seviye {floor}</b>&apos;desin. Kazanılan seviyeler geri alınamadığı için daha düşük bir başlangıç
          seçilemiyor. Daha düşük seviyeli bir karakter istiyorsan yeni bir karakter oluştur.
        </p>
      )}
    </div>
  )
}

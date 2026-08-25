import { config } from '@/data'
import { Info, Tip } from '@/components/ui'
import { useChar } from './useChar'
import { ABILITIES, type Ability } from '@/types/data'
import { abilityModifier, formatMod, pointBuyCost, pointBuyRemaining, raceBonuses } from '@/lib/rules'

const ABILITY_HELP: Record<Ability, string> = {
  Strength: 'Fiziksel güç; yakın dövüş saldırıları ve ağır kaldırma.',
  Dexterity: 'Çeviklik; nişancılık, zırhsız savunma (AC), inisiyatif ve gizlenme.',
  Constitution: 'Dayanıklılık; can puanını (HP) doğrudan etkiler.',
  Intelligence: 'Akıl; Wizard büyüsü, bilgi ve araştırma.',
  Wisdom: 'Sezgi; Cleric/Druid büyüsü, algılama ve içgörü.',
  Charisma: 'Karizma; Sorcerer/Bard/Paladin/Warlock büyüsü ve sosyal etkileşim.',
}

export default function StepAbilities() {
  const { character, updateFn } = useChar()
  const { min, max, totalPoints } = config.pointBuy
  const remaining = pointBuyRemaining(character.baseAbilityScores)
  const rb = raceBonuses(character)

  function change(a: Ability, delta: number) {
    updateFn((c) => {
      const cur = c.baseAbilityScores[a]
      const next = cur + delta
      if (next < min || next > max) return
      // yeni maliyet toplamı totalPoints'i aşmasın
      const trial = { ...c.baseAbilityScores, [a]: next }
      const spent = ABILITIES.reduce((s, k) => s + (config.pointBuy.cost[String(trial[k])] ?? 0), 0)
      if (spent > totalPoints) return
      c.baseAbilityScores[a] = next
    })
  }

  return (
    <div className="stack">
      <Info>
        <b>Point Buy</b> yöntemi: {totalPoints} puanın var. Her yetenek 8 ile 15 arasında; yükseldikçe daha pahalıya
        mal olur. Irk bonusların otomatik eklenir. <b>Modifier</b> (bonus), bir yeteneğin oyundaki gerçek etkisidir:
        (değer − 10) ÷ 2.
      </Info>

      <div className="spread" style={{ flexWrap: 'wrap' }}>
        <span className="badge" style={{ fontSize: 'var(--fs-sm)' }}>
          Kalan Puan: {remaining} / {totalPoints}
        </span>
        <span className="hint">8 = ucuz · 15 = pahalı</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="pointbuy-table">
          <tbody>
            <tr>
              <th>Değer</th>
              {Object.keys(config.pointBuy.cost).map((s) => (
                <td key={s}>{s}</td>
              ))}
            </tr>
            <tr>
              <th>Maliyet (puan)</th>
              {Object.values(config.pointBuy.cost).map((c, i) => (
                <td key={i}>{c}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stack">
        {ABILITIES.map((a) => {
          const base = character.baseAbilityScores[a]
          const stepUpCost = pointBuyCost(base + 1) - pointBuyCost(base)
          const cantAfford = base < max && stepUpCost > remaining
          const bonus = rb[a] || 0
          const final = base + bonus + (character.asiBonuses[a] || 0)
          const mod = abilityModifier(final)
          return (
            <div
              key={a}
              className="panel"
              style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12 }}
            >
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontFamily: 'var(--serif)', color: 'var(--gold-bright)' }}>{config.abilitiesTr[a]}</b>
                  <Tip label={a}>{ABILITY_HELP[a]}</Tip>
                </div>
                <div className="hint">
                  temel {base}
                  {bonus ? ` + ırk ${formatMod(bonus)}` : ''} = <b style={{ color: 'var(--ink)' }}>{final}</b> (modifier{' '}
                  {formatMod(mod)})
                </div>
              </div>
              <div className="row">
                <button className="btn" onClick={() => change(a, -1)} disabled={base <= min}>
                  −
                </button>
                <span style={{ minWidth: 28, textAlign: 'center', fontSize: 'var(--fs-md)', fontFamily: 'var(--serif)' }}>{base}</span>
                <button
                  className="btn"
                  onClick={() => change(a, +1)}
                  disabled={base >= max || cantAfford}
                  title={cantAfford ? `${base + 1} için ${stepUpCost} puan gerekir, kalan ${remaining}` : undefined}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

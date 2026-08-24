import { useThemeStore, type ThemePref } from '@/state/themeStore'
import { DaylightIcon, CandleIcon } from '@/components/icons'

/* Gün ışığı / mum ışığı anahtarı. Kutuplar gece-gündüz; iyilik-kötülük değil.
   Üç durum: light, dark, system. 'system' iken hiçbir düğme basılı görünmez,
   yalnızca o an geçerli olan kutup küçük bir noktayla işaretlenir. Basılı bir
   düğmeye tekrar basmak sisteme geri döndürür. */

const OPTIONS: { pref: Exclude<ThemePref, 'system'>; label: string; Icon: typeof DaylightIcon }[] = [
  { pref: 'light', label: 'Gün ışığı', Icon: DaylightIcon },
  { pref: 'dark', label: 'Mum ışığı', Icon: CandleIcon },
]

export default function ThemeToggle() {
  const { pref, resolved, setTheme } = useThemeStore()

  return (
    <div className="theme-toggle" role="group" aria-label="Tema">
      {OPTIONS.map(({ pref: p, label, Icon }) => {
        const selected = pref === p
        const auto = pref === 'system' && resolved === p
        return (
          <button
            key={p}
            type="button"
            className="theme-toggle-btn"
            aria-pressed={selected}
            data-auto={auto || undefined}
            title={selected ? `${label} — sistem tercihine dön` : label}
            onClick={() => setTheme(selected ? 'system' : p)}
          >
            <Icon size={17} />
            <span className="sr-only">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

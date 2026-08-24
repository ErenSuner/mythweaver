import { create } from 'zustand'

export type ThemePref = 'light' | 'dark' | 'system'
/** Ekranda gerçekten uygulanan kutup — 'system' çözümlendikten sonraki hali. */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_KEY = 'mythweaver:theme'

/** Etiketler: kutuplar gece/gündüz, iyilik/kötülük değil. */
export const THEME_LABEL: Record<ThemePref, string> = {
  light: 'Gün ışığı',
  dark: 'Mum ışığı',
  system: 'Sistem',
}

function isPref(v: unknown): v is ThemePref {
  return v === 'light' || v === 'dark' || v === 'system'
}

export function readStoredTheme(): ThemePref {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return isPref(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

/**
 * data-theme'i köke yazar. 'system' seçiliyken öznitelik hiç basılmaz —
 * böylece theme.css'teki prefers-color-scheme bloğu devreye girer ve
 * kullanıcı sistem temasını değiştirdiğinde JS olmadan takip eder.
 */
function applyTheme(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)

  // Tarayıcı kabuğu (adres çubuğu, iOS status bar) da kutupla uyumlu olsun.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolveTheme(pref) === 'dark' ? '#08080a' : '#e4dcc9')
}

interface ThemeState {
  pref: ThemePref
  resolved: ResolvedTheme
  setTheme: (pref: ThemePref) => void
  /** Sistem teması değişimini dinlemeye başlar; temizleyici döner. */
  init: () => () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  pref: readStoredTheme(),
  resolved: resolveTheme(readStoredTheme()),

  setTheme: (pref) => {
    try {
      localStorage.setItem(THEME_KEY, pref)
    } catch {
      // özel sekme / depolama kapalı: tercih oturumluk kalır, akış bozulmaz
    }
    applyTheme(pref)
    set({ pref, resolved: resolveTheme(pref) })
  },

  init: () => {
    applyTheme(get().pref)
    if (typeof matchMedia !== 'function') return () => {}
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (get().pref !== 'system') return
      applyTheme('system')
      set({ resolved: resolveTheme('system') })
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  },
}))

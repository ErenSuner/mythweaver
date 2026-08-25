import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Verilirse: görünür karakter sayacı gösterilir ve sınırda metin girişi durur. */
  maxLength?: number
}

// Metin ekleyen giriş türleri. insertParagraph/insertLineBreak görünür karakter
// üretmez (textContent'e girmez), o yüzden sınırda bile serbest bırakılır.
const TEXT_INSERTS = new Set([
  'insertText',
  'insertCompositionText',
  'insertReplacementText',
  'insertFromPaste',
  'insertFromDrop',
])

/** Seçili metnin uzunluğu (üzerine yazılacağı için bütçeden düşülür). */
function selectionLength(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return 0
  const range = sel.getRangeAt(0)
  if (!el.contains(range.commonAncestorContainer)) return 0
  return range.toString().length
}

// Bağımlılıksız WYSIWYG editör (contentEditable + execCommand).
// Uncontrolled: içerik DOM'da tutulur, değişimde onChange ile HTML dışa verilir.
// Baştan içeriği set etmek için mount'ta value yazılır; parent temizlemek isterse
// bu bileşene `key` verip remount ettirir.
export default function RichTextEditor({ value, onChange, placeholder, maxLength }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [len, setLen] = useState(0)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
    setLen(ref.current?.textContent?.length ?? 0)
    // yalnız mount'ta ilk içerik; sonraki value değişimleri caret'i bozmasın diye izlenmez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sınır dayatması native `beforeinput` ile: React 18'in sentetik onBeforeInput'u
  // inputType taşımıyor. Yalnız metin ekleyen girişler engellenir; silme ve
  // biçimlendirme her zaman serbest kalır.
  useEffect(() => {
    const el = ref.current
    const max = maxLength
    if (!el || !max) return
    const guard = (e: InputEvent) => {
      if (!TEXT_INSERTS.has(e.inputType)) return
      const incoming = e.data?.length ?? e.dataTransfer?.getData('text/plain').length ?? 1
      const current = el.textContent?.length ?? 0
      if (current - selectionLength(el) + incoming > max) e.preventDefault()
    }
    el.addEventListener('beforeinput', guard as EventListener)
    return () => el.removeEventListener('beforeinput', guard as EventListener)
  }, [maxLength])

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg)
    ref.current?.focus()
    emit()
  }

  function emit() {
    const el = ref.current
    setLen(el?.textContent?.length ?? 0)
    onChange(el?.innerHTML ?? '')
  }

  function onPaste(e: React.ClipboardEvent) {
    // kötü niyetli/karmaşık HTML yapıştırmayı engelle: düz metin ekle
    e.preventDefault()
    const el = ref.current
    let text = e.clipboardData.getData('text/plain')
    if (maxLength && el) {
      // beforeinput guard tüm yapıştırmayı reddetmesin diye kalan bütçeye kırp
      const remaining = maxLength - (el.textContent?.length ?? 0) + selectionLength(el)
      if (remaining <= 0) return
      text = text.slice(0, remaining)
    }
    document.execCommand('insertText', false, text)
    emit()
  }

  const btn = (label: string, cmd: string, arg?: string, title?: string) => (
    <button type="button" title={title ?? label} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd, arg)}>
      {label}
    </button>
  )

  const countState = maxLength ? (len >= maxLength ? ' is-over' : len >= maxLength * 0.9 ? ' is-warn' : '') : ''

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {btn('H1', 'formatBlock', '<h1>', 'Başlık 1')}
        {btn('H2', 'formatBlock', '<h2>', 'Başlık 2')}
        {btn('H3', 'formatBlock', '<h3>', 'Başlık 3')}
        {btn('¶', 'formatBlock', '<p>', 'Normal metin')}
        <span style={{ width: 1, background: 'var(--line)', margin: '2px 4px' }} />
        {btn('B', 'bold', undefined, 'Kalın')}
        {btn('I', 'italic', undefined, 'İtalik')}
        {btn('U', 'underline', undefined, 'Altı çizili')}
        {btn('• Liste', 'insertUnorderedList', undefined, 'Madde listesi')}
      </div>
      <div
        ref={ref}
        className="rte-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder ?? ''}
        onInput={emit}
        onBlur={emit}
        onPaste={onPaste}
        suppressContentEditableWarning
      />
      {maxLength ? (
        <div className={`rte-count${countState}`} aria-live="polite">
          {len.toLocaleString('tr-TR')} / {maxLength.toLocaleString('tr-TR')}
          {len >= maxLength ? ' — sınıra ulaşıldı' : ''}
        </div>
      ) : null}
    </div>
  )
}

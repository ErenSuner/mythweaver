import { useEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

// Bağımlılıksız WYSIWYG editör (contentEditable + execCommand).
// Uncontrolled: içerik DOM'da tutulur, değişimde onChange ile HTML dışa verilir.
// Baştan içeriği set etmek için mount'ta value yazılır; parent temizlemek isterse
// bu bileşene `key` verip remount ettirir.
export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
    // yalnız mount'ta ilk içerik; sonraki value değişimleri caret'i bozmasın diye izlenmez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function exec(cmd: string, arg?: string) {
    document.execCommand(cmd, false, arg)
    ref.current?.focus()
    emit()
  }

  function emit() {
    onChange(ref.current?.innerHTML ?? '')
  }

  function onPaste(e: React.ClipboardEvent) {
    // kötü niyetli/karmaşık HTML yapıştırmayı engelle: düz metin ekle
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    emit()
  }

  const btn = (label: string, cmd: string, arg?: string, title?: string) => (
    <button type="button" title={title ?? label} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd, arg)}>
      {label}
    </button>
  )

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
    </div>
  )
}

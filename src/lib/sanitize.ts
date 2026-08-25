// Zengin-metin (evren lore) için whitelist tabanlı HTML temizleme.
// Yalnız güvenli biçimlendirme tag'leri kalır; TÜM attribute'lar ve bilinmeyen
// tag'ler (script/img/iframe/on* dahil) atılır. Bilinmeyen tag -> içeriği korunur,
// tag çıkarılır. Kaydederken ve render ederken çağrılır (savunma derinliği).
const ALLOWED = new Set(['H1', 'H2', 'H3', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI'])

function clean(node: Node, out: Node, doc: Document) {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(doc.createTextNode(child.textContent ?? ''))
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const el = child as Element
    if (ALLOWED.has(el.tagName)) {
      // attribute'suz temiz kopya
      const fresh = doc.createElement(el.tagName.toLowerCase())
      clean(el, fresh, doc)
      out.appendChild(fresh)
    } else {
      // izinsiz tag: kendini at, içeriğini koru
      clean(el, out, doc)
    }
  })
}

export function sanitizeLore(html: string): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const container = doc.createElement('div')
  clean(doc.body, container, doc)
  return container.innerHTML
}

/** Lore HTML'inin görünür karakter sayısı (markup sayılmaz). */
export function loreTextLength(html: string): number {
  if (!html) return 0
  return new DOMParser().parseFromString(html, 'text/html').body.textContent?.length ?? 0
}

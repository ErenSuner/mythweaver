// Rehberden gelen kural metnini okunur hâle getirir:
//  - **kalın** / *eğik* işaretlerini gerçek biçimlendirmeye çevirir (ham ** görünmez)
//  - markdown tablolarını gerçek tabloya çevirir (seviye/hasar tabloları)
//  - "- " ile başlayan satırları listeye çevirir
//  - metinde geçen durum adlarını (prone, frightened, Korkmuş…) tıklanabilir yapar
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { conditions } from '@/data'
import { glossary, type GlossaryTerm } from '@/data/glossary'
import { ConditionModal } from './sheet/ConditionsReference'
import GlossaryModal from './GlossaryModal'
import type { Condition } from '@/types/data'

// tıklanan terimin hedefi: ya bir durum ya da bir sözlük terimi
export type LinkTarget = { kind: 'condition'; condition: Condition } | { kind: 'glossary'; term: GlossaryTerm }

// ---- tıklanabilir terimler: durumlar + jargon sözlüğü ----
type TermEntry = { word: string; target: LinkTarget }
const TERMS: TermEntry[] = [
  ...conditions.flatMap((c) => {
    const words = new Set<string>([c.name])
    for (const part of c.nameTr.split('/')) words.add(part.trim()) // "Yerde/Devrilmiş"
    return [...words].filter(Boolean).map((w) => ({ word: w, target: { kind: 'condition' as const, condition: c } }))
  }),
  ...glossary.flatMap((g) => {
    const words = new Set<string>([g.term, ...(g.aliases ?? [])])
    return [...words].filter(Boolean).map((w) => ({ word: w, target: { kind: 'glossary' as const, term: g } }))
  }),
]
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// uzun terimler önce eşleşsin ("spell save dc" < "dc" gibi çakışmayı önler)
const TERM_SOURCE = [...TERMS]
  .sort((a, b) => b.word.length - a.word.length)
  .map((t) => escapeRe(t.word))
  .join('|')

function findTarget(word: string): LinkTarget | undefined {
  const w = word.toLowerCase()
  return TERMS.find((t) => t.word.toLowerCase() === w)?.target
}

// ---- satır içi: **kalın**, *eğik*, tıklanabilir terim ----
function inline(text: string, onTerm: (t: LinkTarget) => void, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  // önce kalın/eğik parçala
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(...linkTerms(text.slice(last, m.index), onTerm, `${keyBase}-t${i++}`))
    if (m[1] !== undefined) out.push(<b key={`${keyBase}-b${i++}`}>{linkTerms(m[1], onTerm, `${keyBase}-bi${i}`)}</b>)
    else out.push(<i key={`${keyBase}-i${i++}`}>{linkTerms(m[2] ?? '', onTerm, `${keyBase}-ii${i}`)}</i>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(...linkTerms(text.slice(last), onTerm, `${keyBase}-t${i++}`))
  return out
}

function linkTerms(text: string, onTerm: (t: LinkTarget) => void, keyBase: string): ReactNode[] {
  if (!TERM_SOURCE) return [text]
  const re = new RegExp(`\\b(${TERM_SOURCE})\\b`, 'gi')
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    const target = findTarget(m[1])
    if (!target) continue
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <button key={`${keyBase}-c${i++}`} type="button" className="term" onClick={() => onTerm(target)}>
        {m[1]}
      </button>,
    )
    last = m.index + m[1].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.length ? out : [text]
}

// ---- blok ayrıştırma ----
type Block = { kind: 'p'; lines: string[] } | { kind: 'ul'; items: string[] } | { kind: 'table'; rows: string[][] }

const isTableLine = (l: string) => l.trim().startsWith('|') && l.trim().endsWith('|')
const isDivider = (l: string) => /^\|[\s|:-]+\|$/.test(l.trim())

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    if (isTableLine(line)) {
      const rows: string[][] = []
      while (i < lines.length && isTableLine(lines[i])) {
        if (!isDivider(lines[i])) {
          rows.push(
            lines[i]
              .trim()
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim()),
          )
        }
        i++
      }
      if (rows.length) blocks.push({ kind: 'table', rows })
      continue
    }
    if (/^\s*[-•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-•]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !isTableLine(lines[i]) && !/^\s*[-•]\s+/.test(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push({ kind: 'p', lines: para })
  }
  return blocks
}

export interface RuleTextProps {
  children: string
  style?: CSSProperties
  /** kaç karakterden sonra "devamını gör" ile katlansın (0 = kırpma yok) */
  clamp?: number
}

export default function RuleText({ children, style, clamp = 0 }: RuleTextProps) {
  const [active, setActive] = useState<LinkTarget | null>(null)
  const [expanded, setExpanded] = useState(false)

  const text = children ?? ''
  const needsClamp = clamp > 0 && text.length > clamp && !expanded
  // kırparken satır ortasında kesme: en yakın satır sonuna kadar al
  const shown = needsClamp ? text.slice(0, text.lastIndexOf('\n', clamp) > 0 ? text.lastIndexOf('\n', clamp) : clamp) : text

  const blocks = useMemo(() => parseBlocks(shown), [shown])

  return (
    <div className="rule-text" style={style}>
      {blocks.map((b, bi) => {
        if (b.kind === 'table') {
          const [head, ...body] = b.rows
          return (
            <div key={bi} className="rule-table-wrap">
              <table className="rule-table">
                <thead>
                  <tr>
                    {head.map((c, ci) => (
                      <th key={ci}>{inline(c, setActive, `h${bi}-${ci}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((c, ci) => (
                        <td key={ci}>{inline(c, setActive, `d${bi}-${ri}-${ci}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        if (b.kind === 'ul') {
          return (
            <ul key={bi} className="rule-list">
              {b.items.map((it, ii) => (
                <li key={ii}>{inline(it, setActive, `l${bi}-${ii}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={bi} className="rule-p">
            {b.lines.map((l, li) => (
              <span key={li}>
                {inline(l, setActive, `p${bi}-${li}`)}
                {li < b.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}

      {clamp > 0 && text.length > clamp && (
        <button type="button" className="term" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▲ kısalt' : '▼ devamını gör'}
        </button>
      )}

      <ConditionModal condition={active?.kind === 'condition' ? active.condition : null} onClose={() => setActive(null)} />
      <GlossaryModal term={active?.kind === 'glossary' ? active.term : null} onClose={() => setActive(null)} />
    </div>
  )
}

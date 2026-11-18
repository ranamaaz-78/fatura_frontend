import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { triggerBlobDownload } from './downloadSheetImage'
import { formatCents } from './money'

/* ------------------------------------------------------------------------------------------------ what a report PDF is made of */

export type PdfTile = { label: string; value: string; hint?: string }

/** One line of the "compared with the period before" table. `change` is a percent; `goodWhen` says which way is good news. */
export type PdfComparison = { label: string; current: string; previous: string; change: number | null; goodWhen?: 'up' | 'down' }

export type PdfSeries = { name: string; color: string; values: number[] }

export type PdfChart =
  /** Columns, optionally with a line over them (a moving average). */
  | { type: 'bars'; title: string; money: boolean; labels: string[]; values: number[]; color: string; barName: string; line?: { name: string; color: string; values: number[] }; wide?: boolean }
  /** Several series side by side. */
  | { type: 'groups'; title: string; money: boolean; labels: string[]; series: PdfSeries[]; wide?: boolean }
  /** Lines or areas over time (this period against the one before). */
  | { type: 'trend'; title: string; money: boolean; labels: string[]; series: PdfSeries[]; wide?: boolean }
  | { type: 'donut'; title: string; money: boolean; center: string; slices: { name: string; value: number; color: string }[] }
  /** A ranking: the biggest first. */
  | { type: 'rank'; title: string; money: boolean; items: { name: string; value: number }[]; color: string }

export type PdfTable = {
  title: string
  columns: { header: string; align: 'left' | 'right'; /** How wide this column is next to the others (default 1, the first 2.2). */ weight?: number }[]
  rows: string[][]
  total?: string[]
}

export type ReportPdfSpec = {
  filename: string
  title: string
  company: string
  periodText: string
  generated: string
  currency: string
  /** The company's colour, as #rrggbb. */
  brand: string
  tiles: PdfTile[]
  comparisonTitle?: string
  comparisonHeaders?: { metric: string; current: string; previous: string; change: string }
  comparison?: PdfComparison[]
  chartsTitle?: string
  charts: PdfChart[]
  table?: PdfTable
  footer: string
  /** "Page {n} of {total}" in the report's language. */
  pageLabel: (page: number, total: number) => string
}

/* ------------------------------------------------------------------------------------------------ page geometry */

const PAGE_W = 794
const PAGE_H = 1123
const PAD = 36
const FOOTER = 28
const GAP = 10
const FONT = "'Segoe UI', Roboto, Arial, 'Helvetica Neue', sans-serif"

const H_FIRST = 120
const H_NEXT = 40
const H_TILE_ROW = 86
const H_CHART_ROW = 252
const H_SECTION = 32
const H_TABLE_TITLE = 30
const H_TABLE_HEAD = 30
const H_ROW = 25

const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#e2e8f0'
const SOFT = '#f1f5f9'
const GOOD = '#047857'
const BAD = '#be123c'

type Block = { height: number; node: ReactNode }

const compactNumber = (cents: number, money: boolean) => {
  const value = money ? cents / 100 : cents
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

const shown = (value: number, money: boolean, currency: string) => (money ? formatCents(value, currency) : new Intl.NumberFormat().format(value))

/* ------------------------------------------------------------------------------------------------ the pieces */

function Card({ title, width, children }: { title: string; width: number; children: ReactNode }) {
  return (
    <div style={{ width, height: H_CHART_ROW - GAP, boxSizing: 'border-box', border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, background: '#fff', overflow: 'hidden' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  )
}

function tickEvery(count: number): number {
  return Math.max(0, Math.ceil(count / 9) - 1)
}

function BarsChart({ chart, width }: { chart: Extract<PdfChart, { type: 'bars' }>; width: number }) {
  const data = chart.labels.map((label, index) => ({ label, value: chart.values[index] ?? 0, line: chart.line?.values[index] }))
  return (
    <ComposedChart width={width} height={H_CHART_ROW - GAP - 62} data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={LINE} vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} interval={tickEvery(data.length)} />
      <YAxis tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => compactNumber(Number(value), chart.money)} />
      <Bar dataKey="value" name={chart.barName} fill={chart.color} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
      {chart.line ? <Line dataKey="line" name={chart.line.name} stroke={chart.line.color} strokeWidth={2} dot={false} isAnimationActive={false} /> : null}
    </ComposedChart>
  )
}

function GroupsChart({ chart, width }: { chart: Extract<PdfChart, { type: 'groups' }>; width: number }) {
  const data = chart.labels.map((label, index) => {
    const row: Record<string, string | number> = { label }
    for (const series of chart.series) row[series.name] = series.values[index] ?? 0
    return row
  })
  return (
    <BarChart width={width} height={H_CHART_ROW - GAP - 62} data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={LINE} vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} interval={tickEvery(data.length)} />
      <YAxis tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => compactNumber(Number(value), chart.money)} />
      {chart.series.map((series) => (
        <Bar key={series.name} dataKey={series.name} fill={series.color} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
      ))}
    </BarChart>
  )
}

function TrendChart({ chart, width }: { chart: Extract<PdfChart, { type: 'trend' }>; width: number }) {
  const data = chart.labels.map((label, index) => {
    const row: Record<string, string | number> = { label }
    for (const series of chart.series) row[series.name] = series.values[index] ?? 0
    return row
  })
  return (
    <ComposedChart width={width} height={H_CHART_ROW - GAP - 62} data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
      <CartesianGrid stroke={LINE} vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} interval={tickEvery(data.length)} />
      <YAxis tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} width={40} tickFormatter={(value) => compactNumber(Number(value), chart.money)} />
      {chart.series.map((series, index) =>
        index === 0 ? (
          <Area key={series.name} dataKey={series.name} stroke={series.color} fill={series.color} fillOpacity={0.16} strokeWidth={2.2} dot={false} isAnimationActive={false} />
        ) : (
          <Line key={series.name} dataKey={series.name} stroke={series.color} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        ),
      )}
    </ComposedChart>
  )
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
      {items.map((item) => (
        <span key={item.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: MUTED }}>
          <span style={{ width: 9, height: 9, borderRadius: 3, background: item.color }} />
          {item.name}
        </span>
      ))}
    </div>
  )
}

function DonutChart({ chart, width, currency }: { chart: Extract<PdfChart, { type: 'donut' }>; width: number; currency: string }) {
  const total = chart.slices.reduce((sum, slice) => sum + slice.value, 0)
  const size = 150
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: H_CHART_ROW - GAP - 62 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <PieChart width={size} height={size}>
          <Pie data={chart.slices} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70} paddingAngle={1} stroke="none" isAnimationActive={false}>
            {chart.slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
        </PieChart>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 11, fontWeight: 800, color: INK, padding: 34, lineHeight: 1.15 }}>{chart.center}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0, width: width - size - 10 }}>
        {chart.slices.map((slice) => (
          <div key={slice.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, margin: '4px 0' }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: slice.color, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slice.name}</span>
            <span style={{ color: MUTED, whiteSpace: 'nowrap' }}>{total > 0 ? `${Math.round((slice.value / total) * 100)}%` : ''}</span>
            <span style={{ fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{shown(slice.value, chart.money, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RankChart({ chart, currency }: { chart: Extract<PdfChart, { type: 'rank' }>; currency: string }) {
  const max = Math.max(1, ...chart.items.map((item) => item.value))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {chart.items.slice(0, 8).map((item, index) => (
        <div key={`${item.name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
          <span style={{ width: 118, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
          <span style={{ flex: 1, height: 12, background: SOFT, borderRadius: 6, overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.max(2, (item.value / max) * 100)}%`, background: chart.color, borderRadius: 6 }} />
          </span>
          <span style={{ width: 68, textAlign: 'right', fontWeight: 700, color: INK, whiteSpace: 'nowrap' }}>{shown(item.value, chart.money, currency)}</span>
        </div>
      ))}
    </div>
  )
}

function ChartBlock({ chart, width, currency }: { chart: PdfChart; width: number; currency: string }) {
  const inner = width - 24
  return (
    <Card title={chart.title} width={width}>
      {chart.type === 'bars' ? (
        <>
          <BarsChart chart={chart} width={inner} />
          <Legend items={[{ name: chart.barName, color: chart.color }, ...(chart.line ? [{ name: chart.line.name, color: chart.line.color }] : [])]} />
        </>
      ) : chart.type === 'groups' ? (
        <>
          <GroupsChart chart={chart} width={inner} />
          <Legend items={chart.series.map((series) => ({ name: series.name, color: series.color }))} />
        </>
      ) : chart.type === 'trend' ? (
        <>
          <TrendChart chart={chart} width={inner} />
          <Legend items={chart.series.map((series) => ({ name: series.name, color: series.color }))} />
        </>
      ) : chart.type === 'donut' ? (
        <DonutChart chart={chart} width={inner} currency={currency} />
      ) : (
        <RankChart chart={chart} currency={currency} />
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------------------------------------ flowing the content onto A4 pages */

function layoutPages(spec: ReportPdfSpec): Block[][] {
  const pages: Block[][] = [[]]
  let y = H_FIRST
  const usable = PAGE_H - PAD - FOOTER
  const room = () => usable - y
  const newPage = () => {
    pages.push([])
    y = H_NEXT
  }
  const push = (block: Block) => {
    if (block.height > room() && (pages[pages.length - 1]?.length ?? 0) > 0) newPage()
    pages[pages.length - 1]!.push(block)
    y += block.height
  }

  const full = PAGE_W - PAD * 2
  const half = (full - GAP) / 2

  // The headline numbers, three to a row.
  for (let index = 0; index < spec.tiles.length; index += 3) {
    const row = spec.tiles.slice(index, index + 3)
    push({
      height: H_TILE_ROW,
      node: (
        <div style={{ display: 'flex', gap: GAP, height: H_TILE_ROW - GAP }}>
          {row.map((tile) => (
            <div key={tile.label} style={{ flex: 1, boxSizing: 'border-box', borderRadius: 12, padding: '10px 14px', background: SOFT, borderLeft: `4px solid ${spec.brand}`, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: MUTED }}>{tile.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tile.value}</div>
              {tile.hint ? <div style={{ fontSize: 9.5, color: MUTED, marginTop: 1 }}>{tile.hint}</div> : null}
            </div>
          ))}
        </div>
      ),
    })
  }

  // This period against the one before it.
  if (spec.comparison && spec.comparison.length > 0 && spec.comparisonHeaders) {
    const headers = spec.comparisonHeaders
    const rowH = 28
    const height = 26 + 26 + spec.comparison.length * rowH + GAP
    push({
      height,
      node: (
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: INK, height: 26 }}>{spec.comparisonTitle}</div>
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', height: 26, alignItems: 'center', background: SOFT, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, padding: '0 12px' }}>
              <span style={{ flex: 1 }}>{headers.metric}</span>
              <span style={{ width: 120, textAlign: 'right' }}>{headers.current}</span>
              <span style={{ width: 120, textAlign: 'right' }}>{headers.previous}</span>
              <span style={{ width: 90, textAlign: 'right' }}>{headers.change}</span>
            </div>
            {spec.comparison.map((row) => {
              const up = (row.change ?? 0) > 0
              const flat = row.change === null || row.change === 0
              const good = row.goodWhen === 'down' ? !up : up
              const color = flat ? MUTED : good ? GOOD : BAD
              return (
                <div key={row.label} style={{ display: 'flex', height: rowH, alignItems: 'center', borderTop: `1px solid ${LINE}`, fontSize: 11, padding: '0 12px' }}>
                  <span style={{ flex: 1, color: INK, fontWeight: 600 }}>{row.label}</span>
                  <span style={{ width: 120, textAlign: 'right', color: INK, fontWeight: 700 }}>{row.current}</span>
                  <span style={{ width: 120, textAlign: 'right', color: MUTED }}>{row.previous}</span>
                  <span style={{ width: 90, textAlign: 'right', fontWeight: 800, color }}>{row.change === null ? '—' : `${up ? '▲' : row.change === 0 ? '' : '▼'} ${Math.abs(Math.round(row.change * 10) / 10)}%`}</span>
                </div>
              )
            })}
          </div>
        </div>
      ),
    })
  }

  // The charts, two to a row (a wide one takes the whole row).
  if (spec.charts.length > 0) {
    if (spec.chartsTitle) {
      push({ height: H_SECTION, node: <div style={{ fontSize: 13, fontWeight: 800, color: INK, paddingTop: 4 }}>{spec.chartsTitle}</div> })
    }
    const queue = [...spec.charts]
    while (queue.length > 0) {
      const first = queue.shift()!
      const isWide = 'wide' in first && first.wide
      if (isWide) {
        push({ height: H_CHART_ROW, node: <ChartBlock chart={first} width={full} currency={spec.currency} /> })
        continue
      }
      const nextIndex = queue.findIndex((chart) => !('wide' in chart && chart.wide))
      const second = nextIndex >= 0 ? queue.splice(nextIndex, 1)[0] : undefined
      push({
        height: H_CHART_ROW,
        node: (
          <div style={{ display: 'flex', gap: GAP }}>
            <ChartBlock chart={first} width={half} currency={spec.currency} />
            {second ? <ChartBlock chart={second} width={half} currency={spec.currency} /> : null}
          </div>
        ),
      })
    }
  }

  // The table, as many rows to a page as fit, the heading repeated on every page.
  if (spec.table && spec.table.rows.length > 0) {
    const table = spec.table
    const widths = table.columns.map((column, index) => column.weight ?? (index === 0 ? 2.2 : 1))
    const widthTotal = widths.reduce((sum, value) => sum + value, 0)
    const cell = (value: string, index: number, bold = false) => (
      <span key={index} style={{ flex: widths[index]! / widthTotal, minWidth: 0, textAlign: table.columns[index]!.align, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: bold ? 800 : 400, padding: '0 4px' }}>
        {value}
      </span>
    )
    const header = (
      <div style={{ display: 'flex', height: H_TABLE_HEAD, alignItems: 'center', background: spec.brand, color: '#fff', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, padding: '0 8px', borderRadius: '8px 8px 0 0' }}>
        {table.columns.map((column, index) => cell(column.header, index, true))}
      </div>
    )

    let index = 0
    let first = true
    while (index < table.rows.length) {
      const titleH = first ? H_TABLE_TITLE : 0
      const avail = room() - titleH - H_TABLE_HEAD - 6
      let fit = Math.floor(avail / H_ROW)
      if (fit < 3 && (pages[pages.length - 1]?.length ?? 0) > 0) {
        newPage()
        continue
      }
      fit = Math.max(fit, 1)
      const chunk = table.rows.slice(index, index + fit)
      const startAt = index
      index += chunk.length
      const last = index >= table.rows.length
      const withTotal = last && table.total && room() - (titleH + H_TABLE_HEAD + chunk.length * H_ROW) >= H_ROW + 6
      const height = titleH + H_TABLE_HEAD + chunk.length * H_ROW + (withTotal ? H_ROW + 6 : 6)
      const showTitle = first
      push({
        height,
        node: (
          <div>
            {showTitle ? <div style={{ fontSize: 13, fontWeight: 800, color: INK, height: H_TABLE_TITLE, paddingTop: 4 }}>{table.title}</div> : null}
            {header}
            {chunk.map((row, rowIndex) => (
              <div key={startAt + rowIndex} style={{ display: 'flex', height: H_ROW, alignItems: 'center', fontSize: 10.5, color: INK, padding: '0 8px', background: (startAt + rowIndex) % 2 ? SOFT : '#fff' }}>
                {row.map((value, cellIndex) => cell(value, cellIndex))}
              </div>
            ))}
            {withTotal && table.total ? (
              <div style={{ display: 'flex', height: H_ROW, alignItems: 'center', fontSize: 10.5, color: INK, padding: '0 8px', borderTop: `2px solid ${spec.brand}`, marginTop: 4 }}>
                {table.total.map((value, cellIndex) => cell(value, cellIndex, true))}
              </div>
            ) : null}
          </div>
        ),
      })
      first = false
      if (index < table.rows.length) newPage()
    }
  }

  return pages
}

function PdfPages({ spec }: { spec: ReportPdfSpec }) {
  const pages = layoutPages(spec)
  return (
    <>
      {pages.map((blocks, pageIndex) => (
        <div
          key={pageIndex}
          data-pdf-page
          style={{ position: 'relative', width: PAGE_W, height: PAGE_H, boxSizing: 'border-box', padding: PAD, background: '#fff', color: INK, fontFamily: FONT, overflow: 'hidden' }}
        >
          {pageIndex === 0 ? (
            <div style={{ height: H_FIRST - 12, margin: `-${PAD}px -${PAD}px 12px`, padding: `${PAD - 8}px ${PAD}px 0`, background: spec.brand, color: '#fff', boxSizing: 'border-box' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.85 }}>{spec.company}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>{spec.title}</div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>
                {spec.periodText} · {spec.generated}
              </div>
            </div>
          ) : (
            <div style={{ height: H_NEXT, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', fontSize: 10, color: MUTED, borderBottom: `1px solid ${LINE}`, marginBottom: 8, paddingTop: 2, boxSizing: 'border-box' }}>
              <span style={{ fontWeight: 700, color: INK }}>{spec.title}</span>
              <span>
                {spec.company} · {spec.periodText}
              </span>
            </div>
          )}
          {blocks.map((block, blockIndex) => (
            <div key={blockIndex} style={{ height: block.height, boxSizing: 'border-box', paddingBottom: GAP, overflow: 'hidden' }}>
              {block.node}
            </div>
          ))}
          <div style={{ position: 'absolute', left: PAD, right: PAD, bottom: 14, display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: MUTED, borderTop: `1px solid ${LINE}`, paddingTop: 6 }}>
            <span>{spec.footer}</span>
            <span>{spec.pageLabel(pageIndex + 1, pages.length)}</span>
          </div>
        </div>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------------------------------------ making the file */

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

/**
 * Lays the report out as A4 sheets off screen and photographs them, one JPEG (as a data URL) per page. The charts, the
 * colours and every letter of the company's language come out exactly as drawn.
 */
export async function renderReportPages(spec: ReportPdfSpec): Promise<string[]> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;pointer-events:none;`
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    flushSync(() => root.render(<PdfPages spec={spec} />))
    // Charts finish drawing a moment after they are mounted.
    await wait(450)

    const images: string[] = []
    for (const node of host.querySelectorAll<HTMLElement>('[data-pdf-page]')) {
      images.push(
        await toJpeg(node, {
          cacheBust: false,
          pixelRatio: 2,
          quality: 0.92,
          skipFonts: true,
          width: PAGE_W,
          height: PAGE_H,
          backgroundColor: '#ffffff',
          style: { margin: '0', transform: 'none' },
        }),
      )
    }
    return images
  } finally {
    root.unmount()
    host.remove()
  }
}

/** Writes the report as a PDF file: every page is one A4 sheet. */
export async function downloadReportPdf(spec: ReportPdfSpec): Promise<void> {
  const images = await renderReportPages(spec)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })

  images.forEach((image, index) => {
    if (index > 0) pdf.addPage()
    pdf.addImage(image, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
  })

  triggerBlobDownload(spec.filename, pdf.output('blob'))
}

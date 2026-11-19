'use client'
/**
 * Small hand-built charts for the teacher and admin dashboards (Nov 2026b).
 * No chart library: one hue per series, 2px lines, >=8px markers, recessive
 * grid, a hover/focus tooltip on every mark, and an aria-label that carries
 * the numbers for screen readers.
 */
import { useState } from 'react'

export const SERIES = '#6255E8'
const GRID = '#efedf5'
const AXIS = '#c9c3da'

export type Point = { label: string; value: number | null; tip: string }

function Tooltip({ text, x }: { text: string; x: number }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute -top-9 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1f2430] px-2.5 py-1 text-[11px] font-semibold text-[#fff] shadow-lg"
      style={{ left: `${x}%` }}
    >
      {text}
    </span>
  )
}

/** Single-series line over ordered categories (levels, months). */
export function LineChart({ points, max, ticks, ariaLabel, height = 180 }: {
  points: Point[]
  max: number
  ticks: number[]
  ariaLabel: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const xOf = (i: number) => (points.length === 1 ? 50 : 6 + (i * 88) / (points.length - 1))
  const yOf = (v: number) => 100 - (v / max) * 100
  // The line breaks across levels nobody has played
  const segments: string[] = []
  let current = ''
  points.forEach((p, i) => {
    if (p.value === null) { if (current) segments.push(current); current = ''; return }
    current += `${current ? 'L' : 'M'} ${xOf(i)} ${yOf(p.value)} `
  })
  if (current) segments.push(current)

  return (
    <figure aria-label={ariaLabel} className="mt-4">
      <div className="flex" style={{ height }}>
        <div className="flex w-8 flex-col justify-between pb-5 text-right text-[10px] text-[#9aa0b2]">
          {[...ticks].reverse().map(t => <span key={t} className="-translate-y-1.5 leading-none">{t}</span>)}
        </div>
        <div className="relative flex-1 pl-2">
          <div className="absolute inset-x-2 bottom-5 top-0">
            {/* grid */}
            {ticks.map(t => (
              <span key={t} className="absolute inset-x-0 border-t" style={{ top: `${yOf(t)}%`, borderColor: t === 0 ? AXIS : GRID, borderStyle: t === 0 ? 'solid' : 'dashed' }} />
            ))}
            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {segments.map(d => (
                <path key={d} d={d} fill="none" stroke={SERIES} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              ))}
              {hover !== null && <line x1={xOf(hover)} x2={xOf(hover)} y1={0} y2={100} stroke={AXIS} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
            </svg>
            {points.map((p, i) => (
              <button
                key={p.label}
                type="button"
                aria-label={p.tip}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="absolute top-0 h-full w-8 -translate-x-1/2 outline-none"
                style={{ left: `${xOf(i)}%` }}
              >
                {p.value !== null && (
                  <span
                    className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                    style={{ top: `${yOf(p.value)}%`, background: SERIES, boxShadow: '0 0 0 1px #fff' }}
                  />
                )}
              </button>
            ))}
            {hover !== null && <Tooltip text={points[hover].tip} x={xOf(hover)} />}
          </div>
          <div className="absolute inset-x-2 bottom-0 h-4">
            {points.map((p, i) => (
              <span key={p.label} className="absolute -translate-x-1/2 text-[11px] font-bold text-[#6f7187]" style={{ left: `${xOf(i)}%` }}>{p.label}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}

/** Vertical bars, one hue, value label on each bar (5 or fewer bars). */
export function BarChart({ bars, max, unit, ariaLabel, height = 170 }: {
  bars: { label: string; value: number; tip: string }[]
  max: number
  unit: string
  ariaLabel: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  return (
    <figure aria-label={ariaLabel} className="mt-4">
      <div className="relative flex items-end justify-around gap-3 border-b px-2" style={{ height, borderColor: AXIS }}>
        {bars.map((b, i) => (
          <div
            key={b.label}
            tabIndex={0}
            aria-label={b.tip}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="relative flex h-full w-full max-w-[56px] flex-col items-center justify-end outline-none"
          >
            <span className="mb-1 text-xs font-black text-[#1f2430]">{b.value}{unit}</span>
            <span
              className="w-full rounded-t-[4px] transition-opacity"
              style={{ height: `${Math.max(2, (b.value / max) * 100)}%`, background: SERIES, opacity: hover === null || hover === i ? 1 : 0.55 }}
            />
            {hover === i && <Tooltip text={b.tip} x={50} />}
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-3 px-2 pt-1.5">
        {bars.map(b => <span key={b.label} className="w-full max-w-[56px] truncate text-center text-[11px] font-bold text-[#6f7187]" title={b.label}>{b.label}</span>)}
      </div>
    </figure>
  )
}

/** Part-to-whole ring; segments separated by a 2px surface gap. */
export function Donut({ segments, centerValue, centerLabel, size = 150 }: {
  segments: { label: string; value: number; color: string }[]
  centerValue: string
  centerLabel: string
  size?: number
}) {
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0)
  const gap = total > 0 && segments.filter(s => s.value > 0).length > 1 ? 2 : 0
  let offset = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={GRID} strokeWidth={stroke} />
        {total > 0 && segments.map(s => {
          const len = (s.value / total) * c
          const el = s.value > 0 && (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${c - Math.max(0, len - gap)}`}
              strokeDashoffset={-offset}
            >
              <title>{`${s.label}: ${s.value}`}</title>
            </circle>
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-[#1f2430]">{centerValue}</span>
        <span className="max-w-[90px] text-[10px] font-semibold leading-tight text-[#6f7187]">{centerLabel}</span>
      </div>
    </div>
  )
}

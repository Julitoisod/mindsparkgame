'use client'
/**
 * Electronic class record (2026-10b revision, item 4).
 *
 * One row per enrolled student with their score for every level, the category
 * breakdown, and a total — then a download so the teacher can keep it in Excel.
 * A level's score is the student's best single run, so retries don't inflate it.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react'

const LEVELS = [1, 2, 3, 4, 5]

type RecordRow = {
  id: number
  name: string
  username: string
  section: string | null
  levels: Record<number, { score: number; attempts: number }>
  categories: Record<string, { correct: number; asked: number }>
  total: number
}

type Classroom = { id: number; name: string }

export default function ClassRecord() {
  const [rows, setRows] = useState<RecordRow[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [classroomId, setClassroomId] = useState<string>('all')
  const [showCategories, setShowCategories] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = classroomId === 'all'
        ? '/api/teacher/class-record'
        : `/api/teacher/class-record?classroomId=${classroomId}`
      const res = await fetch(url, { credentials: 'include' })
      const json = await res.json()
      if (json.success) {
        setRows(json.data.students)
        setCategories(json.data.categories)
      }
    } catch { /* the page already shows its own empty state */ }
    finally { setLoading(false) }
  }, [classroomId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/teacher/classrooms', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClassrooms(json.data) })
      .catch(() => {})
  }, [])

  const classAverage = useMemo(() => {
    if (rows.length === 0) return 0
    return Math.round(rows.reduce((sum, r) => sum + r.total, 0) / rows.length)
  }, [rows])

  /** CSV — opens directly in Excel, and carries names, levels, categories and scores. */
  function downloadCSV() {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const header = [
      'Student Name', 'Username', 'Section',
      ...LEVELS.map(l => `L${l}`),
      'Total',
      ...categories.map(c => `${c} (correct/asked)`),
    ]
    const lines = rows.map(r => [
      r.name, r.username, r.section ?? '',
      ...LEVELS.map(l => r.levels[l]?.score ?? 0),
      r.total,
      ...categories.map(c => {
        const cell = r.categories[c]
        return cell ? `${cell.correct}/${cell.asked}` : '—'
      }),
    ])
    const csv = [header, ...lines].map(cols => cols.map(escape).join(',')).join('\n')
    const stamp = new Date().toISOString().slice(0, 10)
    const section = classroomId === 'all'
      ? 'all-sections'
      : (classrooms.find(c => String(c.id) === classroomId)?.name ?? 'section').replace(/\W+/g, '-').toLowerCase()

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mindspark-class-record_${section}_${stamp}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-purple-400/25 bg-purple-950/40 p-5 backdrop-blur-md">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-white">
            <FileSpreadsheet className="h-4 w-4 text-[#9B83F5]" /> Class Record
          </h3>
          <p className="text-xs text-purple-400">
            Every enrolled student with their score per level and category — each level scored out of 10 (best run)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={classroomId}
            onChange={e => setClassroomId(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="all">All sections</option>
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => setShowCategories(v => !v)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            {showCategories ? 'Hide categories' : 'Show categories'}
          </button>
          <button
            onClick={downloadCSV}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-black text-white shadow hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Download (CSV / Excel)
          </button>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 py-6 text-sm text-purple-300">
          <RefreshCw className="h-4 w-4 animate-spin" /> Building the class record…
        </p>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-purple-400">No enrolled students in this selection yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-400/20 text-left text-xs font-bold uppercase text-purple-400">
                <th className="pb-3 pr-4">Student Name</th>
                <th className="pb-3 pr-4">Section</th>
                {LEVELS.map(l => <th key={l} className="pb-3 pr-4 text-center">L{l}</th>)}
                <th className="pb-3 pr-4 text-center">Total</th>
                {showCategories && categories.map(c => (
                  <th key={c} className="pb-3 pr-4 text-center whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-400/10">
              {rows.map(r => (
                <tr key={r.id} className="text-[#374151]">
                  <td className="py-2.5 pr-4">
                    <p className="font-bold text-[#111827]">{r.name}</p>
                    <p className="text-[10px] text-[#6B7280]">@{r.username}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-xs">{r.section ?? '—'}</td>
                  {LEVELS.map(l => {
                    const cell = r.levels[l]
                    const score = cell?.score ?? 0
                    return (
                      <td key={l} className="py-2.5 pr-4 text-center">
                        <span className={`font-bold ${score >= 9 ? 'text-emerald-600' : score >= 6 ? 'text-amber-600' : score > 0 ? 'text-red-500' : 'text-[#9CA3AF]'}`}>
                          {cell?.attempts ? score : '—'}
                        </span>
                      </td>
                    )
                  })}
                  <td className="py-2.5 pr-4 text-center font-black text-[#111827]">{r.total}</td>
                  {showCategories && categories.map(c => {
                    const cell = r.categories[c]
                    return (
                      <td key={c} className="py-2.5 pr-4 text-center text-xs">
                        {cell ? `${cell.correct}/${cell.asked}` : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-purple-400/20 text-xs font-bold text-[#374151]">
                <td className="pt-3 pr-4" colSpan={2}>Class average</td>
                {LEVELS.map(l => (
                  <td key={l} className="pt-3 pr-4 text-center">
                    {rows.length
                      ? Math.round(rows.reduce((sum, r) => sum + (r.levels[l]?.score ?? 0), 0) / rows.length)
                      : 0}
                  </td>
                ))}
                <td className="pt-3 pr-4 text-center text-[#111827]">{classAverage}</td>
                {showCategories && categories.map(c => <td key={c} />)}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

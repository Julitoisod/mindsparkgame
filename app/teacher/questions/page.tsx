'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  FileQuestion,
  Pencil,
  Plus,
  Power,
  Swords,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import type { QuizPhase, QuizQuestionDTO } from '@/types/quiz'

const LEVELS = [1, 2, 3, 4, 5]
const EMPTY_FORM = {
  levelNumber: 1,
  phase: 'normal' as QuizPhase,
  category: '',
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
}
type FormState = typeof EMPTY_FORM

export default function TeacherQuestionsPage() {
  useAuth()
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterLevel, setFilterLevel] = useState<number>(1)
  const [filterPhase, setFilterPhase] = useState<QuizPhase>('normal')

  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/teacher/questions?level=${filterLevel}&phase=${filterPhase}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setQuestions(json.data)
      else setError(json.message ?? 'Failed to load')
    } catch {
      setError('Failed to load questions')
    } finally {
      setLoading(false)
    }
  }, [filterLevel, filterPhase])

  useEffect(() => { load() }, [load])

  const categories = useMemo(
    () => Array.from(new Set(questions.map(q => q.category))).sort(),
    [questions],
  )

  function openAdd() {
    setForm({ ...EMPTY_FORM, levelNumber: filterLevel, phase: filterPhase })
    setEditingId('new')
  }

  function openEdit(q: QuizQuestionDTO) {
    const options = [...q.options]
    while (options.length < 4) options.push('')
    setForm({
      levelNumber: q.levelNumber,
      phase: q.phase,
      category: q.category,
      prompt: q.prompt,
      options: options.slice(0, 4),
      correctIndex: q.correctIndex,
    })
    setEditingId(q.id)
  }

  function closeForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const cleanedOptions = form.options.map(o => o.trim()).filter(Boolean)
      if (!form.category.trim()) throw new Error('Category is required')
      if (form.prompt.trim().length < 3) throw new Error('Question text is required')
      if (cleanedOptions.length < 2) throw new Error('Provide at least 2 answer choices')
      if (form.correctIndex >= cleanedOptions.length) throw new Error('Select which answer is correct')

      const payload = {
        levelNumber: form.levelNumber,
        phase: form.phase,
        category: form.category.trim(),
        prompt: form.prompt.trim(),
        options: cleanedOptions,
        correctIndex: form.correctIndex,
      }
      const isNew = editingId === 'new'
      const res = await fetch(isNew ? '/api/teacher/questions' : `/api/teacher/questions/${editingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message ?? 'Failed to save')
      toast.success(isNew ? 'Question added' : 'Question updated')
      closeForm()
      // Switch filters to where the question now lives so the user sees it
      setFilterLevel(payload.levelNumber)
      setFilterPhase(payload.phase)
      await load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save'
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(q: QuizQuestionDTO) {
    setBusyId(q.id)
    try {
      const res = await fetch(`/api/teacher/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !q.isActive }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setQuestions(prev => prev.map(x => x.id === q.id ? json.data : x))
      toast.success(q.isActive ? 'Question hidden from quizzes' : 'Question activated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(q: QuizQuestionDTO) {
    if (!confirm('Delete this question permanently?')) return
    setBusyId(q.id)
    try {
      const res = await fetch(`/api/teacher/questions/${q.id}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.message)
      setQuestions(prev => prev.filter(x => x.id !== q.id))
      toast.success('Question deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  const activeCount = questions.filter(q => q.isActive).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2"><FileQuestion className="h-6 w-6 text-purple-600" /> Question Bank</h2>
          <p className="text-sm text-gray-500">Add and manage the questions students answer. Each quiz randomly draws one question per category.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-purple-700 transition"
        >
          <Plus className="h-4 w-4" /> Add Question
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-100 border border-red-300 px-4 py-2.5 text-sm text-red-800 font-medium">{error}</div>}

      {/* Level + phase filters */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={[
                'h-9 w-9 rounded-lg text-sm font-black transition',
                filterLevel === lvl ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {lvl}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {(['normal', 'boss'] as QuizPhase[]).map(p => (
            <button
              key={p}
              onClick={() => setFilterPhase(p)}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold capitalize transition',
                filterPhase === p ? 'bg-purple-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {p === 'boss' && <Swords className="h-3.5 w-3.5" />} {p}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Level {filterLevel} · {filterPhase} phase — {questions.length} questions ({activeCount} active) across {categories.length} categories
      </p>

      {/* List */}
      {loading ? (
        <p className="text-sm text-gray-500 animate-pulse">Loading questions...</p>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <FileQuestion className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 font-bold text-gray-900">No questions yet</p>
          <p className="text-sm text-gray-500">Add the first question for this level and phase.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map(q => (
            <div key={q.id} className={`rounded-xl border bg-white shadow-sm p-4 ${q.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="rounded-md bg-purple-100 text-purple-700 px-2 py-0.5 text-[10px] font-bold">{q.category}</span>
                    {!q.isActive && <span className="rounded-md bg-gray-200 text-gray-600 px-2 py-0.5 text-[10px] font-bold">Inactive</span>}
                    {q.isSeed && <span className="rounded-md bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold">Seed</span>}
                  </div>
                  <p className="font-bold text-gray-900">{q.prompt}</p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {q.options.map((opt, i) => (
                      <div
                        key={i}
                        className={[
                          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm',
                          i === q.correctIndex ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold' : 'bg-gray-50 border border-gray-200 text-gray-700',
                        ].join(' ')}
                      >
                        {i === q.correctIndex && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                        <span className="font-bold mr-1">{String.fromCharCode(65 + i)}.</span> {opt}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button onClick={() => openEdit(q)} disabled={busyId === q.id} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-purple-600 transition" title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleActive(q)} disabled={busyId === q.id} className={`rounded-lg p-2 transition ${q.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`} title={q.isActive ? 'Deactivate' : 'Activate'}>
                    <Power className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(q)} disabled={busyId === q.id} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {editingId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-900">{editingId === 'new' ? 'Add Question' : 'Edit Question'}</h3>
                <button onClick={closeForm} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Level</span>
                    <select value={form.levelNumber} onChange={e => setForm(f => ({ ...f, levelNumber: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                      {LEVELS.map(l => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Phase</span>
                    <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value as QuizPhase }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                      <option value="normal">Normal</option>
                      <option value="boss">Boss</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Category</span>
                  <input
                    list="category-suggestions"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Division"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                  />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </label>

                <label className="block">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Question</span>
                  <textarea
                    value={form.prompt}
                    onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
                    rows={2}
                    placeholder="Use ____ for a blank to fill in"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                  />
                </label>

                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Answer choices (select the correct one)</span>
                  <div className="mt-1 space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={form.correctIndex === i}
                          onChange={() => setForm(f => ({ ...f, correctIndex: i }))}
                          className="h-4 w-4 accent-emerald-600"
                          title="Mark correct"
                        />
                        <span className="font-bold text-gray-500 w-4">{String.fromCharCode(65 + i)}.</span>
                        <input
                          value={opt}
                          onChange={e => setForm(f => ({ ...f, options: f.options.map((o, oi) => oi === i ? e.target.value : o) }))}
                          placeholder={`Choice ${String.fromCharCode(65 + i)}`}
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button onClick={save} disabled={saving} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                    {saving ? 'Saving...' : editingId === 'new' ? 'Add Question' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

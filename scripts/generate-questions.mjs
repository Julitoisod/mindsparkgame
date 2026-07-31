// scripts/generate-questions.mjs
//
// Generates the expanded MindSpark question bank: 50 normal + 50 boss
// questions per level (5 levels = 500 rows), topic-matched per level, so the
// existing per-attempt sampler (lib/questionBank.ts) can randomize a fresh
// 5+5 set every play and students cannot memorize a fixed sequence.
//
//   node scripts/generate-questions.mjs           # write database/seed-questions.sql + self-check
//   node scripts/generate-questions.mjs --apply    # also reseed the local DB (reads .env.local)
//
// Deterministic: a seeded PRNG makes the output identical across runs (clean diffs).

import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260801)
const rint = (a, b) => a + Math.floor(rand() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Choice builders ──────────────────────────────────────────────────────────
/** 4 numeric options around `correct`, all >= min, correct included. */
function numChoices(correct, { min = 0, spread = null } = {}) {
  const s = spread ?? Math.max(2, Math.round(Math.abs(correct) * 0.25))
  const set = new Set([correct])
  let guard = 0
  while (set.size < 4 && guard++ < 300) {
    const d = correct + rint(-s, s)
    if (d === correct || d < min) continue
    set.add(d)
  }
  let n = Math.max(min, correct + 1)
  while (set.size < 4) { if (!set.has(n)) set.add(n); n++ }
  const options = shuffle([...set]).map(String)
  return { options, correctIndex: options.indexOf(String(correct)) }
}
/** 4 options from a fixed pool; needs >= 3 distinct wrong candidates. */
function fixedChoices(correct, wrongPool) {
  const wrong = shuffle([...new Set(wrongPool)].filter(x => x !== correct)).slice(0, 3)
  const options = shuffle([correct, ...wrong])
  return { options, correctIndex: options.indexOf(correct) }
}

// ─── Flavor banks (kid-friendly word problems) ────────────────────────────────
const HEROES = ['dragon', 'pirate', 'ninja', 'wizard', 'robot', 'knight', 'fairy', 'elf', 'astronaut', 'explorer']
const TREASURES = ['gold coins', 'gems', 'stars', 'crystals', 'apples', 'marbles', 'cookies', 'stickers', 'seeds', 'shells']
const CONTAINERS = ['boxes', 'bags', 'baskets', 'chests', 'jars', 'crates', 'shelves', 'pouches']

// ─── Level 1 — Multiplication Quest ───────────────────────────────────────────
function l1(phase) {
  const big = phase === 'boss'
  const a = big ? rint(6, 12) : rint(2, 9)
  const b = big ? rint(6, 12) : rint(2, 9)
  const product = a * b
  const kind = pick(['mul', 'div', 'missing', 'share', 'group'])
  const hero = pick(HEROES), t = pick(TREASURES), c = pick(CONTAINERS)
  if (kind === 'mul')
    return { category: 'Multiplication', prompt: `A ${hero} has ${a} ${t} in each of ${b} ${c}. How many ${t} in all?`, ...numChoices(product, { min: 0 }) }
  if (kind === 'div')
    return { category: 'Division', prompt: `The ${hero} shared ${product} ${t} equally into ${b} ${c}. How many are in each?`, ...numChoices(a, { min: 0 }) }
  if (kind === 'missing')
    return { category: 'Missing Number', prompt: `Fill in the missing number: ____ x ${b} = ${product}`, ...numChoices(a, { min: 1 }) }
  if (kind === 'share')
    return { category: 'Equal Sharing', prompt: `${product} ${t} are shared equally among ${a} ${HEROES.filter(h => h !== hero)[0]}s. How many does each get?`, ...numChoices(b, { min: 0 }) }
  return { category: 'Grouping', prompt: `A ${hero} puts ${product} ${t} into groups of ${a}. How many groups are there?`, ...numChoices(b, { min: 1 }) }
}

// ─── Level 2 — Division Heroes ────────────────────────────────────────────────
function l2(phase) {
  const big = phase === 'boss'
  const divisor = big ? rint(6, 9) : rint(2, 6)
  const quotient = big ? rint(11, 30) : rint(4, 15)
  const dividend = divisor * quotient
  const kind = pick(['div', 'missDiv', 'missDivd', 'share', 'group'])
  const hero = pick(HEROES), t = pick(TREASURES)
  if (kind === 'div')
    return { category: 'Division', prompt: `${dividend} ${t} are split equally into ${divisor} groups. How many in each group?`, ...numChoices(quotient, { min: 0 }) }
  if (kind === 'missDiv')
    return { category: 'Missing Divisor', prompt: `Fill in the missing number: ${dividend} / ____ = ${quotient}`, ...numChoices(divisor, { min: 1 }) }
  if (kind === 'missDivd')
    return { category: 'Missing Dividend', prompt: `Fill in the missing number: ____ / ${divisor} = ${quotient}`, ...numChoices(dividend, { min: 1 }) }
  if (kind === 'share')
    return { category: 'Equal Sharing', prompt: `The ${hero} shared ${dividend} ${t} equally among ${quotient} friends. How many each?`, ...numChoices(divisor, { min: 0 }) }
  return { category: 'Grouping', prompt: `How many groups of ${divisor} can you make from ${dividend} ${t}?`, ...numChoices(quotient, { min: 1 }) }
}

// ─── Level 3 — Fractions & Number Fun ─────────────────────────────────────────
function l3(phase) {
  const big = phase === 'boss'
  const kind = pick(['equiv', 'largest', 'add', 'ofset', 'identify'])
  if (kind === 'equiv') {
    const b = big ? rint(4, 8) : rint(2, 5)
    const a = rint(1, b - 1)
    const k = rint(2, big ? 4 : 3)
    return { category: 'Equivalent Fractions', prompt: `Fill in the numerator: ${a}/${b} = ?/${b * k}`, ...numChoices(a * k, { min: 1, spread: k + 1 }) }
  }
  if (kind === 'largest') {
    const d = big ? rint(8, 12) : rint(5, 8)
    const nums = shuffle(Array.from({ length: d - 1 }, (_, i) => i + 1)).slice(0, 4)
    const maxN = Math.max(...nums)
    const options = nums.map(n => `${n}/${d}`)
    return { category: 'Compare Fractions', prompt: `Which fraction is the largest: ${options.join(', ')}?`, options, correctIndex: options.indexOf(`${maxN}/${d}`) }
  }
  if (kind === 'add') {
    const d = big ? rint(8, 12) : rint(5, 8)
    const n1 = rint(1, d - 2), n2 = rint(1, d - n1)
    const ans = `${n1 + n2}/${d}`
    const wrong = [`${n1 + n2 + 1}/${d}`, `${Math.max(1, n1 + n2 - 1)}/${d}`, `${n1 + n2}/${d + 1}`, `${n1 * n2}/${d}`]
    return { category: 'Add Fractions', prompt: `${n1}/${d} + ${n2}/${d} = ?`, ...fixedChoices(ans, wrong) }
  }
  if (kind === 'ofset') {
    const n = big ? rint(3, 6) : rint(2, 4)
    const q = big ? rint(4, 9) : rint(2, 6)
    const total = n * q
    return { category: 'Fraction of a Set', prompt: `What is 1/${n} of ${total}?`, ...numChoices(q, { min: 1 }) }
  }
  const total = big ? rint(8, 12) : rint(4, 8)
  const m = rint(1, total - 1)
  const ans = `${m}/${total}`
  const wrong = [`${total}/${m}`, `${m}/${total + 1}`, `${m + 1}/${total}`, `${Math.max(1, m - 1)}/${total}`]
  return { category: 'Identify Fraction', prompt: `${m} out of ${total} equal parts are shaded. What fraction is shaded?`, ...fixedChoices(ans, wrong) }
}

// ─── Level 4 — Shape Slide Explorer ───────────────────────────────────────────
const POLY = [['triangle', 3], ['square', 4], ['rectangle', 4], ['pentagon', 5], ['hexagon', 6], ['heptagon', 7], ['octagon', 8], ['nonagon', 9], ['decagon', 10], ['rhombus', 4], ['trapezoid', 4], ['parallelogram', 4]]
const NAME_BY_N = { 3: 'triangle', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon', 9: 'nonagon', 10: 'decagon' }
const SIDE_PHRASE = [n => `How many sides does a ${n} have?`, n => `A ${n} has how many sides?`, n => `Count the sides of a ${n}. How many are there?`]
const CORNER_PHRASE = [n => `How many corners does a ${n} have?`, n => `A ${n} has how many vertices (corners)?`, n => `Count the corners of a ${n}. How many?`]
const L4_MOVES = [
  ['Sliding a shape in a straight line without turning or flipping it is called a ____.', 'Slide', ['Flip', 'Turn', 'Grow']],
  ['Flipping a shape over a line to make a mirror image is called a ____.', 'Flip', ['Slide', 'Turn', 'Shrink']],
  ['Turning a shape around a point is called a ____.', 'Turn', ['Slide', 'Flip', 'Bounce']],
  ['Another math name for a slide is a ____.', 'Translation', ['Rotation', 'Reflection', 'Expansion']],
  ['Another math name for a flip is a ____.', 'Reflection', ['Translation', 'Rotation', 'Extension']],
  ['Another math name for a turn is a ____.', 'Rotation', ['Translation', 'Reflection', 'Motion']],
  ['When you slide a shape, its size ____.', 'Stays the same', ['Gets bigger', 'Gets smaller', 'Disappears']],
  ['A mirror image of a shape is made by a ____.', 'Flip', ['Slide', 'Turn', 'Push']],
  ['Which move changes a shape’s position but keeps its size and shape? A ____.', 'Slide', ['Stretch', 'Shrink', 'Twist']],
  ['Sliding, flipping, and turning all keep a shape’s size and shape ____.', 'The same', ['Bigger', 'Smaller', 'Random']],
  ['If you flip the letter b over a vertical line, it looks like the letter ____.', 'd', ['p', 'q', 'a']],
  ['A shape that is turned all the way around (a full turn) looks ____.', 'The same', ['Bigger', 'Upside down', 'Smaller']],
  ['Moving a shape to a new spot without rotating it is a ____.', 'Slide', ['Turn', 'Flip', 'Fold']],
  ['A reflection makes a shape’s ____ image.', 'Mirror', ['Bigger', 'Smaller', 'Broken']],
  ['Which movement is the same as a rotation? A ____.', 'Turn', ['Slide', 'Flip', 'Jump']],
  ['Which movement is the same as a reflection? A ____.', 'Flip', ['Slide', 'Turn', 'Roll']],
]
const L4_ATTR = [
  ['Which shape has 4 equal sides and 4 right angles?', 'Square', ['Rectangle', 'Triangle', 'Pentagon']],
  ['Which shape has no corners and no straight sides?', 'Circle', ['Square', 'Triangle', 'Hexagon']],
  ['Which shape looks like a diamond with 4 equal sides?', 'Rhombus', ['Rectangle', 'Trapezoid', 'Circle']],
  ['Which shape has 2 long sides and 2 short sides?', 'Rectangle', ['Square', 'Circle', 'Triangle']],
  ['Which of these is a 3-sided shape?', 'Triangle', ['Square', 'Pentagon', 'Hexagon']],
  ['Which shape has exactly one pair of parallel sides?', 'Trapezoid', ['Square', 'Circle', 'Triangle']],
  ['A closed shape with 4 straight sides is a ____.', 'Quadrilateral', ['Triangle', 'Pentagon', 'Hexagon']],
  ['How many right angles does a rectangle have?', '4', ['2', '3', '1']],
  ['Which shape can roll?', 'Circle', ['Square', 'Triangle', 'Pentagon']],
  ['Which shape has the most sides?', 'Octagon', ['Pentagon', 'Square', 'Triangle']],
  ['Which shape has all sides the same length and 3 corners?', 'Triangle', ['Rectangle', 'Trapezoid', 'Circle']],
  ['Which shape has 6 corners?', 'Hexagon', ['Pentagon', 'Square', 'Triangle']],
]
function l4(phase) {
  const big = phase === 'boss'
  const pool = big ? POLY.filter(([, s]) => s >= 6) : POLY.filter(([, s]) => s <= 6)
  const kind = pick(['sides', 'corners', 'name', 'move', 'attr', 'compare'])
  if (kind === 'sides') {
    const [name, sides] = pick(pool)
    return { category: 'Sides', prompt: pick(SIDE_PHRASE)(name), ...numChoices(sides, { min: 0, spread: 2 }) }
  }
  if (kind === 'corners') {
    const [name, sides] = pick(pool)
    return { category: 'Corners', prompt: pick(CORNER_PHRASE)(name), ...numChoices(sides, { min: 0, spread: 2 }) }
  }
  if (kind === 'name') {
    const ns = big ? [7, 8, 9, 10] : [3, 5, 6]
    const n = pick(ns)
    return { category: 'Name Shape', prompt: `What do we call a polygon with ${n} sides?`, ...fixedChoices(NAME_BY_N[n], Object.values(NAME_BY_N)) }
  }
  if (kind === 'move') {
    const [prompt, ans, wrong] = pick(L4_MOVES)
    return { category: 'Movements', prompt, ...fixedChoices(ans, wrong) }
  }
  if (kind === 'attr') {
    const [prompt, ans, wrong] = pick(L4_ATTR)
    return { category: 'Attributes', prompt, ...fixedChoices(ans, wrong) }
  }
  // compare: which of 4 shapes has the most sides (big combinatorial space)
  const four = shuffle(POLY).slice(0, 4)
  const winner = [...four].sort((x, y) => y[1] - x[1])[0]
  const options = four.map(([n]) => n)
  return { category: 'Compare Shapes', prompt: `Which shape has the most sides: ${four.map(([n]) => n).join(', ')}?`, options, correctIndex: options.indexOf(winner[0]) }
}

// ─── Level 5 — Symmetry Super Challenge ───────────────────────────────────────
const SHAPE_SYM = [['square', 4], ['equilateral triangle', 3], ['rectangle', 2], ['rhombus', 2], ['regular pentagon', 5], ['regular hexagon', 6], ['regular octagon', 8], ['isosceles triangle', 1]]
const LETTER_SYM = [['A', 1], ['B', 1], ['C', 1], ['D', 1], ['E', 1], ['H', 2], ['I', 2], ['M', 1], ['O', 2], ['T', 1], ['U', 1], ['V', 1], ['W', 1], ['X', 2], ['Y', 1]]
const SYM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'H', 'I', 'M', 'O', 'T', 'U', 'V', 'W', 'X', 'Y']
const ASYM_LETTERS = ['F', 'G', 'J', 'L', 'N', 'P', 'Q', 'R', 'S', 'Z']
const L5_ABOUT = [
  ['A figure that looks the same on both sides of a line is ____.', 'Symmetrical', ['Asymmetrical', 'Round', 'Slanted']],
  ['The line that divides a symmetrical figure into two equal halves is the ____.', 'Line of symmetry', ['Number line', 'Base line', 'Edge']],
  ['If both halves match when you fold a figure, it is ____.', 'Symmetrical', ['Not symmetrical', 'Bigger', 'Smaller']],
  ['A butterfly’s two wings show that it is ____.', 'Symmetrical', ['Asymmetrical', 'Round', 'Uneven']],
  ['One half of a symmetrical figure is a mirror image of the ____.', 'Other half', ['Whole', 'Corner', 'Line']],
  ['A figure with NO line of symmetry is ____.', 'Asymmetrical', ['Symmetrical', 'Balanced', 'Even']],
  ['The two halves of a symmetrical shape are ____ in size.', 'Equal', ['Different', 'Bigger', 'Random']],
  ['Folding a symmetrical shape on its line of symmetry makes the halves ____.', 'Match exactly', ['Overlap partly', 'Separate', 'Grow']],
  ['A mirror placed on the line of symmetry shows the ____ shape.', 'Same', ['Different', 'Bigger', 'Smaller']],
  ['Symmetry means both parts are ____.', 'Matching', ['Different', 'Uneven', 'Random']],
  ['Which line makes two matching halves when you fold?', 'Line of symmetry', ['Diagonal only', 'No line', 'Curved line']],
  ['A shape can have ____ line of symmetry.', 'More than one', ['Only zero', 'Only a curved', 'No']],
]
function l5(phase) {
  const big = phase === 'boss'
  const kind = pick(['shape', 'letter', 'yesno', 'about', 'compare'])
  if (kind === 'shape') {
    const pool = big ? SHAPE_SYM.filter(([, n]) => n >= 4) : SHAPE_SYM.filter(([, n]) => n <= 4)
    const [name, lines] = pick(pool)
    return { category: 'Shape Symmetry', prompt: `How many lines of symmetry does a ${name} have?`, ...numChoices(lines, { min: 0, spread: 2 }) }
  }
  if (kind === 'letter') {
    const pool = big ? LETTER_SYM.filter(([, n]) => n >= 2) : LETTER_SYM
    const [ch, lines] = pick(pool)
    return { category: 'Letter Symmetry', prompt: `How many lines of symmetry does the block letter ${ch} have?`, ...numChoices(lines, { min: 0, spread: 2 }) }
  }
  if (kind === 'yesno') {
    const symmetric = rand() < 0.5
    const ch = symmetric ? pick(SYM_LETTERS) : pick(ASYM_LETTERS)
    const ans = symmetric ? 'Symmetrical' : 'Not symmetrical'
    return { category: 'Symmetric or Not', prompt: `Is the block letter ${ch} symmetrical?`, options: ['Symmetrical', 'Not symmetrical'], correctIndex: ['Symmetrical', 'Not symmetrical'].indexOf(ans) }
  }
  if (kind === 'about') {
    const [prompt, ans, wrong] = pick(L5_ABOUT)
    return { category: 'About Symmetry', prompt, ...fixedChoices(ans, wrong) }
  }
  // compare: which of 4 shapes has the most lines of symmetry
  const four = shuffle(SHAPE_SYM).slice(0, 4)
  const winner = [...four].sort((x, y) => y[1] - x[1])[0]
  const options = four.map(([n]) => n)
  return { category: 'Compare Symmetry', prompt: `Which shape has the most lines of symmetry: ${four.map(([n]) => n).join(', ')}?`, options, correctIndex: options.indexOf(winner[0]) }
}

const LEVELS = [l1, l2, l3, l4, l5]
const PER_BUCKET = 50

// ─── Build the bank (per-level dedupe so normal & boss never share a prompt) ──
function buildBank() {
  const rows = []
  for (let level = 1; level <= 5; level++) {
    const gen = LEVELS[level - 1]
    const usedInLevel = new Set()
    for (const phase of ['normal', 'boss']) {
      const bucket = []
      let guard = 0
      while (bucket.length < PER_BUCKET && guard++ < 20000) {
        const q = gen(phase)
        if (usedInLevel.has(q.prompt)) continue
        usedInLevel.add(q.prompt)
        bucket.push({ level_number: level, phase, ...q })
      }
      if (bucket.length < PER_BUCKET) throw new Error(`Level ${level} ${phase}: only ${bucket.length}/${PER_BUCKET} unique — add producers/templates`)
      rows.push(...bucket)
    }
  }
  return rows
}

// ─── Self-check ───────────────────────────────────────────────────────────────
function selfCheck(rows) {
  const buckets = {}
  for (const r of rows) {
    const key = `${r.level_number}-${r.phase}`
    ;(buckets[key] ??= []).push(r)
    // structural invariants
    if (r.options.length !== 4 && !(r.category === 'Symmetric or Not' && r.options.length === 2))
      throw new Error(`Bad option count (${r.options.length}) in ${key}: ${r.prompt}`)
    if (r.correctIndex < 0 || r.correctIndex >= r.options.length)
      throw new Error(`Bad correctIndex in ${key}: ${r.prompt}`)
    if (new Set(r.options).size !== r.options.length)
      throw new Error(`Duplicate options in ${key}: ${r.prompt} -> ${r.options.join('|')}`)
  }
  for (const [key, list] of Object.entries(buckets)) {
    if (list.length !== PER_BUCKET) throw new Error(`${key}: ${list.length} != ${PER_BUCKET}`)
    if (new Set(list.map(r => r.prompt)).size !== PER_BUCKET) throw new Error(`${key}: duplicate prompts`)
    const cats = new Set(list.map(r => r.category))
    if (cats.size < 5) throw new Error(`${key}: only ${cats.size} categories (need >=5 for the sampler)`)
  }
  // spot-check arithmetic correctness on the numeric levels
  const check = (prompt, options, ci, expr) => {
    const m = prompt.match(expr.re)
    if (!m) return
    const expected = String(expr.f(...m.slice(1).map(Number)))
    if (options[ci] !== expected) throw new Error(`Wrong answer: "${prompt}" -> ${options[ci]} expected ${expected}`)
  }
  for (const r of rows) {
    check(r.prompt, r.options, r.correctIndex, { re: /____ x (\d+) = (\d+)/, f: (b, p) => p / b })
    check(r.prompt, r.options, r.correctIndex, { re: /(\d+) \/ ____ = (\d+)/, f: (d, q) => d / q })
    check(r.prompt, r.options, r.correctIndex, { re: /____ \/ (\d+) = (\d+)/, f: (d, q) => d * q })
    check(r.prompt, r.options, r.correctIndex, { re: /What is 1\/(\d+) of (\d+)\?/, f: (n, t) => t / n })
  }
  return buckets
}

// ─── SQL emit ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/'/g, "''")
function toSQL(rows) {
  const header = `-- ============================================================
--  MindSpark Game — Question Bank Seed (auto-generated)
--  ${rows.length} rows = 5 levels x (50 normal + 50 boss).
--  Generated by scripts/generate-questions.mjs (deterministic seed).
--  Topic-matched per level; the per-attempt sampler randomizes 5+5.
--  created_by = NULL marks these as system seed rows.
--  Safe to re-run: clears prior seed rows (created_by IS NULL) first.
--  Run AFTER 2026-06-revision.sql and 2026-08-revision.sql.
-- ============================================================

DELETE FROM quiz_questions WHERE created_by IS NULL;

INSERT INTO quiz_questions (level_number, phase, category, prompt, options, correct_index) VALUES
`
  const values = rows.map((r, i) => {
    const opts = esc(JSON.stringify(r.options))
    const end = i === rows.length - 1 ? ';' : ','
    return `(${r.level_number},'${r.phase}','${esc(r.category)}','${esc(r.prompt)}','${opts}',${r.correctIndex})${end}`
  })
  return header + values.join('\n') + '\n'
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const rows = buildBank()
const buckets = selfCheck(rows)
const sql = toSQL(rows)
const outPath = join(ROOT, 'database', 'seed-questions.sql')
writeFileSync(outPath, sql, 'utf8')

console.log('Self-check PASSED. Buckets:')
for (const key of Object.keys(buckets).sort()) {
  const cats = [...new Set(buckets[key].map(r => r.category))]
  console.log(`  L${key.padEnd(8)} ${buckets[key].length} rows | ${cats.length} categories: ${cats.join(', ')}`)
}
console.log(`Wrote ${rows.length} rows -> ${outPath}`)

if (process.argv.includes('--apply')) {
  const env = {}
  try {
    for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim()
    }
  } catch { /* fall back to defaults */ }
  const mysql = (await import('mysql2/promise')).default
  const conn = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'mindsparkgame',
  })
  await conn.query('DELETE FROM quiz_questions WHERE created_by IS NULL')
  const chunkSize = 100
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const placeholders = chunk.map(() => '(?,?,?,?,?,?)').join(',')
    const params = chunk.flatMap(r => [r.level_number, r.phase, r.category, r.prompt, JSON.stringify(r.options), r.correctIndex])
    await conn.query(`INSERT INTO quiz_questions (level_number, phase, category, prompt, options, correct_index) VALUES ${placeholders}`, params)
  }
  const [[{ c }]] = await conn.query('SELECT COUNT(*) c FROM quiz_questions')
  console.log(`Applied to DB. quiz_questions now has ${c} rows.`)
  await conn.end()
}

/**
 * Fix card backgrounds that became too light after the green→purple swap.
 * The dashboard layout forces white text, so light cards have invisible text.
 *
 * Strategy: convert light pastel purple bg/text combos to dark navy/purple bg
 * with white/light-purple text, which is more kid-friendly anyway.
 */
const fs = require('fs')
const path = require('path')

// Replacements: each entry is [oldString, newString].
// Order matters — more specific patterns first.
const replacements = [
  // Card backgrounds (formerly white/light-green) → dark purple
  ['bg-[#faf5ff]', 'bg-purple-950/40 backdrop-blur-md'],
  ['bg-[#f3e8ff]', 'bg-purple-900/40 backdrop-blur-md'],
  ['bg-[#e9d5ff]', 'bg-purple-800/40 backdrop-blur-md'],

  // Borders (light) → purple/30
  ['border-[#7e22ce]/15', 'border-purple-400/25'],
  ['border-[#7e22ce]/10', 'border-purple-400/20'],
  ['border-[#7e22ce]/20', 'border-purple-400/30'],
  ['border-[#7e22ce]/25', 'border-purple-400/35'],
  ['border-[#9333ea]/15', 'border-purple-400/25'],
  ['border-[#9333ea]/20', 'border-purple-400/30'],
  ['border-[#a855f7]/20', 'border-purple-400/30'],
  ['border-[#a855f7]/30', 'border-purple-400/40'],

  // Dark text colors that became invisible on dark gradient bg → white/light
  ['text-[#1a1233]', 'text-white'],
  ['text-[#1a1233]/65', 'text-purple-200'],
  ['text-[#1a1233]/60', 'text-purple-200'],
  ['text-[#1a1233]/45', 'text-purple-300'],
  ['text-[#581c87]/65', 'text-purple-200'],
  ['text-[#581c87]/60', 'text-purple-200'],
  ['text-[#581c87]', 'text-purple-100'],
  ['text-[#6b21a8]', 'text-purple-200'],
  ['text-[#7e22ce]', 'text-purple-300'],
  ['text-[#7e22ce]/60', 'text-purple-300/70'],
  ['text-[#9333ea]', 'text-purple-300'],

  // Some text colors that should now be dark (when on light pill backgrounds) — keep them
  // Hover backgrounds → softer purple
  ['hover:bg-[#f3e8ff]', 'hover:bg-purple-700/30'],
]

const targetDirs = [
  'app/dashboard',
  'app/character-select',
  'components/game',
  'components/ui',
]

const exts = new Set(['.tsx', '.ts', '.jsx'])

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      walk(full, files)
    } else if (exts.has(path.extname(entry.name))) {
      files.push(full)
    }
  }
  return files
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  const original = content

  for (const [oldStr, newStr] of replacements) {
    content = content.split(oldStr).join(newStr)
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`  ✓ ${filePath}`)
    return true
  }
  return false
}

const root = process.cwd()
let changedCount = 0

console.log('Fixing card contrast and text visibility...\n')

for (const dir of targetDirs) {
  const fullDir = path.join(root, dir)
  if (!fs.existsSync(fullDir)) continue
  console.log(`Scanning ${dir}/`)
  const files = walk(fullDir)
  for (const file of files) {
    if (processFile(file)) changedCount++
  }
}

console.log(`\n✅ Done. ${changedCount} files updated.`)

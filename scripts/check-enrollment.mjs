/**
 * Self-check for the Registrar account-generation rules (panel revision, Aug 2026).
 * Run: node scripts/check-enrollment.mjs
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// lib/enrollment.ts is plain TS with no types at runtime — strip the annotations
// so it can be imported here without a build step.
const source = readFileSync(new URL('../lib/enrollment.ts', import.meta.url), 'utf8')
  .replace(/^export (function|const) /gm, 'export $1 ')
  .replace(/: (string|number|Date|Set<string>|string\[\]|boolean)(\s*\|\s*null)?(\s*\|\s*undefined)?/g, '')
  .replace(/<[^<>()]*>(?=\()/g, '')
const module = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const { generateUsername, defaultPasswordFor, composeFullName, currentSchoolYear, formatSchoolYear } = module

// Username: first initial + last name, lowercased and stripped.
const taken = new Set()
assert.equal(generateUsername('John Mark', 'Santos', taken), 'jsantos')
assert.equal(defaultPasswordFor('jsantos'), 'jsantos123')

// Collisions get a numeric suffix and never repeat.
assert.equal(generateUsername('Jose', 'Santos', taken), 'jsantos2')
assert.equal(generateUsername('Julia', 'Santos', taken), 'jsantos3')

// Accents, spaces and punctuation are stripped out of the username.
assert.equal(generateUsername('Ma. Ángela', "Dela Cruz'", new Set()), 'mdelacruz')

// A username already claimed in the database is skipped over.
assert.equal(generateUsername('Maria', 'Reyes', new Set(['mreyes'])), 'mreyes2')

// Very short names still produce a usable username.
assert.ok(generateUsername('A', 'B', new Set()).length >= 3)

// full_name is composed "First Middle Last", blanks collapsed.
assert.equal(composeFullName('John Mark', 'Cruz', 'Santos'), 'John Mark Cruz Santos')
assert.equal(composeFullName('Maria', '', 'Reyes'), 'Maria Reyes')
assert.equal(composeFullName('', '', ''), null)

// School year runs June to March.
assert.equal(currentSchoolYear(new Date('2026-07-21')), '2026-2027')
assert.equal(currentSchoolYear(new Date('2027-02-10')), '2026-2027')
assert.equal(formatSchoolYear('2026-2027'), 'SY 2026–2027')
assert.equal(formatSchoolYear(null), '')

console.log('enrollment rules OK — username, password, full name and school year')

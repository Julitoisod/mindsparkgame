/**
 * Checks the narration splitter that keeps the storyline audible on Android.
 *
 *   node scripts/check-speech.mjs
 */
import assert from 'node:assert/strict'
import { chunkForSpeech, MAX_CHUNK } from '../lib/speechChunks.ts'

// Nothing to say
assert.deepEqual(chunkForSpeech(''), [])
assert.deepEqual(chunkForSpeech('   '), [])

// Short text stays in one piece
assert.deepEqual(chunkForSpeech('Welcome, hero!'), ['Welcome, hero!'])

// The real storyline opener — the text that went silent on the phone
const story = 'Long ago, the Enchanted Forest was a place of wonder, where numbers danced in the air and every path hummed with magic. '
  + 'But the Dark Oracle stole the five Trophies of Wisdom and scattered them across the land. '
  + 'Now the forest is fading, and only a young hero who can solve the ancient math challenges may win them back. '
  + 'Gather your courage, brave one, and begin the quest to restore the light!'
const chunks = chunkForSpeech(story)
assert.ok(chunks.length >= 3, `expected the story to split, got ${chunks.length} piece(s)`)
for (const c of chunks) assert.ok(c.length <= MAX_CHUNK, `chunk too long (${c.length}): ${c}`)
// Nothing may be lost or duplicated
assert.equal(chunks.join(' ').replace(/\s+/g, ' '), story.replace(/\s+/g, ' ').trim())

// A single sentence longer than the limit still gets broken up, on word boundaries
const long = 'word '.repeat(120).trim()
const longChunks = chunkForSpeech(long)
assert.ok(longChunks.length > 1)
for (const c of longChunks) {
  assert.ok(c.length <= MAX_CHUNK)
  assert.ok(!c.startsWith(' ') && !c.endsWith(' '))
}
assert.equal(longChunks.join(' '), long)

console.log(`Speech chunking OK — story split into ${chunks.length} pieces, longest ${Math.max(...chunks.map(c => c.length))} chars.`)

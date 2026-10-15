/**
 * Splits narration into pieces short enough for Android's speech engine.
 *
 * Android System WebView silently drops a long utterance partway through (and
 * often speaks nothing at all), which is why the storyline — the longest text
 * in the game — had no voice-over on the phone while short question prompts
 * were fine. Speaking sentence-sized pieces back to back fixes it.
 *
 * Pure function, no browser APIs, so it can be checked on its own:
 *   node scripts/check-speech.mjs
 */
export const MAX_CHUNK = 180

export function chunkForSpeech(text: string, maxChunk: number = MAX_CHUNK): string[] {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!clean) return []

  // Keep sentence endings attached to the sentence they close.
  const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean]
  const chunks: string[] = []
  let current = ''

  const push = () => {
    const trimmed = current.trim()
    if (trimmed) chunks.push(trimmed)
    current = ''
  }

  for (const sentence of sentences) {
    if (sentence.trim().length > maxChunk) {
      // A single sentence over the limit: break it on word boundaries.
      push()
      let line = ''
      for (const word of sentence.split(' ')) {
        if ((line + ' ' + word).trim().length > maxChunk) {
          if (line.trim()) chunks.push(line.trim())
          line = word
        } else {
          line = line ? `${line} ${word}` : word
        }
      }
      if (line.trim()) chunks.push(line.trim())
      continue
    }

    if ((current + sentence).trim().length > maxChunk) push()
    current += sentence
  }
  push()

  return chunks
}

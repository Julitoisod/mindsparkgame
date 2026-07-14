/**
 * lib/sounds.ts
 * Sound effects, looping background music, and voice-over.
 * Web Audio API + Speech Synthesis — no external audio files needed.
 */

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false

const MUTE_STORAGE_KEY = 'mindspark-muted'

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

/** Every sound routes through this gain so mute is a single knob. */
function getMasterGain(): GainNode {
  const ctx = getAudioContext()
  if (!masterGain) {
    masterGain = ctx.createGain()
    masterGain.gain.value = muted ? 0 : 1
    masterGain.connect(ctx.destination)
  }
  return masterGain
}

/** Reads the persisted mute preference (defaults to sound on). */
export function loadMutedPreference(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setSoundMuted(value: boolean) {
  muted = value
  try {
    if (masterGain) masterGain.gain.value = value ? 0 : 1
  } catch {
    // Audio not available
  }
  if (value) stopSpeaking()
  try {
    window.localStorage.setItem(MUTE_STORAGE_KEY, value ? '1' : '0')
  } catch {
    // Private mode
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

    gainNode.gain.setValueAtTime(volume, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.connect(gainNode)
    gainNode.connect(getMasterGain())

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Silently fail if audio not available
  }
}

/** Correct answer — happy ascending chime */
export function playCorrectSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Three ascending notes (C5, E5, G5) — happy chord
    const notes = [523, 659, 784]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.08)
      gain.gain.setValueAtTime(0.25, now + i * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.3)
      osc.connect(gain)
      gain.connect(getMasterGain())
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.3)
    })
  } catch {
    // Silently fail
  }
}

/** Wrong answer — descending buzz */
export function playWrongSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Two descending notes (E4, C4) — sad sound
    const notes = [330, 262]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)
      gain.gain.setValueAtTime(0.15, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.2)
      osc.connect(gain)
      gain.connect(getMasterGain())
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.25)
    })
  } catch {
    // Silently fail
  }
}

/** Boss hit — impact thud with reverb */
export function playBossHitSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Low thud
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(120, now)
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15)
    gain.gain.setValueAtTime(0.4, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
    osc.connect(gain)
    gain.connect(getMasterGain())
    osc.start(now)
    osc.stop(now + 0.3)

    // High impact click
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(800, now)
    gain2.gain.setValueAtTime(0.2, now)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
    osc2.connect(gain2)
    gain2.connect(getMasterGain())
    osc2.start(now)
    osc2.stop(now + 0.05)
  } catch {
    // Silently fail
  }
}

/** Level complete — victory fanfare */
export function playLevelCompleteSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Ascending fanfare: C5, E5, G5, C6
    const notes = [523, 659, 784, 1047]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + i * 0.12)
      gain.gain.setValueAtTime(0.3, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.5)
      osc.connect(gain)
      gain.connect(getMasterGain())
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.5)
    })
  } catch {
    // Silently fail
  }
}

/** Boss battle warning — dramatic low pulse */
export function playBossWarningSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Three low pulses
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(150, now + i * 0.25)
      gain.gain.setValueAtTime(0.3, now + i * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.25 + 0.15)
      osc.connect(gain)
      gain.connect(getMasterGain())
      osc.start(now + i * 0.25)
      osc.stop(now + i * 0.25 + 0.2)
    }
  } catch {
    // Silently fail
  }
}

/** Game over — sad descending */
export function playGameOverSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    const notes = [392, 330, 262, 196]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.2)
      gain.gain.setValueAtTime(0.25, now + i * 0.2)
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.2 + 0.4)
      osc.connect(gain)
      gain.connect(getMasterGain())
      osc.start(now + i * 0.2)
      osc.stop(now + i * 0.2 + 0.4)
    })
  } catch {
    // Silently fail
  }
}

/** Button click — soft pop */
export function playClickSound() {
  playTone(880, 0.08, 'sine', 0.15)
}

// ── Background music ────────────────────────────────────────────────────────
// Generated chiptune-style loops: a melody voice plus a bass voice stepping
// through note tables. One interval timer drives the active theme.

export type MusicTheme = 'map' | 'battle' | 'boss'

type MusicSpec = {
  stepMs: number
  wave: OscillatorType
  volume: number
  melody: number[] // Hz, 0 = rest
  bass: number[] // Hz, 0 = rest
}

const MUSIC: Record<MusicTheme, MusicSpec> = {
  // Gentle wandering theme for the map and story screens (C major)
  map: {
    stepMs: 300,
    wave: 'triangle',
    volume: 0.1,
    melody: [523, 587, 659, 784, 659, 587, 523, 440, 494, 523, 587, 659, 587, 523, 494, 440],
    bass: [131, 0, 165, 0, 147, 0, 165, 0],
  },
  // Upbeat adventure theme for the quiz phase (A minor)
  battle: {
    stepMs: 240,
    wave: 'square',
    volume: 0.05,
    melody: [440, 523, 440, 659, 587, 523, 587, 440, 392, 494, 392, 587, 523, 494, 523, 392],
    bass: [110, 110, 98, 98, 87, 87, 98, 98],
  },
  // Tense low theme for the boss fight (E minor)
  boss: {
    stepMs: 200,
    wave: 'sawtooth',
    volume: 0.04,
    melody: [330, 311, 330, 392, 330, 311, 294, 311, 330, 392, 440, 392, 330, 311, 330, 247],
    bass: [82, 82, 82, 78, 82, 82, 82, 73],
  },
}

let musicTimer: number | null = null
let musicTheme: MusicTheme | null = null
let unlockListenerAttached = false

function playMusicNote(freq: number, durationSec: number, wave: OscillatorType, volume: number) {
  if (freq <= 0) return
  try {
    const ctx = getAudioContext()
    // Never schedule into a suspended context (autoplay policy): queued
    // oscillators would all fire at once — a loud burst — on the first tap.
    if (ctx.state !== 'running') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = wave
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec)
    osc.connect(gain)
    gain.connect(getMasterGain())
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + durationSec)
  } catch {
    // Silently fail
  }
}

/** First user gesture unlocks the AudioContext when autoplay blocked it. */
function attachUnlockListener() {
  if (unlockListenerAttached) return
  unlockListenerAttached = true
  const unlock = () => {
    try {
      getAudioContext()
    } catch {
      // Still blocked — the next call will retry
    }
    document.removeEventListener('pointerdown', unlock)
  }
  document.addEventListener('pointerdown', unlock)
}

/** Starts (or switches to) a looping background music theme. */
export function startMusic(theme: MusicTheme) {
  if (musicTheme === theme && musicTimer !== null) return
  stopMusic()
  musicTheme = theme
  const spec = MUSIC[theme]
  let step = 0
  attachUnlockListener()
  musicTimer = window.setInterval(() => {
    playMusicNote(spec.melody[step % spec.melody.length], (spec.stepMs / 1000) * 0.9, spec.wave, spec.volume)
    if (step % 2 === 0) {
      playMusicNote(spec.bass[(step / 2) % spec.bass.length], (spec.stepMs / 1000) * 1.8, 'triangle', spec.volume * 1.3)
    }
    step++
  }, spec.stepMs)
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer)
    musicTimer = null
  }
  musicTheme = null
}

// ── Voice-over ──────────────────────────────────────────────────────────────
// Speech Synthesis reads story beats, questions, and results aloud so young
// students can follow along even before they read fluently.

/** Speaks text aloud, cancelling anything already being spoken. */
export function speak(text: string) {
  if (muted || !text) return
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.pitch = 1.05
    synth.speak(utterance)
  } catch {
    // Speech not available — game stays playable
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    // Silently fail
  }
}

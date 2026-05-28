/**
 * lib/sounds.ts
 * Sound effects using Web Audio API — no external files needed.
 * Kid-friendly sounds: chimes, beeps, and fun effects.
 */

let audioContext: AudioContext | null = null

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
    gainNode.connect(ctx.destination)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // Silently fail if audio not available
  }
}

/** 🎵 Correct answer — happy ascending chime */
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
      gain.connect(ctx.destination)
      osc.start(now + i * 0.08)
      osc.stop(now + i * 0.08 + 0.3)
    })
  } catch {
    // Silently fail
  }
}

/** ❌ Wrong answer — descending buzz */
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
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.25)
    })
  } catch {
    // Silently fail
  }
}

/** ⚔️ Boss hit — impact thud with reverb */
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
    gain.connect(ctx.destination)
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
    gain2.connect(ctx.destination)
    osc2.start(now)
    osc2.stop(now + 0.05)
  } catch {
    // Silently fail
  }
}

/** 🎉 Level complete — victory fanfare */
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
      gain.connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.5)
    })
  } catch {
    // Silently fail
  }
}

/** ⚠️ Boss battle warning — dramatic low pulse */
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
      gain.connect(ctx.destination)
      osc.start(now + i * 0.25)
      osc.stop(now + i * 0.25 + 0.2)
    }
  } catch {
    // Silently fail
  }
}

/** 💀 Game over — sad descending */
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
      gain.connect(ctx.destination)
      osc.start(now + i * 0.2)
      osc.stop(now + i * 0.2 + 0.4)
    })
  } catch {
    // Silently fail
  }
}

/** 🔘 Button click — soft pop */
export function playClickSound() {
  playTone(880, 0.08, 'sine', 0.15)
}

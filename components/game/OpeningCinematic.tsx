'use client'
/**
 * "The Legend of the Five Math Crystals" — the opening cinematic that plays
 * after the student signs in (panel revision, Nov 2026b, REVISIONSS.pdf):
 * six animated scenes, narrated aloud by Spark, with subtitles, Skip and Next.
 *
 * Built from the game's own art (backgrounds, hero and guardian sprites) plus
 * CSS effects. Sprites are CSS backgrounds, not <img>: globals.css forces every
 * img inside .game-screen to 100% x 100%. Sized for an 800x360 landscape phone.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Map as MapIcon, SkipForward, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { playBossWarningSound, playClickSound, playLevelCompleteSound, speak, stopSpeaking } from '@/lib/sounds'
import { NARRATOR, levelStories, openingScenes } from '@/lib/storyContent'

type Kingdom = { background: string; guardian: string }

interface Props {
  heroImage: string
  kingdoms: Kingdom[]
  villainImage: string
  muted: boolean
  onToggleSound: () => void
  onClose: () => void
}

const WORLD_BG = '/revision/student-login-bg.jpg'
const MAP_BG = '/revision/map-bg.jpg'
/** Pause after Spark finishes a line before the next scene. */
const LINE_GAP_MS = 900
const MIN_SCENE_MS = 3200
const MS_PER_WORD = 430

const sprite = (src: string): React.CSSProperties => ({
  backgroundImage: `url("${encodeURI(src)}")`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center bottom',
})

export function Gem({ color, className = 'h-5 w-5' }: { color: string; className?: string }) {
  return (
    <span
      className={`block rotate-45 rounded-[4px] border border-white/70 ${className}`}
      style={{ background: `linear-gradient(135deg, #ffffffcc 0%, ${color} 45%, ${color} 100%)`, boxShadow: `0 0 14px ${color}, 0 0 28px ${color}88` }}
    />
  )
}

/** Spark — the little star who narrates the story. */
export function SparkMascot({ className = 'h-14 w-14' }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 64 64" className={className} animate={{ y: [0, -5, 0], rotate: [0, 6, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} aria-label="Spark">
      <defs>
        <radialGradient id="spark-body" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff7c2" />
          <stop offset="60%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="34" r="26" fill="#fde68a" opacity="0.35" />
      <path d="M32 4 L39.5 22 L59 23.5 L44 36 L49 55 L32 44.5 L15 55 L20 36 L5 23.5 L24.5 22 Z" fill="url(#spark-body)" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="26" cy="31" rx="3" ry="4" fill="#1f2430" />
      <ellipse cx="38" cy="31" rx="3" ry="4" fill="#1f2430" />
      <circle cx="27" cy="29.5" r="1.1" fill="#fff" />
      <circle cx="39" cy="29.5" r="1.1" fill="#fff" />
      <path d="M26 38 Q32 43 38 38" fill="none" stroke="#1f2430" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="37" r="2.2" fill="#fb7185" opacity="0.6" />
      <circle cx="43" cy="37" r="2.2" fill="#fb7185" opacity="0.6" />
    </motion.svg>
  )
}

function Backdrop({ src, dim = 0, zoom = false }: { src: string; dim?: number; zoom?: boolean }) {
  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{ backgroundImage: `url("${src}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        initial={{ scale: 1.08 }}
        animate={{ scale: zoom ? 1.35 : 1 }}
        transition={{ duration: zoom ? 9 : 6, ease: 'easeOut' }}
      />
      <motion.div className="absolute inset-0 bg-[#0b0620]" initial={{ opacity: 0 }} animate={{ opacity: dim }} transition={{ duration: 1.6 }} />
    </>
  )
}

const crystals = levelStories.map(s => s.crystalColor)

function SceneArt({ index, heroImage, kingdoms, villainImage }: { index: number } & Pick<Props, 'heroImage' | 'kingdoms' | 'villainImage'>) {
  switch (index) {
    case 0: // The Magical World — five crystals light the sky
      return (
        <>
          <Backdrop src={WORLD_BG} />
          <div className="absolute inset-x-0 top-[10%] flex justify-center gap-[6vw]">
            {crystals.map((c, i) => (
              <motion.div key={c} initial={{ opacity: 0, y: 30, scale: 0.4 }} animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }} transition={{ delay: 0.4 + i * 0.25, y: { duration: 2.6, repeat: Infinity, delay: i * 0.3 } }}>
                <Gem color={c} className="h-[5vh] w-[5vh] min-h-4 min-w-4" />
              </motion.div>
            ))}
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="absolute left-1/2 top-[24%] -translate-x-1/2 whitespace-nowrap text-center font-game text-[clamp(16px,5vh,36px)] font-black text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.6)]">
            The Legend of the Five Math Crystals
          </motion.p>
        </>
      )
    case 1: // The Darkness Arrives — Lord Numerox steals the crystals
      return (
        <>
          <Backdrop src={WORLD_BG} dim={0.72} />
          {[0, 1, 2, 3].map(i => (
            <motion.span key={i} className="absolute h-[40vh] w-[60vw] rounded-full bg-[#1b0b33] blur-2xl" style={{ top: `${-18 + i * 6}%`, left: `${-20 + i * 30}%` }} initial={{ x: i % 2 ? '40%' : '-40%', opacity: 0 }} animate={{ x: 0, opacity: 0.85 }} transition={{ duration: 1.8, delay: i * 0.2 }} />
          ))}
          <motion.div className="absolute bottom-[30%] left-1/2 h-[42vh] w-[42vh] -translate-x-1/2" style={{ ...sprite(villainImage), filter: 'brightness(0.55) saturate(1.4) drop-shadow(0 0 18px #a855f7)' }} initial={{ y: 60, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1.1 }} transition={{ duration: 1.4, delay: 0.6 }} />
          <motion.p className="absolute left-1/2 top-[8%] -translate-x-1/2 font-game text-[clamp(14px,4vh,28px)] font-black tracking-wide text-[#e9d5ff] drop-shadow-[0_0_10px_#a855f7]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>
            LORD NUMEROX
          </motion.p>
          {crystals.map((c, i) => (
            <motion.div key={c} className="absolute" style={{ left: `${18 + i * 16}%`, top: '20%' }} initial={{ opacity: 1 }} animate={{ left: '50%', top: '45%', opacity: 0, scale: 0.3 }} transition={{ delay: 1.8 + i * 0.2, duration: 1.1 }}>
              <Gem color={c} className="h-6 w-6" />
            </motion.div>
          ))}
          <div className="absolute inset-x-[6%] bottom-[30%] flex justify-between">
            {kingdoms.map((k, i) => (
              <motion.div key={i} className="h-[16vh] w-[16vh]" style={{ ...sprite(k.guardian), filter: 'brightness(0.3) drop-shadow(0 0 8px #ef4444)', transform: 'scaleX(-1)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3 + i * 0.25 }} />
            ))}
          </div>
        </>
      )
    case 2: // The Chosen Hero — Spark brings the glowing map
      return (
        <>
          <Backdrop src={WORLD_BG} dim={0.2} />
          <motion.div className="absolute bottom-[26%] left-[28%] h-[44vh] w-[30vh]" style={sprite(heroImage)} initial={{ x: -120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, type: 'spring' }} />
          <motion.div className="absolute flex items-center gap-1" initial={{ left: '92%', top: '12%' }} animate={{ left: '46%', top: '30%' }} transition={{ duration: 2.2, delay: 0.8, ease: 'easeInOut' }}>
            <SparkMascot className="h-[13vh] w-[13vh] min-h-12 min-w-12" />
            <motion.span animate={{ boxShadow: ['0 0 10px #fde68a', '0 0 26px #fde68a', '0 0 10px #fde68a'] }} transition={{ duration: 1.4, repeat: Infinity }} className="flex items-center justify-center rounded-lg bg-[#fef3c7] p-1.5 text-[#b45309]">
              <MapIcon className="h-[5vh] w-[5vh] min-h-4 min-w-4" />
            </motion.span>
          </motion.div>
          <motion.p initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.6, type: 'spring' }} className="absolute right-[10%] top-[18%] font-game text-[clamp(18px,6vh,44px)] font-black text-yellow-300 drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]">
            YOU!
          </motion.p>
        </>
      )
    case 3: // The Five Kingdoms — one by one
      return (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#1e1b4b]" />
          <div className="absolute inset-x-[3%] top-[8%] grid grid-cols-5 gap-[1.5vw]">
            {levelStories.map((s, i) => (
              <motion.div key={s.level} initial={{ opacity: 0, y: 30, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5 + i * 1.1, type: 'spring', stiffness: 220 }} className="overflow-hidden rounded-xl border-2 border-white/25 bg-[#0f0a1f]/70 shadow-xl">
                <div className="relative h-[26vh]" style={{ backgroundImage: `url("${encodeURI(kingdoms[i]?.background ?? WORLD_BG)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-1 right-1 h-[15vh] w-[15vh]" style={{ ...sprite(kingdoms[i]?.guardian ?? ''), transform: 'scaleX(-1)' }} />
                  <div className="absolute left-1.5 top-1.5"><Gem color={s.crystalColor} className="h-3.5 w-3.5" /></div>
                </div>
                <div className="px-1.5 py-1 text-center">
                  <p className="truncate text-[clamp(8px,2.4vh,13px)] font-black leading-tight text-white">{s.place}</p>
                  <p className="truncate text-[clamp(7px,2vh,11px)] font-bold text-amber-200">{s.enemy}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )
    case 4: // The Mission — the sword of light and five glowing crystals
      return (
        <>
          <Backdrop src={MAP_BG} dim={0.35} />
          <div className="absolute left-1/2 top-[6%] flex -translate-x-1/2 items-end gap-[3vw]">
            {crystals.map((c, i) => (
              <motion.div key={c} style={{ marginBottom: `${Math.abs(2 - i) * -2.5}vh` }} initial={{ opacity: 0.2 }} animate={{ opacity: 1, scale: [1, 1.2, 1] }} transition={{ delay: i * 0.2, scale: { duration: 1.6, repeat: Infinity, delay: i * 0.2 } }}>
                <Gem color={c} className="h-[5vh] w-[5vh] min-h-4 min-w-4" />
              </motion.div>
            ))}
          </div>
          <div className="absolute bottom-[26%] left-1/2 h-[42vh] w-[30vh] -translate-x-1/2">
            <div className="absolute inset-0" style={sprite(heroImage)} />
            <motion.span className="absolute -right-[2vh] bottom-[30%] h-[30vh] w-[1.2vh] origin-bottom rounded-full bg-gradient-to-t from-amber-200 via-white to-yellow-100" style={{ rotate: 20 }} animate={{ boxShadow: ['0 0 12px #fef08a', '0 0 34px #fef08a', '0 0 12px #fef08a'] }} transition={{ duration: 1.2, repeat: Infinity }} />
          </div>
          <div className="absolute bottom-[34%] left-[22%]"><SparkMascot className="h-[12vh] w-[12vh] min-h-11 min-w-11" /></div>
        </>
      )
    default: // The Adventure Begins — zoom toward the map
      return (
        <>
          <Backdrop src={MAP_BG} zoom />
          <div className="absolute inset-x-[8%] top-[34%] flex justify-between">
            {levelStories.map((s, i) => (
              <motion.span key={s.level} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.35, type: 'spring' }} className="flex h-[8vh] w-[8vh] min-h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-[#0f0a1f]/70 font-black text-white" style={{ boxShadow: `0 0 18px ${s.crystalColor}` }}>
                L{s.level}
              </motion.span>
            ))}
          </div>
          <motion.p initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.4, type: 'spring', stiffness: 180 }} className="absolute inset-x-0 top-[8%] text-center font-game text-[clamp(18px,7vh,48px)] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-orange-400 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]">
            YOUR ADVENTURE BEGINS NOW!
          </motion.p>
        </>
      )
  }
}

export default function OpeningCinematic({ heroImage, kingdoms, villainImage, muted, onToggleSound, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const last = index === openingScenes.length - 1
  const scene = openingScenes[index]
  const closing = useRef(false)

  function next() {
    playClickSound()
    if (last) { finish(); return }
    setIndex(i => Math.min(i + 1, openingScenes.length - 1))
  }

  function finish() {
    if (closing.current) return
    closing.current = true
    stopSpeaking()
    onClose()
  }

  // Narrate each scene; move on when Spark finishes (or after a reading-time
  // fallback when the voice is muted or the engine never reports the end).
  useEffect(() => {
    if (index === 1) playBossWarningSound()
    if (last) playLevelCompleteSound()
    let settled = false
    const started = Date.now()
    const readingMs = Math.max(MIN_SCENE_MS, scene.line.split(/\s+/).length * MS_PER_WORD + 1200)
    const advance = () => {
      if (settled || last) return
      settled = true
      setIndex(i => Math.min(i + 1, openingScenes.length - 1))
    }
    const fallback = window.setTimeout(advance, muted ? readingMs : readingMs * 1.8)
    speak(scene.line, () => window.setTimeout(advance, Math.max(LINE_GAP_MS, MIN_SCENE_MS - (Date.now() - started))))
    return () => { settled = true; window.clearTimeout(fallback); stopSpeaking() }
  }, [index, last, muted, scene.line])

  return (
    <motion.div
      data-testid="opening-cinematic"
      className="absolute inset-0 z-[150] overflow-hidden bg-black text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        <motion.div key={index} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <SceneArt index={index} heroImage={heroImage} kingdoms={kingdoms} villainImage={villainImage} />
        </motion.div>
      </AnimatePresence>

      {/* Top bar: scene title + progress, sound, skip */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-2">
        <span className="rounded-full bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200 backdrop-blur-sm">
          Scene {index + 1} · {scene.title}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="mr-1 flex gap-1">
            {openingScenes.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-yellow-300' : i < index ? 'w-1.5 bg-white/80' : 'w-1.5 bg-white/30'}`} />)}
          </div>
          <button type="button" onClick={onToggleSound} aria-label={muted ? 'Turn sound on' : 'Turn sound off'} className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/45 backdrop-blur-sm hover:bg-black/60">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => { playClickSound(); finish() }} className="flex h-8 items-center gap-1 rounded-lg bg-black/45 px-3 text-xs font-black backdrop-blur-sm hover:bg-black/60">
            Skip <SkipForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Spark's subtitle */}
      <div className="absolute inset-x-2 bottom-2 z-10 flex items-end gap-2 sm:inset-x-6">
        <SparkMascot className="h-12 w-12 shrink-0 drop-shadow-[0_0_10px_rgba(253,230,138,0.8)]" />
        <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex min-w-0 flex-1 items-end gap-2 rounded-2xl border-2 border-amber-300/60 bg-[#140d2e]/85 px-3 py-2 shadow-2xl backdrop-blur-md">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{NARRATOR}</p>
            <p className="text-[clamp(11px,3.6vh,15px)] font-semibold leading-snug text-[#F4F2FF]">&ldquo;{scene.line}&rdquo;</p>
          </div>
          <button
            type="button"
            onClick={next}
            className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-black shadow-lg ${last ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'}`}
          >
            {last ? <><Sparkles className="h-4 w-4" /> Start Adventure</> : <>Next <ChevronRight className="h-4 w-4" /></>}
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}

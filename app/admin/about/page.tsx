/**
 * Admin — About MindSpark (panel revision, Nov 2026b: "create an About page in
 * the sidebar — about what is MindSpark, table for the proficiency level").
 * Server component: the level list is read straight from the question bank file.
 */
import { BookOpen, Gamepad2, GraduationCap, Info, ShieldCheck, Swords, Trophy } from 'lucide-react'
import PageHeader from '@/components/teacher/PageHeader'
import { BAND_COLORS } from '@/lib/analytics'
import m5 from '@/lib/m5Questions.json'

/** DepEd Order No. 31, s. 2012 — the same cut-offs lib/proficiency.ts applies. */
const PROFICIENCY = [
  { level: 'Advanced', code: 'A', range: '90% and above', perLevel: '9 – 10', text: 'Exceeds the core requirements in knowledge, skills and understanding, and can transfer them automatically and flexibly.' },
  { level: 'Proficient', code: 'P', range: '85% – 89%', perLevel: '8.5 – 8.9', text: 'Has developed the fundamental knowledge, skills and core understandings, and can transfer them independently.' },
  { level: 'Approaching Proficiency', code: 'AP', range: '80% – 84%', perLevel: '8 – 8.4', text: 'Has developed the fundamental knowledge and skills; transfers them with little guidance from the teacher or some help from peers.' },
  { level: 'Developing', code: 'D', range: '75% – 79%', perLevel: '7.5 – 7.9', text: 'Has the minimum knowledge, skills and core understandings, but needs help throughout the tasks.' },
  { level: 'Beginning', code: 'B', range: '74% and below', perLevel: '7.4 and below', text: 'Struggles with understanding; prerequisite knowledge and skills have not yet been acquired or developed adequately.' },
]

const ROLES = [
  { icon: Gamepad2, title: 'Students', text: 'Play on the MindSpark Android app: an opening story, five kingdoms, a 5-question quiz and a 5-question boss battle per level, stars, trophies, badges and avatars.' },
  { icon: GraduationCap, title: 'Teachers', text: 'Use the web: manage their classroom and sections, enroll students, open levels, set deadlines, edit the question bank and read reports.' },
  { icon: ShieldCheck, title: 'Administrator', text: 'Creates and manages teacher accounts and oversees every classroom, section and student report from one dashboard.' },
]

export default function AdminAboutPage() {
  return (
    <div className="space-y-5">
      <PageHeader icon={Info} title="About MindSpark" subtitle="What MindSpark is, how it works, and how proficiency is measured." />

      <section className="grid gap-4 rounded-2xl border border-[#ece8f5] bg-white p-6 shadow-sm lg:grid-cols-[auto_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mindspark-logo.webp" alt="MindSpark Math" className="h-28 w-28 rounded-3xl shadow-lg" />
        <div>
          <h3 className="text-xl font-black text-[#1e1b4b]">What is MindSpark?</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#4b4763]">
            <b>MindSpark Math</b> is a game-based learning system for <b>Grade 5 Mathematics</b>. Students become the
            hero of <i>The Legend of the Five Math Crystals</i>: they travel through five kingdoms of Mathoria, answer
            math challenges to power up, and defeat each monster guardian in a boss battle to recover a crystal.
            Every answer is recorded, so teachers see each learner&apos;s best score per level, their proficiency and
            the lessons they find hardest — and can step in early.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BookOpen, label: '5 levels', sub: '10 questions each' },
              { icon: Swords, label: 'Quiz + Boss', sub: '10 pts · 20 pts per answer' },
              { icon: Trophy, label: '5 trophies · 7 badges', sub: 'plus stars and avatars' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl bg-[#faf8ff] p-3">
                <f.icon className="h-5 w-5 text-[#6255E8]" />
                <div><p className="text-sm font-bold text-[#1f2430]">{f.label}</p><p className="text-[11px] text-[#8f88a1]">{f.sub}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map(r => (
          <section key={r.title} className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
            <r.icon className="h-6 w-6 text-[#6255E8]" />
            <h4 className="mt-2 font-bold text-[#1f2430]">{r.title}</h4>
            <p className="mt-1 text-sm leading-relaxed text-[#5f5677]">{r.text}</p>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm">
        <h3 className="font-bold text-[#1f2430]">Levels and Lessons</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-[#faf8ff] text-left text-xs font-bold text-[#6f7187]">
                <th className="rounded-l-lg px-3 py-2">Level</th>
                <th className="px-3 py-2">Title</th>
                <th className="rounded-r-lg px-3 py-2">Lessons covered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ecf8]">
              {m5.levels.map(l => (
                <tr key={l.level}>
                  <td className="px-3 py-2.5 font-black text-[#6255E8]">L{l.level}</td>
                  <td className="px-3 py-2.5 font-semibold text-[#1f2430]">{l.title}</td>
                  <td className="px-3 py-2.5 text-[#5f5677]">{l.lessons.map(x => x.category).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ece8f5] bg-white p-5 shadow-sm" data-testid="proficiency-table">
        <h3 className="font-bold text-[#1f2430]">Proficiency Levels</h3>
        <p className="text-xs text-[#8f88a1]">
          DepEd Order No. 31, s. 2012. MindSpark computes the percentage from each student&apos;s best run on every level
          they have played (score out of 10 per level). A student who has not played yet is shown as &ldquo;Not Started&rdquo;.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-[#faf8ff] text-left text-xs font-bold text-[#6f7187]">
                <th className="rounded-l-lg px-3 py-2">Level of Proficiency</th>
                <th className="px-3 py-2">Percentage</th>
                <th className="px-3 py-2">Average score per level (/10)</th>
                <th className="rounded-r-lg px-3 py-2">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ecf8]">
              {PROFICIENCY.map(p => (
                <tr key={p.level}>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 font-bold text-[#1f2430]">
                      <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: BAND_COLORS[p.level] }} />
                      {p.level} <span className="text-xs font-semibold text-[#8f88a1]">({p.code})</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#1f2430]">{p.range}</td>
                  <td className="px-3 py-3 text-[#5f5677]">{p.perLevel}</td>
                  <td className="px-3 py-3 text-[#5f5677]">{p.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

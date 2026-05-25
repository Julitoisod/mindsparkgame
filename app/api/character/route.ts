import { NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { characterOptions, getCharacterOption } from '@/lib/characterOptions'
import type { CharacterClass } from '@/types/character'

interface DbCharacterRow {
  id: number; userId: number; name: string; class: CharacterClass
  hp: number; maxHp: number; mp: number; maxMp: number
  attack: number; defense: number; speed: number
  level: number; experience: number; experienceToNext: number
  positionX: number; positionY: number; positionZ: number
  direction: string; animationState: string
  created_at: string; updated_at: string
}

type CharacterMeta = {
  starBalance: number
  ownedClasses: CharacterClass[]
  prices: Partial<Record<CharacterClass, number>>
}

const selectableClasses: CharacterClass[] = characterOptions.map(option => option.class)
const prices = Object.fromEntries(
  characterOptions.map(option => [option.class, option.unlockCost]),
) as Partial<Record<CharacterClass, number>>

function isSelectableClass(value: string): value is CharacterClass {
  return selectableClasses.includes(value as CharacterClass)
}

function publicCharacter(row: DbCharacterRow) {
  return {
    ...row,
    stats: {
      hp: row.hp,
      maxHp: row.maxHp,
      mp: row.mp,
      maxMp: row.maxMp,
      attack: row.attack,
      defense: row.defense,
      speed: row.speed,
      level: row.level,
      experience: row.experience,
      experienceToNext: row.experienceToNext,
    },
  }
}

async function requireEnrolledStudent() {
  const session = await getSession()
  if (!session) return null

  const users = await query<{ role: string; enrollmentStatus: string }>(
    `SELECT role, enrollment_status AS enrollmentStatus
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [session.userId],
  )

  if (!users.length) return null
  if (users[0].role !== 'student' || users[0].enrollmentStatus !== 'enrolled') return null
  return session
}

async function getCharacters(userId: number) {
  return query<DbCharacterRow>(
    `SELECT
       id, user_id AS userId, name, class,
       hp, max_hp AS maxHp, mp, max_mp AS maxMp,
       attack, defense, speed, level, experience,
       experience_to_next AS experienceToNext,
       position_x AS positionX, position_y AS positionY, position_z AS positionZ,
       direction, animation_state AS animationState,
       created_at, updated_at
     FROM character_data
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId],
  )
}

async function ensureWallet(userId: number) {
  await execute(
    `INSERT IGNORE INTO student_wallets (user_id, stars)
     VALUES (?, 0)`,
    [userId],
  )
}

async function getCharacterMeta(userId: number, activeClass?: CharacterClass | null): Promise<CharacterMeta> {
  await ensureWallet(userId)

  const wallets = await query<{ stars: number }>(
    'SELECT stars FROM student_wallets WHERE user_id = ? LIMIT 1',
    [userId],
  )
  const unlockRows = await query<{ class: CharacterClass }>(
    'SELECT class FROM character_unlocks WHERE user_id = ?',
    [userId],
  )

  const owned = new Set<CharacterClass>()
  unlockRows.forEach(row => {
    if (isSelectableClass(row.class)) owned.add(row.class)
  })
  if (activeClass && isSelectableClass(activeClass)) owned.add(activeClass)

  return {
    starBalance: Number(wallets[0]?.stars ?? 0),
    ownedClasses: Array.from(owned),
    prices,
  }
}

async function upsertUnlock(userId: number, characterClass: CharacterClass, costStars: number) {
  await execute(
    `INSERT INTO character_unlocks (user_id, class, cost_stars)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE cost_stars = LEAST(cost_stars, VALUES(cost_stars))`,
    [userId, characterClass, costStars],
  )
}

async function readCharacter(userId: number, characterId: number) {
  const rows = await getCharacters(userId)
  return rows.find(row => row.id === characterId) ?? null
}

export async function GET() {
  try {
    const session = await requireEnrolledStudent()
    if (!session) return NextResponse.json({ success: false, message: 'Enrolled student access required' }, { status: 403 })

    const rows = await getCharacters(session.userId)
    const activeClass = rows[0]?.class ?? null
    const meta = await getCharacterMeta(session.userId, activeClass)

    return NextResponse.json({
      success: true,
      message: 'OK',
      data: rows.map(publicCharacter),
      meta,
    })
  } catch (error) {
    console.error('[API /api/character GET]', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await requireEnrolledStudent()
  if (!session) return NextResponse.json({ success: false, message: 'Enrolled student access required' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const requestedClass = typeof body.class === 'string' ? body.class : ''
  if (!isSelectableClass(requestedClass)) {
    return NextResponse.json({ success: false, message: 'Choose a valid character.' }, { status: 422 })
  }

  const name =
    typeof body.name === 'string' && body.name.trim().length > 0
      ? body.name.trim().slice(0, 64)
      : `${session.username}'s Hero`
  const option = getCharacterOption(requestedClass)
  const stats = option.stats

  await ensureWallet(session.userId)
  const existing = await getCharacters(session.userId)
  const activeCharacter = existing[0] ?? null

  if (!activeCharacter) {
    const result = await execute(
      `INSERT INTO character_data
         (user_id, name, class, hp, max_hp, mp, max_mp, attack, defense, speed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.userId, name, option.class,
        stats.hp, stats.maxHp, stats.mp, stats.maxMp,
        stats.attack, stats.defense, stats.speed,
      ],
    )
    await upsertUnlock(session.userId, option.class, 0)

    const character = await readCharacter(session.userId, result.insertId)
    const meta = await getCharacterMeta(session.userId, option.class)
    return NextResponse.json(
      { success: true, message: 'Character selected', data: character ? publicCharacter(character) : null, meta },
      { status: 201 },
    )
  }

  const metaBefore = await getCharacterMeta(session.userId, activeCharacter.class)
  const alreadyOwned = metaBefore.ownedClasses.includes(option.class)

  if (!alreadyOwned) {
    const cost = prices[option.class] ?? option.unlockCost
    if (metaBefore.starBalance < cost) {
      return NextResponse.json(
        {
          success: false,
          message: `You need ${cost} stars to unlock ${option.label}.`,
          data: { requiredStars: cost, starBalance: metaBefore.starBalance },
          meta: metaBefore,
        },
        { status: 403 },
      )
    }

    await execute(
      `UPDATE student_wallets
       SET stars = stars - ?
       WHERE user_id = ? AND stars >= ?`,
      [cost, session.userId, cost],
    )
    await upsertUnlock(session.userId, option.class, cost)
  }

  await execute(
    `UPDATE character_data SET
       name = ?, class = ?,
       hp = ?, max_hp = ?, mp = ?, max_mp = ?,
       attack = ?, defense = ?, speed = ?,
       updated_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [
      name, option.class,
      stats.hp, stats.maxHp, stats.mp, stats.maxMp,
      stats.attack, stats.defense, stats.speed,
      activeCharacter.id, session.userId,
    ],
  )

  const rows = await getCharacters(session.userId)
  const meta = await getCharacterMeta(session.userId, option.class)

  return NextResponse.json({
    success: true,
    message: alreadyOwned ? 'Character selected' : 'Character unlocked',
    data: publicCharacter(rows[0]),
    meta,
  })
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  const { characterId, stats, positionX, positionY, positionZ, direction } = body as {
    characterId: number
    stats?: {
      hp?: number; maxHp?: number; mp?: number; maxMp?: number
      attack?: number; defense?: number; speed?: number
      level?: number; experience?: number; experienceToNext?: number
    }
    positionX?: number; positionY?: number; positionZ?: number
    direction?: string
  }

  if (!characterId) {
    return NextResponse.json({ success: false, message: 'characterId required' }, { status: 400 })
  }

  const owned = await query<{ id: number }>(
    'SELECT id FROM character_data WHERE id = ? AND user_id = ? LIMIT 1',
    [characterId, session.userId],
  )
  if (!owned.length) {
    return NextResponse.json({ success: false, message: 'Character not found' }, { status: 404 })
  }

  await execute(
    `UPDATE character_data SET
       hp              = COALESCE(?, hp),
       max_hp          = COALESCE(?, max_hp),
       mp              = COALESCE(?, mp),
       max_mp          = COALESCE(?, max_mp),
       attack          = COALESCE(?, attack),
       defense         = COALESCE(?, defense),
       speed           = COALESCE(?, speed),
       level           = COALESCE(?, level),
       experience      = COALESCE(?, experience),
       experience_to_next = COALESCE(?, experience_to_next),
       position_x      = COALESCE(?, position_x),
       position_y      = COALESCE(?, position_y),
       position_z      = COALESCE(?, position_z),
       direction       = COALESCE(?, direction),
       updated_at      = NOW()
     WHERE id = ? AND user_id = ?`,
    [
      stats?.hp ?? null, stats?.maxHp ?? null,
      stats?.mp ?? null, stats?.maxMp ?? null,
      stats?.attack ?? null, stats?.defense ?? null, stats?.speed ?? null,
      stats?.level ?? null, stats?.experience ?? null, stats?.experienceToNext ?? null,
      positionX ?? null, positionY ?? null, positionZ ?? null,
      direction ?? null,
      characterId, session.userId,
    ],
  )

  return NextResponse.json({ success: true, message: 'Character updated' })
}

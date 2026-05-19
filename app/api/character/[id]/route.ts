import { NextResponse }  from 'next/server'
import { query, execute } from '@/lib/db'
import { getSession }     from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/character/[id]
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const charId = parseInt(id, 10)
  if (isNaN(charId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

  const rows = await query<Record<string, unknown>>(
    `SELECT
       id, user_id AS userId, name, class,
       hp, max_hp AS maxHp, mp, max_mp AS maxMp,
       attack, defense, speed, level, experience,
       experience_to_next AS experienceToNext,
       position_x AS positionX, position_y AS positionY, position_z AS positionZ,
       direction, animation_state AS animationState,
       created_at, updated_at
     FROM character_data
     WHERE id = ? AND user_id = ? LIMIT 1`,
    [charId, session.userId],
  )

  if (!rows.length) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  const r = rows[0] as Record<string, unknown>
  const character = {
    ...r,
    stats: {
      hp: r.hp, maxHp: r.maxHp, mp: r.mp, maxMp: r.maxMp,
      attack: r.attack, defense: r.defense, speed: r.speed,
      level: r.level, experience: r.experience, experienceToNext: r.experienceToNext,
    },
  }

  return NextResponse.json({ success: true, message: 'OK', data: character })
}

/**
 * DELETE /api/character/[id]
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const charId = parseInt(id, 10)
  if (isNaN(charId)) return NextResponse.json({ success: false, message: 'Invalid ID' }, { status: 400 })

  const result = await execute(
    'DELETE FROM character_data WHERE id = ? AND user_id = ?',
    [charId, session.userId],
  )

  if (result.affectedRows === 0) {
    return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Character deleted' })
}

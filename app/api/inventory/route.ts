import { NextResponse }  from 'next/server'
import { query }          from '@/lib/db'
import { getSession }     from '@/lib/auth'

/**
 * GET /api/inventory?characterId=<id>
 * Returns all inventory slots + joined item details for a character.
 */
export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = parseInt(searchParams.get('characterId') ?? '0', 10)
  if (!characterId) return NextResponse.json({ success: false, message: 'characterId required' }, { status: 400 })

  // Verify ownership
  const owned = await query<{ id: number }>(
    'SELECT id FROM character_data WHERE id = ? AND user_id = ? LIMIT 1',
    [characterId, session.userId],
  )
  if (!owned.length) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  const slots = await query<Record<string, unknown>>(
    `SELECT
       inv.id, inv.user_id AS userId, inv.character_id AS characterId,
       inv.item_id AS itemId, inv.quantity, inv.slot_index AS slotIndex, inv.equipped,
       it.name, it.description, it.type, it.rarity, it.icon,
       it.stat_hp AS statHp, it.stat_mp AS statMp,
       it.stat_attack AS statAttack, it.stat_defense AS statDefense,
       it.stat_speed AS statSpeed, it.value
     FROM inventory inv
     JOIN items it ON it.id = inv.item_id
     WHERE inv.character_id = ?
     ORDER BY inv.slot_index ASC`,
    [characterId],
  )

  // Shape into nested item object
  const result = slots.map(s => ({
    id:          s.id,
    userId:      s.userId,
    characterId: s.characterId,
    itemId:      s.itemId,
    quantity:    s.quantity,
    slotIndex:   s.slotIndex,
    equipped:    Boolean(s.equipped),
    item: {
      id:          s.itemId,
      name:        s.name,
      description: s.description,
      type:        s.type,
      rarity:      s.rarity,
      icon:        s.icon,
      value:       s.value,
      stats: {
        ...(s.statHp      ? { hp:      s.statHp      } : {}),
        ...(s.statMp      ? { mp:      s.statMp      } : {}),
        ...(s.statAttack  ? { attack:  s.statAttack  } : {}),
        ...(s.statDefense ? { defense: s.statDefense } : {}),
        ...(s.statSpeed   ? { speed:   s.statSpeed   } : {}),
      },
    },
  }))

  return NextResponse.json({ success: true, message: 'OK', data: result })
}

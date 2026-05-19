import { NextResponse }  from 'next/server'
import { query, execute } from '@/lib/db'
import { getSession }     from '@/lib/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/inventory/[id]
 * Toggle equipped state of an inventory slot.
 * Body: { equipped: boolean }
 */
export async function PATCH(request: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const slotId = parseInt(id, 10)
  if (isNaN(slotId)) return NextResponse.json({ success: false, message: 'Invalid slot ID' }, { status: 400 })

  let body: { equipped?: boolean }
  try { body = await request.json() } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.equipped !== 'boolean') {
    return NextResponse.json({ success: false, message: '"equipped" boolean required' }, { status: 400 })
  }

  // Verify the slot belongs to this user
  const owned = await query<{ id: number }>(
    'SELECT inv.id FROM inventory inv JOIN character_data cd ON cd.id = inv.character_id WHERE inv.id = ? AND cd.user_id = ? LIMIT 1',
    [slotId, session.userId],
  )
  if (!owned.length) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  await execute('UPDATE inventory SET equipped = ? WHERE id = ?', [body.equipped ? 1 : 0, slotId])

  return NextResponse.json({ success: true, message: 'Updated' })
}

/**
 * DELETE /api/inventory/[id]
 * Remove an item from the inventory.
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getSession()
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const slotId = parseInt(id, 10)
  if (isNaN(slotId)) return NextResponse.json({ success: false, message: 'Invalid slot ID' }, { status: 400 })

  const owned = await query<{ id: number }>(
    'SELECT inv.id FROM inventory inv JOIN character_data cd ON cd.id = inv.character_id WHERE inv.id = ? AND cd.user_id = ? LIMIT 1',
    [slotId, session.userId],
  )
  if (!owned.length) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 })

  await execute('DELETE FROM inventory WHERE id = ?', [slotId])
  return NextResponse.json({ success: true, message: 'Item removed' })
}

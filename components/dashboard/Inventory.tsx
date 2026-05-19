'use client'
/**
 * components/dashboard/Inventory.tsx
 * Grid-based inventory with equip/unequip support.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Sword, Shield, Beaker, Gem, Zap, CircleHelp } from 'lucide-react'
import Card   from '@/components/ui/Card'
import Badge  from '@/components/ui/Badge'
import Modal  from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import type { InventorySlot, ItemType } from '@/types/game'
import { capitalize } from '@/lib/utils'

const TOTAL_SLOTS = 24

const typeIcons: Record<ItemType, typeof Sword> = {
  weapon:     Sword,
  armor:      Shield,
  consumable: Beaker,
  accessory:  Gem,
  quest:      Package,
}

const itemIcons: Record<string, typeof Sword> = {
  package: Package,
  sword:   Sword,
  shield:  Shield,
  beaker:  Beaker,
  gem:     Gem,
  zap:     Zap,
}

interface InventoryProps {
  slots:        InventorySlot[]
  onToggleEquip: (slotId: number, equipped: boolean) => void
  loading?:     boolean
}

export default function Inventory({ slots, onToggleEquip, loading = false }: InventoryProps) {
  const [selected, setSelected] = useState<InventorySlot | null>(null)

  // Build a lookup by slotIndex for O(1) access
  const slotMap = new Map(slots.map(s => [s.slotIndex, s]))

  return (
    <>
      <Card className="space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-[#041008] font-game">
            <Package className="w-5 h-5 text-[#238b45]" />
            Inventory
          </h3>
          <span className="text-xs font-medium text-[#041008]/55">{slots.length} / {TOTAL_SLOTS} slots filled</span>
        </div>

        {slots.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-[#74c476]/20 bg-[#f7fcf5] px-4 py-3 text-sm text-[#041008]/70">
            Inventory is empty. Items you collect will appear here.
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-primary-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: TOTAL_SLOTS }).map((_, idx) => {
              const slot = slotMap.get(idx)
              const Icon = slot?.item ? itemIcons[slot.item.icon] ?? typeIcons[slot.item.type] ?? CircleHelp : null

              return (
                <motion.button
                  key={idx}
                  whileHover={slot ? { scale: 1.08 } : {}}
                  whileTap={slot  ? { scale: 0.95 } : {}}
                  onClick={() => slot && setSelected(slot)}
                  className={[
                    'aspect-square rounded-lg border flex items-center justify-center relative',
                    'min-h-[3.75rem] sm:min-h-0',
                    'transition-colors duration-200',
                    slot
                      ? 'bg-primary-800/80 border-primary-200/20 hover:border-primary-300/40 cursor-pointer'
                      : 'bg-primary-900/30 border-primary-200/10 cursor-default',
                    slot?.equipped ? 'ring-1 ring-primary-300/60' : '',
                  ].join(' ')}
                  aria-label={slot?.item?.name ?? `Empty slot ${idx}`}
                >
                  {slot?.item && Icon && (
                    <>
                      <Icon className={`w-5 h-5 ${
                        slot.item.rarity === 'legendary' ? 'text-primary-100' :
                        slot.item.rarity === 'epic'      ? 'text-primary-200' :
                        slot.item.rarity === 'rare'      ? 'text-primary-300' :
                        'text-primary-100/65'
                      }`} />
                      {slot.quantity > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[9px] text-[#041008] font-bold">
                          {slot.quantity}
                        </span>
                      )}
                      {slot.equipped && (
                        <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary-300" />
                      )}
                    </>
                  )}

                  {!slot && (
                    <span className="absolute inset-x-0 bottom-1 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-[#041008]/30">
                      Empty
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </Card>

      {/* Item detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.item?.name ?? 'Item'}
      >
        {selected?.item && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              {(() => {
                const Icon = typeIcons[selected.item.type]
                return <Icon className="w-10 h-10 text-primary-300 mt-1 shrink-0" />
              })()}
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[#041008] font-semibold">{selected.item.name}</h4>
                  <Badge variant={selected.item.rarity}>{capitalize(selected.item.rarity)}</Badge>
                </div>
                <p className="text-sm text-[#041008]/65 mt-1">{selected.item.description}</p>
              </div>
            </div>

            {/* Stat bonuses */}
            {Object.entries(selected.item.stats).length > 0 && (
              <div className="bg-[#f7fcf5] border border-[#74c476]/15 rounded-xl p-3 space-y-1">
                {Object.entries(selected.item.stats).map(([stat, val]) => (
                  <div key={stat} className="flex justify-between text-sm">
                    <span className="text-[#041008]/65 capitalize">{stat}</span>
                    <span className="text-[#238b45] font-semibold">+{val}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant={selected.equipped ? 'secondary' : 'primary'}
                className="flex-1"
                onClick={() => {
                  onToggleEquip(selected.id, selected.equipped)
                  setSelected(null)
                }}
              >
                {selected.equipped ? 'Unequip' : 'Equip'}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

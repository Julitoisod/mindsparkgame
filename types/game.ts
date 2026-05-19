// ─── Game / Progress / Inventory Types ───────────────────────────────────────

export interface GameProgress {
  id: number
  userId: number
  characterId: number
  currentZone: string
  questFlags: Record<string, unknown>
  completedLevels: number[]
  playtimeSeconds: number
  lastSaved: string
  created_at: string
  updated_at: string
}

export type ItemType = 'weapon' | 'armor' | 'consumable' | 'accessory' | 'quest'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface Item {
  id: number
  name: string
  description: string
  type: ItemType
  rarity: ItemRarity
  icon: string
  stats: Partial<{
    hp: number
    mp: number
    attack: number
    defense: number
    speed: number
  }>
  value: number
}

export interface InventorySlot {
  id: number
  userId: number
  characterId: number
  itemId: number
  quantity: number
  slotIndex: number
  equipped: boolean
  item?: Item
}

export interface SavePayload {
  characterId: number
  positionX: number
  positionY: number
  positionZ: number
  stats: import('./character').CharacterStats
  currentZone: string
  questFlags: Record<string, unknown>
  completedLevels: number[]
  playtimeSeconds: number
  starsEarned?: number
  levelStars?: Record<string, number>
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type SpriteAction = 'idle' | 'attack' | 'hurt' | 'defeat'

export type SpriteFrameSet = {
  idle: readonly string[]
  attack: readonly string[]
  hurt: readonly string[]
  defeat: readonly string[]
}

function paddedFrame(index: number): string {
  return index.toString().padStart(3, '0')
}

function frameSequence(directory: string, prefix: string, count: number): readonly string[] {
  return Array.from({ length: count }, (_, index) => `${directory}/${prefix}${paddedFrame(index)}.png`)
}

const knightOne = '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR'
const fairyOne = '/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1'
const elfOne = '/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1'

const golemOne = '/AVATAR CHARACTERS/BOSS CHARACTER 5/FOREST GOLEM (LEVEL 1)/Golem_1/PNG/PNG Sequences'
const minotaurOne = '/AVATAR CHARACTERS/BOSS CHARACTER 5/Minotaur_1 (LEVEL 2)/PNG/PNG Sequences'
const wraithThree =
  '/AVATAR CHARACTERS/BOSS CHARACTER 5/WRAIGHT_3 (LEVEL 3)/PNG/Wraith_03 LEVEL 3/PNG Sequences'
const fallenAngelsThree = '/AVATAR CHARACTERS/BOSS CHARACTER 5/Fallen_Angels_3 (LEVEL 4)/PNG/PNG Sequences'
const darkOracleThree = '/AVATAR CHARACTERS/BOSS CHARACTER 5/Dark_Oracle_3 (LEVEL 5)/PNG/PNG Sequences'

function avatarFrames(directory: string, prefix: string): SpriteFrameSet {
  return {
    idle: frameSequence(directory, `${prefix}__IDLE_`, 10),
    attack: frameSequence(directory, `${prefix}__ATTACK_`, 10),
    hurt: frameSequence(directory, `${prefix}__HURT_`, 10),
    defeat: frameSequence(directory, `${prefix}__DIE_`, 10),
  }
}

function bossFrames(directory: string, prefix: string): SpriteFrameSet {
  return {
    idle: frameSequence(`${directory}/Idle`, `0_${prefix}_Idle_`, 18),
    attack: frameSequence(`${directory}/Slashing`, `0_${prefix}_Slashing_`, 12),
    hurt: frameSequence(`${directory}/Hurt`, `0_${prefix}_Hurt_`, 12),
    defeat: frameSequence(`${directory}/Dying`, `0_${prefix}_Dying_`, 15),
  }
}

const knightFrames = avatarFrames(knightOne, 'Knight_01')
const fairyFrames = avatarFrames(fairyOne, 'Fairy_01')
const elfFrames = avatarFrames(elfOne, 'Elf_01')

export const heroSpriteAnimations = [
  knightFrames,
  fairyFrames,
  elfFrames,
  knightFrames,
  fairyFrames,
] as const satisfies readonly SpriteFrameSet[]

export const heroSpriteAnimationsByClass = {
  warrior: knightFrames,
  mage: fairyFrames,
  rogue: elfFrames,
  archer: elfFrames,
} as const satisfies Record<string, SpriteFrameSet>

export const heroSpriteImageByClass = {
  warrior:
    '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png',
  mage: '/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1/Fairy_01__IDLE_000.png',
  rogue: '/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1/Elf_01__IDLE_000.png',
  archer: '/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1/Elf_01__IDLE_000.png',
} as const satisfies Record<string, string>

export const bossSpriteAnimations = [
  bossFrames(golemOne, 'Golem'),
  bossFrames(minotaurOne, 'Minotaur'),
  {
    idle: frameSequence(`${wraithThree}/Idle`, 'Wraith_03_Idle_', 12),
    attack: frameSequence(`${wraithThree}/Attacking`, 'Wraith_03_Attack_', 12),
    hurt: frameSequence(`${wraithThree}/Hurt`, 'Wraith_03_Hurt_', 12),
    defeat: frameSequence(`${wraithThree}/Dying`, 'Wraith_03_Dying_', 15),
  },
  bossFrames(fallenAngelsThree, 'Fallen_Angels'),
  bossFrames(darkOracleThree, 'Dark_Oracle'),
] as const satisfies readonly SpriteFrameSet[]

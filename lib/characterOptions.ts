import type { CharacterClass, CharacterStats } from '@/types/character'

export type CharacterOption = {
  class: CharacterClass
  label: string
  imagePath: string
  description: string
  unlockCost: number
  stats: CharacterStats
}

export const characterOptions = [
  {
    class: 'warrior',
    label: 'Knight',
    imagePath:
      '/AVATAR CHARACTERS/3 AVATAR/2D-KNIGHT BOY CHARACTER/_PNG/1_KNIGHT_ AVATAR/Knight_01__IDLE_000.png',
    description: 'Balanced defense and steady attacks for careful learners.',
    unlockCost: 10,
    stats: {
      hp: 110,
      maxHp: 110,
      mp: 45,
      maxMp: 45,
      attack: 12,
      defense: 8,
      speed: 5,
      level: 1,
      experience: 0,
      experienceToNext: 100,
    },
  },
  {
    class: 'mage',
    label: 'Fairy',
    imagePath:
      '/AVATAR CHARACTERS/3 AVATAR/2D-FAIRY CHARACTER/_PNG/FAIRY AVATAR 1/Fairy_01__IDLE_000.png',
    description: 'High magic energy with quick quiz momentum.',
    unlockCost: 10,
    stats: {
      hp: 90,
      maxHp: 90,
      mp: 75,
      maxMp: 75,
      attack: 11,
      defense: 5,
      speed: 7,
      level: 1,
      experience: 0,
      experienceToNext: 100,
    },
  },
  {
    class: 'archer',
    label: 'Elf',
    imagePath: '/AVATAR CHARACTERS/3 AVATAR/2D-ELF CHARACTER/_PNG/ELF AVATAR 1/Elf_01__IDLE_000.png',
    description: 'Fast and precise, built for quick answer streaks.',
    unlockCost: 10,
    stats: {
      hp: 95,
      maxHp: 95,
      mp: 55,
      maxMp: 55,
      attack: 13,
      defense: 5,
      speed: 9,
      level: 1,
      experience: 0,
      experienceToNext: 100,
    },
  },
] as const satisfies readonly CharacterOption[]

export function getCharacterOption(characterClass: CharacterClass): CharacterOption {
  return characterOptions.find(option => option.class === characterClass) ?? characterOptions[0]
}

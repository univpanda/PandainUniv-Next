// Avatar Registry - explicitly imports all available avatars for Next.js compatibility
// Replaces Vite's import.meta.glob with explicit imports

// Import all kawaii avatars
import chefKawaii from '../assets/webp/kawaii/chef.webp'
import coffeeholicKawaii from '../assets/webp/kawaii/coffeeholic.webp'
import doctorKawaii from '../assets/webp/kawaii/doctor.webp'
import gamerKawaii from '../assets/webp/kawaii/gamer.webp'

// Import all cartoon avatars
import artistCartoon from '../assets/webp/cartoon/artist.webp'
import astronautCartoon from '../assets/webp/cartoon/astronaut.webp'
import cozyCartoon from '../assets/webp/cartoon/cozy.webp'
import cyborgCartoon from '../assets/webp/cartoon/cyborg.webp'
import detectiveCartoon from '../assets/webp/cartoon/detective.webp'
import dreamerCartoon from '../assets/webp/cartoon/dreamer.webp'
import explorerCartoon from '../assets/webp/cartoon/explorer.webp'
import gamerCartoon from '../assets/webp/cartoon/gamer.webp'
import hackerCartoon from '../assets/webp/cartoon/hacker.webp'
import joyfulCartoon from '../assets/webp/cartoon/joyful.webp'
import kingCartoon from '../assets/webp/cartoon/king.webp'
import loverCartoon from '../assets/webp/cartoon/lover.webp'
import musicianCartoon from '../assets/webp/cartoon/musician.webp'
import ninjaCartoon from '../assets/webp/cartoon/ninja.webp'
import pirateCartoon from '../assets/webp/cartoon/pirate.webp'
import scientistCartoon from '../assets/webp/cartoon/scientist.webp'
import starryCartoon from '../assets/webp/cartoon/starry.webp'
import surprisedCartoon from '../assets/webp/cartoon/surprised.webp'
import vampireCartoon from '../assets/webp/cartoon/vampire.webp'
import wizardCartoon from '../assets/webp/cartoon/wizard.webp'

// Avatar entry interface
interface AvatarEntry {
  name: string // e.g., 'Chef', 'Gamer'
  style: 'kawaii' | 'cartoon'
  path: string // e.g., 'kawaii/chef'
  url: string // actual import URL for display
}

// Build registry of available avatars
const buildRegistry = (): AvatarEntry[] => {
  const registry: AvatarEntry[] = []

  // Add kawaii avatars
  const kawaiiAvatars = [
    { name: 'Chef', import: chefKawaii },
    { name: 'Coffeeholic', import: coffeeholicKawaii },
    { name: 'Doctor', import: doctorKawaii },
    { name: 'Gamer', import: gamerKawaii },
  ]

  for (const avatar of kawaiiAvatars) {
    registry.push({
      name: avatar.name,
      style: 'kawaii',
      path: `kawaii/${avatar.name.toLowerCase()}`,
      url: avatar.import.src || avatar.import,
    })
  }

  // Add cartoon avatars
  const cartoonAvatars = [
    { name: 'Artist', import: artistCartoon },
    { name: 'Astronaut', import: astronautCartoon },
    { name: 'Cozy', import: cozyCartoon },
    { name: 'Cyborg', import: cyborgCartoon },
    { name: 'Detective', import: detectiveCartoon },
    { name: 'Dreamer', import: dreamerCartoon },
    { name: 'Explorer', import: explorerCartoon },
    { name: 'Gamer', import: gamerCartoon },
    { name: 'Hacker', import: hackerCartoon },
    { name: 'Joyful', import: joyfulCartoon },
    { name: 'King', import: kingCartoon },
    { name: 'Lover', import: loverCartoon },
    { name: 'Musician', import: musicianCartoon },
    { name: 'Ninja', import: ninjaCartoon },
    { name: 'Pirate', import: pirateCartoon },
    { name: 'Scientist', import: scientistCartoon },
    { name: 'Starry', import: starryCartoon },
    { name: 'Surprised', import: surprisedCartoon },
    { name: 'Vampire', import: vampireCartoon },
    { name: 'Wizard', import: wizardCartoon },
  ]

  for (const avatar of cartoonAvatars) {
    registry.push({
      name: avatar.name,
      style: 'cartoon',
      path: `cartoon/${avatar.name.toLowerCase()}`,
      url: avatar.import.src || avatar.import,
    })
  }

  return registry
}

// Export the registry
export const avatarRegistry = buildRegistry()

// Get all unique avatar names (for username generation)
export const getAvatarNames = (): string[] => {
  const names = new Set(avatarRegistry.map((a) => a.name))
  return Array.from(names)
}

// Pick a random avatar (returns name, path, and url)
export const pickRandomAvatar = (): AvatarEntry => {
  const index = Math.floor(Math.random() * avatarRegistry.length)
  return avatarRegistry[index]
}

// Generate a random 4-digit number (0000-9999)
const generateRandomDigits = (): string => {
  return Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
}

// Generate username from avatar name + 4 digits
// e.g., 'Chef' -> 'Chef3847'
export const generateUsername = (avatarName: string): string => {
  return `${avatarName}${generateRandomDigits()}`
}

// Generate a complete new user identity (username + avatar)
export interface NewUserIdentity {
  username: string
  avatarPath: string
  avatarUrl: string
}

export const generateNewUserIdentity = (): NewUserIdentity => {
  const avatar = pickRandomAvatar()
  return {
    username: generateUsername(avatar.name),
    avatarPath: avatar.path,
    avatarUrl: avatar.url,
  }
}

// Get avatar URL by path (for displaying user avatars)
// e.g., 'kawaii/chef' -> actual URL
export const getAvatarByPath = (path: string | null): string | null => {
  if (!path) return null
  const entry = avatarRegistry.find((a) => a.path === path)
  return entry?.url || null
}

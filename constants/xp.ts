export const XP_REWARDS = {
  SCAN_PRODUCT: 10,
  LOG_TO_JOURNAL: 5,
  HEALTHY_CHOICE: 15, // score >= 75
  UNLOCK_BADGE: 50,
  STREAK_DAY: 20,
  COMPLETE_QUIZ: 100,
} as const;

export const LEVEL_NAMES = {
  1: { name: 'Beginner', emoji: '🥚' },
  2: { name: 'Starter', emoji: '🌱' },
  3: { name: 'Explorer', emoji: '🔍' },
  4: { name: 'Learner', emoji: '📚' },
  5: { name: 'Label Learner', emoji: '🌱' },
  6: { name: 'Aware', emoji: '👁️' },
  7: { name: 'Conscious', emoji: '🧠' },
  8: { name: 'Smart Shopper', emoji: '🛒' },
  9: { name: 'Nutrition Ninja', emoji: '🥷' },
  10: { name: 'Health Hacker', emoji: '⚡' },
  15: { name: 'Wellness Warrior', emoji: '⚔️' },
  20: { name: 'Nutrition Master', emoji: '🏆' },
  25: { name: 'Health Guru', emoji: '🧘' },
  30: { name: 'Wellness Legend', emoji: '👑' },
} as const;

// Calculate XP needed for a specific level
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 100;
  if (level === 3) return 250;
  if (level === 4) return 500;
  if (level === 5) return 1000;
  
  // After level 5: XP needed = 500 × (level - 1)
  return 500 * (level - 1);
}

// Calculate current level from XP
export function getLevelFromXP(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 250) return 2;
  if (xp < 500) return 3;
  if (xp < 1000) return 4;
  if (xp < 1500) return 5;
  
  // For levels 6+, solve: xp = 500 * (level - 1)
  return Math.floor(xp / 500) + 1;
}

// Get XP progress for current level
export function getXPProgress(xp: number): { currentLevelXP: number; nextLevelXP: number; progress: number } {
  const currentLevel = getLevelFromXP(xp);
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const progress = nextLevelXP > currentLevelXP ? (xp - currentLevelXP) / (nextLevelXP - currentLevelXP) : 1;
  
  return {
    currentLevelXP,
    nextLevelXP,
    progress: Math.min(progress, 1),
  };
}

// Get level info with name and emoji
export function getLevelInfo(level: number): { name: string; emoji: string } {
  // Find the highest level that's <= current level
  const levelKeys = Object.keys(LEVEL_NAMES).map(Number).sort((a, b) => b - a);
  const matchingLevel = levelKeys.find(key => level >= key) || 1;
  
  return LEVEL_NAMES[matchingLevel as keyof typeof LEVEL_NAMES] || LEVEL_NAMES[1];
}
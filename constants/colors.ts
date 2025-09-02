export const Colors = {
  // Light theme colors
  light: {
    // Primary colors - Bright Retro Red
    primary: '#FF0040', // Bright retro red
    primaryLight: '#FF4070',
    primaryDark: '#CC0033',
    
    // Core theme colors - Bright Retro Red and White
    retroRed: '#FF0040', // Bright retro red
    white: '#FFFFFF', // Pure white
    
    // Background colors using white
    background: '#FFFFFF', // White as main background
    backgroundSecondary: '#FFFFFF', // White as secondary
    backgroundTertiary: '#F8F8F8', // Very light gray
    
    // Surface colors
    surface: '#FFFFFF', // White
    surfaceSecondary: '#FFFFFF', // White
    surfaceTertiary: '#F8F8F8', // Very light gray
    
    // Text colors
    textPrimary: '#000000', // Black for readability
    textSecondary: '#333333',
    textTertiary: '#666666',
    textLight: '#FFFFFF', // White text
    textDark: '#000000',
  },
  
  // Dark theme colors
  dark: {
    // Primary colors - Bright Retro Red
    primary: '#FF0040', // Bright retro red
    primaryLight: '#FF4070',
    primaryDark: '#CC0033',
    
    // Core theme colors - Bright Retro Red and Charcoal
    retroRed: '#FF0040', // Bright retro red
    white: '#FFFFFF', // Pure white (for text and accents)
    
    // Background colors using charcoal
    background: '#2C2C2C', // Charcoal as main background
    backgroundSecondary: '#2C2C2C', // Charcoal as secondary
    backgroundTertiary: '#3A3A3A', // Lighter charcoal
    
    // Surface colors
    surface: '#363636', // Dark charcoal for cards
    surfaceSecondary: '#363636', // Dark charcoal
    surfaceTertiary: '#3A3A3A', // Lighter charcoal
    
    // Text colors
    textPrimary: '#FFFFFF', // White for primary text
    textSecondary: '#CCCCCC', // Light gray for secondary text
    textTertiary: '#999999', // Medium gray for tertiary text
    textLight: '#FFFFFF', // White text
    textDark: '#000000', // Black text (for use on light surfaces)
  },
  
  // Shared colors (theme-independent)
  // Score colors based on personalized score ranges
  scoreExcellent: '#00FF00', // Bright green for excellent (86-100)
  scoreGood: '#34C759',      // Green for good (66-85)
  scoreMediocre: '#FFD60A',  // Yellow for mediocre (41-65)
  scorePoor: '#FF3B30',      // Red for poor (40 and below)
  
  // Accent colors
  success: '#228B22', // Forest green
  warning: '#FF8C00', // Dark orange
  error: '#DC143C', // Retro red
  info: '#4682B4', // Steel blue
  
  // Retro Tech Pop Color Hierarchy
  // Primary Palette
  retroNeonTurquoise: '#4ECDC4', // Primary CTA buttons, progress highlights, active states
  retroPink: '#FF6B81', // Headline accents, gradient bars, section titles
  retroDeepIndigo: '#2E294E', // Background accents, card outlines, dividers
  retroCreamWhite: '#FDFDFD', // Main background, keeps the UI breathable
  
  // Neutral Anchors
  retroCharcoalBlack: '#1E1E1E', // Headline serif text
  retroSlateGray: '#5F5F5F', // Body sans-serif text
  retroSoftGray: '#D9D9D9', // Card shadows, inactive states
  
  // Legacy Faded Pastels (keeping for backward compatibility)
  retroOffWhite: '#F6F5F2', // Soft off-white background
  retroDustyRose: '#D8A7B1', // Dusty Rose
  retroMutedLilac: '#B8A1D9', // Muted Lilac
  retroSoftMint: '#A8DADC', // Soft Mint
  retroFadedPink: '#E8C5C5', // Faded pink accent
  retroWarmCream: '#F9F6F1', // Warm cream
  retroSoftLavender: '#D4C5E8', // Soft lavender
  retroPaleGold: '#F4E6B7', // Pale gold
  
  // Status colors based on personalized score ranges
  gradeExcellent: '#00FF00', // Bright green for excellent (86-100)
  gradeGood: '#34C759',      // Green for good (66-85)
  gradeMediocre: '#FFD60A',  // Yellow for mediocre (41-65)
  gradePoor: '#FF3B30',      // Red for poor (40 and below)
  
  // Legacy aliases for backward compatibility (light theme)
  primary: '#FF0040', // Bright retro red
  primaryLight: '#FF4070',
  primaryDark: '#CC0033',
  retroRed: '#FF0040', // Bright retro red
  offWhite: '#FFFFFF', // Pure white
  ivory: '#FFFFFF', // Pure white
  background: '#FFFFFF', // White as main background
  backgroundSecondary: '#FFFFFF', // White as secondary
  backgroundTertiary: '#F8F8F8', // Very light gray
  surface: '#FFFFFF', // White
  surfaceSecondary: '#FFFFFF', // White
  surfaceTertiary: '#F8F8F8', // Very light gray
  textPrimary: '#000000', // Black for readability
  textSecondary: '#333333',
  textTertiary: '#666666',
  textLight: '#FFFFFF', // White text
  textDark: '#000000',
  white: '#FFFFFF', // Pure white
  black: '#000000', // Pure black
  gray50: '#F8F8F8', // Very light gray
  gray100: '#F0F0F0',
  gray200: '#E0E0E0',
  gray300: '#D0D0D0',
  gray400: '#A3A3A3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  gray900: '#171717',
  border: '#E5E5E5', // Light gray border
  borderLight: '#F0F0F0', // Very light gray border
  borderRetro: '#FF0040', // Bright retro red border for accents
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
  lightBackground: '#FFFFFF', // White background
  lightSurface: '#FFFFFF',
  lightSurfaceSecondary: '#FFFFFF',
} as const;

// Cached color objects for performance
const lightColorsCache = {
  ...Colors.light,
  // Shared colors that don't change between themes
  scoreExcellent: Colors.scoreExcellent,
  scoreGood: Colors.scoreGood,
  scoreMediocre: Colors.scoreMediocre,
  scorePoor: Colors.scorePoor,
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  gradeExcellent: Colors.gradeExcellent,
  gradeGood: Colors.gradeGood,
  gradeMediocre: Colors.gradeMediocre,
  gradePoor: Colors.gradePoor,
};

const darkColorsCache = {
  ...Colors.dark,
  // Shared colors that don't change between themes
  scoreExcellent: Colors.scoreExcellent,
  scoreGood: Colors.scoreGood,
  scoreMediocre: Colors.scoreMediocre,
  scorePoor: Colors.scorePoor,
  success: Colors.success,
  warning: Colors.warning,
  error: Colors.error,
  info: Colors.info,
  gradeExcellent: Colors.gradeExcellent,
  gradeGood: Colors.gradeGood,
  gradeMediocre: Colors.gradeMediocre,
  gradePoor: Colors.gradePoor,
};

// Helper function to get theme-specific colors
export const getThemeColors = (isDarkMode: boolean) => {
  return isDarkMode ? Colors.dark : Colors.light;
};

// Optimized helper function to get current theme colors with caching
export const getCurrentColors = (isDarkMode: boolean) => {
  return isDarkMode ? darkColorsCache : lightColorsCache;
};
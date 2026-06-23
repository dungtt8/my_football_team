/**
 * Design System Constants - Color Palette, Typography, Spacing
 * Based on Phase 2 Frontend Design Spec
 */

// Colors - Modern Premium Palette (Contemporary + Luxury)
export const COLORS = {
  // Primary (Modern: deeper, more dramatic, premium-feeling)
  cream: '#FFFCF9',           // Off-white, ultra-warm (background)
  creamLight: '#FFFEF9',      // Lighter cream for layers
  slate: '#0F0E0C',           // Ultra-dark charcoal (text, headings) - deeper than old espresso
  slateDark: '#1A1815',       // Very dark slate for secondary text
  sage: '#7FA89F',            // Contemporary sage (primary accent) - more saturated
  sageDark: '#6A9289',        // Deep sage for hover states
  forest: '#3D5A50',          // New: Deep forest green for CTAs (modern, striking)
  stone: '#9F9A93',           // Modern stone (secondary accents)
  white: '#FFFFFF',           // Pure white (limited use)

  // Legacy names (mapped to new palette for backwards compatibility)
  black: '#0F0E0C',           // Alias: slate (darker)
  charcoal: '#1A1815',        // Alias: slateDark
  gray: '#7FA89F',            // Alias: sage (contemporary)
  lightGray: '#9F9A93',       // Alias: stone
  bone: '#FFFCF9',            // Alias: cream

  // Status Colors (vibrant, contemporary palette)
  successGreen: '#44A366',    // Vibrant success (modern)
  errorRed: '#D64545',        // Contemporary red (warmer, brighter)
  warningYellow: '#E8B34B',   // Modern warm gold
  infoBlue: '#5B9BD5',        // Contemporary blue

  // Pale/background variants (muted, soft)
  paleRed: '#F5DEDE',         // Pale error background
  paleGreen: '#D8E8DC',       // Pale success background
  paleYellow: '#F0E6CC',      // Pale warning background
  paleBlue: '#DCE8F5',        // Pale info background
} as const

// Typography - Premium, Editorial Luxury
export const TYPOGRAPHY = {
  fonts: {
    serif: 'Instrument Serif',
    display: 'Clash Display, Instrument Serif, sans-serif', // Bold modern display
    sans: 'Geist Sans',
    mono: 'Geist Mono',
  },
  sizes: {
    // Eyebrow/label
    eyebrow: '10px',
    caption: '12px',
    small: '14px',
    button: '14px',
    
    // Body text
    body: '16px',
    bodySm: '15px',
    
    // Headings
    heading3: '18px',
    heading2: '24px',
    heading1: '32px',
    
    // Display/Hero
    sectionTitle: '28px',
    hero: '40px',
    heroLarge: '56px',
  },
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: '1.1',
    normal: '1.6',
    loose: '1.9',
  },
  letterSpacing: {
    tight: '-0.02em',
    normal: '0',
    wide: '0.08em',
  },
} as const

// Spacing Scale - Generous, Airy (Soft Structuralism)
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xl2: '32px',
  xl3: '48px',
  xl4: '64px',    // Massive whitespace sections
  xl5: '80px',    // Hero sections
} as const

// Shadows - Modern ambient, deeper depth perception
export const SHADOWS = {
  none: 'none',
  subtle: '0 2px 6px rgba(15, 14, 12, 0.06)',
  soft: '0 6px 16px rgba(15, 14, 12, 0.10)',
  medium: '0 12px 32px rgba(15, 14, 12, 0.14)',
  deep: '0 20px 48px rgba(15, 14, 12, 0.18)',    // New: deeper shadow for elevated elements
  glow: '0 0 40px rgba(127, 168, 159, 0.20)',    // Enhanced sage glow
  insetLight: 'inset 0 1px 2px rgba(255, 255, 255, 0.25)',
  insetDark: 'inset 0 1px 2px rgba(15, 14, 12, 0.10)',
} as const

// Blur values for backdrop effects
export const BLUR = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  xl2: '24px',    // Heavy blur for glass effects
} as const

// Border Radius - Premium Squircle-like curves
export const BORDER_RADIUS = {
  sm: '6px',
  md: '10px',
  lg: '16px',
  xl: '24px',
  xl2: '32px',      // Large squircle
  pill: '9999px',
  
  // Aliases for older code
  button: '24px',   // Changed: premium rounded pills
  card: '20px',     // Changed: larger, squircle-like
} as const

// Status Badge Variants - Editorial Luxury colors
export const BADGE_VARIANTS = {
  approved: {
    bg: COLORS.paleGreen,       // #D9E8DE
    text: '#5B7D62',             // Muted dark green
    accent: COLORS.successGreen, // #6B9B7F
  },
  pending: {
    bg: COLORS.paleYellow,       // #E8DCC9
    text: '#8B6F47',             // Muted brown
    accent: COLORS.warningYellow, // #D4A574
  },
  rejected: {
    bg: COLORS.paleRed,          // #EDD8D4
    text: '#A25248',             // Muted dark red
    accent: COLORS.errorRed,     // #C85A54
  },
  info: {
    bg: COLORS.paleBlue,         // #DCE8F5
    text: '#5B7A9E',             // Muted dark blue
    accent: COLORS.infoBlue,     // #5B9BD5
  },
  draft: {
    bg: COLORS.stone,            // #9F9A93
    text: COLORS.white,          // #FFFFFF
    accent: COLORS.slate,        // #0F0E0C
  },
} as const

// Tab Navigation
export const TAB_CONFIG = {
  items: [
    { id: 'finance', label: 'Finance', icon: '🏦', path: '/app/finance' },
    { id: 'campaigns', label: 'Campaigns', icon: '📢', path: '/app/campaigns' },
    { id: 'attendance', label: 'Attendance', icon: '📊', path: '/app/attendance' },
    { id: 'menu', label: 'Menu', icon: '⚙️', path: '/app/menu' },
  ],
} as const

// App Shortcuts (PWA)
export const APP_SHORTCUTS = [
  {
    name: 'Check In',
    short_name: 'Check In',
    url: '/app/attendance?action=checkin',
    icons: [{ src: '/shortcuts/checkin-192.png', sizes: '192x192' }],
  },
  {
    name: 'Submit Expense',
    short_name: 'Submit Expense',
    url: '/app/finance?action=submit',
    icons: [{ src: '/shortcuts/expense-192.png', sizes: '192x192' }],
  },
  {
    name: 'View Leaderboard',
    short_name: 'Leaderboard',
    url: '/app/attendance?action=leaderboard',
    icons: [{ src: '/shortcuts/leaderboard-192.png', sizes: '192x192' }],
  },
  {
    name: 'New Campaign',
    short_name: 'Campaign',
    url: '/app/campaigns?action=create',
    icons: [{ src: '/shortcuts/campaign-192.png', sizes: '192x192' }],
  },
] as const

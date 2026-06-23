/**
 * Design System Constants - Color Palette, Typography, Spacing
 * Based on Phase 2 Frontend Design Spec
 */

// Colors - Editorial Luxury Palette
export const COLORS = {
  // Primary (Editorial Luxury: warm, refined, expensive-feeling)
  cream: '#FDFBF7',           // Off-white, warm
  creamLight: '#FFFBF7',      // Lighter cream for subtle backgrounds
  sage: '#9BA8A3',             // Muted sage green (accents)
  sageDark: '#7A8681',        // Deeper sage for hover
  espresso: '#1F1F1F',         // Deep brown-black (text, headings)
  espressoLight: '#3D3D3D',   // Lighter espresso for secondary
  tan: '#D4C5B9',              // Warm tan/beige (subtle accents)
  taupe: '#B8AFA3',            // Muted taupe (tertiary)
  white: '#FFFFFF',            // Pure white (limited use)

  // Legacy names (mapped to new palette for backwards compatibility)
  black: '#1F1F1F',            // Alias: espresso
  charcoal: '#3D3D3D',         // Alias: espressoLight
  gray: '#9BA8A3',             // Alias: sage
  lightGray: '#B8AFA3',        // Alias: taupe
  bone: '#FDFBF7',             // Alias: cream

  // Status Colors (refined, muted palette)
  successGreen: '#6B9B7F',    // Muted success
  errorRed: '#C85A54',         // Muted error
  warningYellow: '#D4A574',    // Muted warning
  infoBluee: '#7A9DBE',        // Muted info

  // Pale/background variants
  paleRed: '#EDD8D4',          // Pale error background
  paleGreen: '#D9E8DE',        // Pale success background
  paleYellow: '#E8DCC9',       // Pale warning background
  paleBlue: '#D8E4F0',         // Pale info background
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

// Shadows - Diffused, soft ambient (Editorial Luxury aesthetic)
export const SHADOWS = {
  none: 'none',
  subtle: '0 2px 4px rgba(31, 31, 31, 0.04)',
  soft: '0 4px 12px rgba(31, 31, 31, 0.08)',
  medium: '0 8px 24px rgba(31, 31, 31, 0.12)',
  glow: '0 0 32px rgba(155, 168, 163, 0.15)',     // Sage glow
  insetLight: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
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
    bg: COLORS.paleBlue,         // #D8E4F0
    text: '#5A7A9E',             // Muted dark blue
    accent: COLORS.infoBluee,    // #7A9DBE
  },
  draft: {
    bg: COLORS.taupe,            // #B8AFA3
    text: COLORS.white,          // #FFFFFF
    accent: COLORS.espresso,     // #1F1F1F
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

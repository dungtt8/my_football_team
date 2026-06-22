/**
 * Design System Constants - Color Palette, Typography, Spacing
 * Based on Phase 2 Frontend Design Spec
 */

// Colors
export const COLORS = {
  // Primary
  black: '#111111',
  charcoal: '#2F3437',
  gray: '#787774',
  lightGray: '#EAEAEA',
  bone: '#F7F6F3',
  white: '#FFFFFF',

  // Status Colors
  paleRed: '#FDEBEC',
  paleGreen: '#EDF3EC',
  paleYellow: '#FBF3DB',
  paleBlue: '#E1F3FE',
} as const

// Typography
export const TYPOGRAPHY = {
  fonts: {
    serif: 'Instrument Serif',
    sans: 'Geist Sans',
    mono: 'Geist Mono',
  },
  sizes: {
    hero: '32px',
    sectionTitle: '24px',
    heading3: '18px',
    body: '16px',
    small: '14px',
    caption: '12px',
    button: '14px',
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
  },
} as const

// Spacing Scale
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xl2: '32px',
  xl3: '48px',
} as const

// Border Radius
export const BORDER_RADIUS = {
  button: '4px',
  card: '8px',
  pill: '9999px',
} as const

// Status Badge Variants
export const BADGE_VARIANTS = {
  approved: {
    bg: COLORS.paleGreen,
    text: '#346538',
  },
  pending: {
    bg: COLORS.paleYellow,
    text: '#956400',
  },
  rejected: {
    bg: COLORS.paleRed,
    text: '#9F2F2D',
  },
  info: {
    bg: COLORS.paleBlue,
    text: '#0277BD',
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

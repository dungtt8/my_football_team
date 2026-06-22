import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors
        black: '#111111',
        charcoal: '#2F3437',
        gray: '#787774',
        'light-gray': '#EAEAEA',
        bone: '#F7F6F3',
        white: '#FFFFFF',
        
        // Status colors
        'pale-red': '#FDEBEC',
        'pale-green': '#EDF3EC',
        'pale-yellow': '#FBF3DB',
        'pale-blue': '#E1F3FE',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        sans: ['Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      fontSize: {
        'hero': ['32px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'section-title': ['24px', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
        'heading-3': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'small': ['14px', { lineHeight: '1.5' }],
        'caption': ['12px', { lineHeight: '1.4', fontFamily: 'Geist Mono' }],
        'button': ['14px', { lineHeight: '1.2', fontWeight: '500' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'button': '4px',
        'card': '8px',
        'pill': '9999px',
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
    },
  },
  plugins: [],
}

export default config

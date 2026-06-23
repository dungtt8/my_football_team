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
        // Modern premium palette
        cream: '#FFFCF9',
        'cream-light': '#FFFEF9',
        slate: '#0F0E0C',
        'slate-dark': '#1A1815',
        sage: '#7FA89F',
        'sage-dark': '#6A9289',
        forest: '#3D5A50',
        stone: '#9F9A93',
        white: '#FFFFFF',
        
        // Legacy names for backwards compatibility
        black: '#0F0E0C',
        charcoal: '#1A1815',
        gray: '#7FA89F',
        'light-gray': '#9F9A93',
        bone: '#FFFCF9',
        espresso: '#0F0E0C',
        'espresso-light': '#1A1815',
        tan: '#9F9A93',
        taupe: '#9F9A93',
        
        // Status colors (vibrant, contemporary)
        'success-green': '#44A366',
        'error-red': '#D64545',
        'errorRed': '#D64545',  // Alternative name
        'warning-yellow': '#E8B34B',
        'info-blue': '#5B9BD5',
        
        // Pale backgrounds
        'pale-red': '#F5DEDE',
        'pale-green': '#D8E8DC',
        'pale-yellow': '#F0E6CC',
        'pale-blue': '#DCE8F5',
      },
      fontFamily: {
        serif: ['Instrument Serif', 'serif'],
        display: ['Clash Display', 'Instrument Serif', 'serif'],
        sans: ['Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      fontSize: {
        // Eyebrow / labels
        'eyebrow': ['10px', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600' }],
        
        // Premium typography scale
        'caption': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['16px', { lineHeight: '1.7', fontWeight: '400' }],
        'body-sm': ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        'button': ['14px', { lineHeight: '1.2', fontWeight: '500' }],
        
        // Headings (serif)
        'heading-3': ['18px', { lineHeight: '1.4', fontWeight: '400', fontFamily: 'Instrument Serif' }],
        'heading-2': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '400', fontFamily: 'Instrument Serif' }],
        'heading-1': ['40px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '400', fontFamily: 'Instrument Serif' }],
        
        // Display / Hero (larger)
        'section-title': ['32px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '400', fontFamily: 'Instrument Serif' }],
        'hero': ['56px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '400', fontFamily: 'Instrument Serif' }],
        'hero-large': ['72px', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '400', fontFamily: 'Instrument Serif' }],
      },
      spacing: {
        // Expanded spacing scale (generous, airy)
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
        '5xl': '80px',
        '6xl': '96px',
      },
      borderRadius: {
        // Premium squircle-like curves
        'sm': '6px',
        'md': '10px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        
        // Legacy names
        'button': '24px',
        'card': '20px',
        'pill': '9999px',
      },
      boxShadow: {
        // Modern premium, deeper shadows
        'subtle': '0 2px 6px rgba(15, 14, 12, 0.06)',
        'soft': '0 6px 16px rgba(15, 14, 12, 0.10)',
        'medium': '0 12px 32px rgba(15, 14, 12, 0.14)',
        'deep': '0 20px 48px rgba(15, 14, 12, 0.18)',
        'glow': '0 0 40px rgba(127, 168, 159, 0.20)',
        'inset-light': 'inset 0 1px 2px rgba(255, 255, 255, 0.25)',
        'inset-dark': 'inset 0 1px 2px rgba(15, 14, 12, 0.10)',
      },
      backdropBlur: {
        // Premium blur values for glass effects
        'none': '0',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      animation: {
        // Smooth, spring-like animations
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.32, 0.72, 0, 1) forwards',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.32, 0.72, 0, 1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px) blur(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0) blur(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [],
}

export default config

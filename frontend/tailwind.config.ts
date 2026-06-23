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
        // Editorial Luxury palette
        cream: '#FDFBF7',
        'cream-light': '#FFFBF7',
        sage: '#9BA8A3',
        'sage-dark': '#7A8681',
        espresso: '#1F1F1F',
        'espresso-light': '#3D3D3D',
        tan: '#D4C5B9',
        taupe: '#B8AFA3',
        white: '#FFFFFF',
        
        // Legacy names for backwards compatibility
        black: '#1F1F1F',
        charcoal: '#3D3D3D',
        gray: '#9BA8A3',
        'light-gray': '#B8AFA3',
        bone: '#FDFBF7',
        
        // Status colors (refined, muted palette)
        'success-green': '#6B9B7F',
        'error-red': '#C85A54',
        'warning-yellow': '#D4A574',
        'info-blue': '#7A9DBE',
        
        // Pale backgrounds
        'pale-red': '#EDD8D4',
        'pale-green': '#D9E8DE',
        'pale-yellow': '#E8DCC9',
        'pale-blue': '#D8E4F0',
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
        // Editorial Luxury soft, diffused shadows
        'subtle': '0 2px 4px rgba(31, 31, 31, 0.04)',
        'soft': '0 4px 12px rgba(31, 31, 31, 0.08)',
        'medium': '0 8px 24px rgba(31, 31, 31, 0.12)',
        'glow': '0 0 32px rgba(155, 168, 163, 0.15)',
        'inset-light': 'inset 0 1px 2px rgba(255, 255, 255, 0.4)',
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

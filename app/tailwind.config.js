/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#F4F3EF', 2: '#ECEAE4', 3: '#E3E1DA' },
        surface: { DEFAULT: '#FFFFFF', 2: '#FAF9F6', 3: '#F6F5F1' },
        line: { DEFAULT: '#E5E2DB', soft: '#EEECE6', strong: '#D2CEC4' },
        ink: {
          950: '#0A0F24', 900: '#111833', 800: '#1D2547', 700: '#2D3561', 600: '#474F7A',
          500: '#676D90', 400: '#9095AE', 300: '#BABDCD', 200: '#DADCE6', 100: '#ECEDF3',
        },
        indigo: {
          50: '#F0F1FF', 100: '#E2E5FF', 200: '#C7CDFF', 300: '#A1ABFF', 400: '#7A86F7',
          500: '#5862E8', 600: '#434BCF', 700: '#3539A6', 800: '#2B2E83', 900: '#1F2160',
        },
        sky: { 50: '#EEF5FF', 100: '#DCEAFF', 400: '#5A9BFF', 500: '#3B82F6', 600: '#2A6BD8' },
        iris: { 50: '#F4F1FE', 100: '#E9E3FD', 400: '#9A88EC', 500: '#7F6BDE', 600: '#6A55C8' },
        ok: { DEFAULT: '#1E7F55', bg: '#E5F3EB', line: '#BFE0CD' },
        warn: { DEFAULT: '#9A5B00', bg: '#FBF0DA', line: '#EFD6A3' },
        err: { DEFAULT: '#B8352E', bg: '#FBE7E4', line: '#F1C3BD' },
      },
      fontFamily: {
        sans: ['"Inter Variable"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', '"Noto Sans JP"', 'serif'],
      },
      fontSize: {
        '2xs': ['10.5px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
      },
      boxShadow: {
        hair: '0 0 0 1px rgba(17,24,51,0.06)',
        card: '0 1px 0 rgba(17,24,51,0.04), 0 1px 2px rgba(17,24,51,0.04), 0 0 0 1px rgba(17,24,51,0.055)',
        lift: '0 1px 0 rgba(17,24,51,0.04), 0 8px 24px -8px rgba(17,24,51,0.16), 0 0 0 1px rgba(17,24,51,0.06)',
        float: '0 24px 60px -18px rgba(10,15,36,0.35), 0 0 0 1px rgba(17,24,51,0.08)',
        inset: 'inset 0 1px 2px rgba(17,24,51,0.06)',
      },
      borderRadius: { xl2: '14px', panel: '18px' },
      transitionTimingFunction: { out: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}

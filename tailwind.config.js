/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neutrals — the entire UI lives here
        ink: {
          950: '#0a0a0a', // headings, primary text
          800: '#1c1c1e', // secondary text
          500: '#6b7280', // muted text, placeholders
          300: '#d1d5db', // borders, dividers
          200: '#e5e7eb', // hover on subtle backgrounds
          100: '#f3f4f6', // subtle backgrounds, hover states
          50: '#f9fafb', // page background
        },

        // Accent — used ONLY for interactive states and the active nav indicator
        accent: {
          DEFAULT: '#18181b', // near-black — primary buttons, active states
          hover: '#27272a', // slightly lighter on hover
        },

        // Importance stripes — left border accent only (not background fills)
        stripe: {
          high: '#dc2626', // red-600
          medium: '#f59e0b', // amber-500
          low: '#22c55e', // green-500
        },

        // Importance backgrounds — very faint tint behind the stripe items
        tint: {
          high: '#fff5f5',
          medium: '#fffbf0',
          low: '#f0fdf4',
        },

        // Exam type — tab indicator only
        exam: {
          banking: '#2563eb', // blue-600
          upsc: '#7c3aed', // violet-600
          ssc: '#059669', // emerald-600
          defence: '#dc2626', // red-600
          railway: '#d97706', // amber-600
          all: '#18181b', // near-black
        },
      },

      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['11px', { lineHeight: '16px', letterSpacing: '0.03em' }],
        xs: ['12px', { lineHeight: '18px' }],
        sm: ['13px', { lineHeight: '20px' }],
        base: ['14px', { lineHeight: '22px' }],
        md: ['15px', { lineHeight: '24px' }],
        lg: ['17px', { lineHeight: '26px', fontWeight: '500' }],
        xl: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        '2xl': ['24px', { lineHeight: '32px', fontWeight: '600' }],
      },

      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '6px', // inputs, tags, small elements
        md: '8px', // cards, modals, dropdowns
        full: '9999px', // exam type filter pills ONLY
      },

      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        modal: '0 8px 30px rgb(0 0 0 / 0.12)',
        none: 'none',
      },
    },
  },
  plugins: [],
};

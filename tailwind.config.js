/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        porcelain: '#F7F5EF',
        ivory: '#F1EEE5',
        navy: {
          DEFAULT: '#17243B',
          deep: '#202E47',
          muted: '#2C3D5C',
        },
        champagne: {
          DEFAULT: '#B99A60',
          soft: '#D7C49A',
          light: '#F4EFE4',
        },
        sage: {
          DEFAULT: '#82917B',
          light: '#EEF2EC',
          dark: '#52634C',
        },
        terracotta: {
          DEFAULT: '#B87968',
          light: '#F7ECE8',
          dark: '#8C4E3D',
        },
        amberwarm: {
          DEFAULT: '#C28E42',
          light: '#FBF3E4',
          dark: '#8A5F1D',
        },
        slatewarm: '#727782',
        borderwarm: '#E7E3DA',
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(23, 36, 59, 0.04)',
        card: '0 2px 8px rgba(23, 36, 59, 0.04)',
        elevated: '0 10px 30px rgba(23, 36, 59, 0.08)',
      },
    },
  },
  plugins: [],
};

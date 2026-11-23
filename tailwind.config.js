/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        porcelain: '#F7F5F0',
        mist: '#E8EAE3',
        charcoal: {
          DEFAULT: '#292D29',
          deep: '#1F231F',
          soft: '#3A3F3A',
        },
        olive: {
          DEFAULT: '#424D40',
          dark: '#333C31',
          light: '#EDF0EB',
        },
        sage: {
          DEFAULT: '#879587',
          light: '#EFF2EE',
          dark: '#4F5E4F',
        },
        clay: {
          DEFAULT: '#BD806B',
          light: '#F7ECE7',
          dark: '#8E5643',
        },
        softgray: '#858780',
        hairline: '#DDDCD4',
        // Semantic status palette (calm, clear, recognizable)
        status: {
          green: '#2F6F4E',
          greenBg: '#EAF3EE',
          amber: '#9A631B',
          amberBg: '#FBF2E3',
          red: '#A33E35',
          redBg: '#F9EAE8',
          gray: '#666963',
          grayBg: '#EFEFE9',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        atelier: '10px',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(41, 45, 41, 0.04)',
        atelier: '0 4px 18px rgba(41, 45, 41, 0.06)',
        elevated: '0 14px 36px rgba(41, 45, 41, 0.10)',
      },
    },
  },
  plugins: [],
};

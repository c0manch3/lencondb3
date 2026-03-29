/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#fdfaf0',
          100: '#faf5e1',
          200: '#f5eccc',
          300: '#f0e0b0',
          400: '#e8d08a',
          500: '#f9f0d9',
          600: '#d4b85a',
          700: '#b89830',
          800: '#8a7020',
          900: '#5c4a15',
          950: '#3d3010',
        },
        brown: {
          50: '#faf6f0',
          100: '#f0e8dc',
          200: '#e0d0b8',
          300: '#c4a882',
          400: '#a8805c',
          500: '#8c6840',
          600: '#6e4e2c',
          700: '#4e3420',
          800: '#352318',
          900: '#22150d',
          950: '#140c06',
        },
        accent: {
          50: '#fffff0',
          100: '#ffffcc',
          200: '#ffff99',
          300: '#FFFF8B',
          400: '#f0f060',
          500: '#d4d430',
          600: '#a8a820',
          700: '#7c7c18',
          800: '#505010',
          900: '#303008',
        },
        // Backward compatibility alias
        primary: {
          50: '#faf6f0',
          100: '#f0e8dc',
          200: '#e0d0b8',
          300: '#c4a882',
          400: '#a8805c',
          500: '#8c6840',
          600: '#6e4e2c',
          700: '#4e3420',
          800: '#352318',
          900: '#22150d',
          950: '#140c06',
        },
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
      },
      borderRadius: {
        DEFAULT: '0.4rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}

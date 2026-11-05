/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        abyss: {
          800: '#0c1829',
          900: '#060f1e',
          950: '#030812',
        },
        navy: {
          700: '#1b3254',
          800: '#11223b',
          850: '#0d1b30',
          900: '#081324',
          950: '#040b17',
        },
        surface: {
          dark: '#081324',
          card: '#0c1a30',
          elevated: '#112442',
          border: '#162e54',
          hover: '#193561'
        },
        biolum: {
          teal: '#0df2c9',
          cyan: '#00e5ff',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#a855f7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      backgroundImage: {
        'radar-grid': 'radial-gradient(rgba(0, 229, 255, 0.08) 1px, transparent 0)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}

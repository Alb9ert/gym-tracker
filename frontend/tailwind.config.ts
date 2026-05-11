import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        accent: '#007AFF',
        'accent-green': '#34C759',
        'accent-red': '#FF3B30',
        'accent-orange': '#FF9500',
        surface: '#FFFFFF',
        bg: '#F2F2F7',
        border: '#C7C7CC',
        'border-subtle': '#E5E5EA',
        primary: '#1C1C1E',
        secondary: '#6E6E73',
      },
    },
  },
  plugins: [],
} satisfies Config;

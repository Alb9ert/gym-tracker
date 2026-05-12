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
        bg: '#E5E5EA',
        border: '#8E8E93',
        'border-subtle': '#C7C7CC',
        primary: '#1C1C1E',
        secondary: '#48484A',
      },
      boxShadow: {
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.10), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        DEFAULT: '0 2px 6px 0 rgb(0 0 0 / 0.12), 0 1px 3px -1px rgb(0 0 0 / 0.08)',
        lg: '0 4px 16px 0 rgb(0 0 0 / 0.14), 0 2px 6px -2px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBE9DC',     // primary text on the warm-dark page
        creamdim: '#CBA9B6',
        grape: '#3A2342',     // dark text on bright cards
        pink: '#FF7FA8',
        coral: '#FF9166',
        amber: '#F5B45C',
        violet: '#9B8CFF',
        rose: '#E86A98',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-rounded', 'system-ui', 'sans-serif'],
        hand: ['var(--font-hand)', 'ui-rounded', 'cursive'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'drop-in': {
          '0%': { opacity: '0', transform: 'translateY(-24px) rotate(-6deg) scale(0.9)' },
          '55%': { opacity: '1', transform: 'translateY(3px) rotate(2deg) scale(1.02)' },
          '100%': { transform: 'translateY(0) rotate(-1.5deg) scale(1)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sway: { '0%, 100%': { transform: 'rotate(-2deg)' }, '50%': { transform: 'rotate(2deg)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0) translateX(0) scale(1)' },
          '50%': { transform: 'translateY(-28px) translateX(16px) scale(1.08)' },
        },
        glow: { '0%, 100%': { opacity: '0.85', transform: 'scale(1)' }, '50%': { opacity: '1', transform: 'scale(1.04)' } },
        wiggle: { '0%, 100%': { transform: 'rotate(-8deg)' }, '50%': { transform: 'rotate(8deg)' } },
        pop: { '0%': { transform: 'scale(0.4)', opacity: '0' }, '70%': { transform: 'scale(1.25)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'drop-in': 'drop-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        rise: 'rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        sway: 'sway 6s ease-in-out infinite',
        float: 'float 20s ease-in-out infinite',
        glow: 'glow 2.2s ease-in-out infinite',
        wiggle: 'wiggle 2.5s ease-in-out infinite',
        pop: 'pop 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;

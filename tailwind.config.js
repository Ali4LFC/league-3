/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#F5F2EA',
        charcoal: '#161616',
        surface: '#1E1E1C',
        line: '#2E2E2A',
        muted: '#8A8578',
        lime: '#D4FF00',
        limeDim: '#A8CC00',
        crimson: '#FF4D3D',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      keyframes: {
        'pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.35)' },
          '100%': { transform: 'scale(1)' }
        },
        'goal-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-14px) scale(1.18)' },
          '60%': { transform: 'translateY(0) scale(1.04)' },
          '85%': { transform: 'translateY(-5px) scale(1.08)' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(30px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'row-flash': {
          '0%': { backgroundColor: 'rgba(212, 255, 0, 0.18)' },
          '100%': { backgroundColor: 'transparent' }
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 255, 0, 0.5)' },
          '50%': { boxShadow: '0 0 0 10px rgba(212, 255, 0, 0)' }
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' }
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      },
      animation: {
        'pop': 'pop 0.3s ease-out',
        'goal-bounce': 'goal-bounce 0.6s cubic-bezier(.34,1.56,.64,1)',
        'slide-up': 'slide-up 0.4s cubic-bezier(.16,1,.3,1)',
        'slide-in-left': 'slide-in-left 0.35s cubic-bezier(.16,1,.3,1)',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(.16,1,.3,1)',
        'fade-in': 'fade-in 0.5s cubic-bezier(.16,1,.3,1)',
        'row-flash': 'row-flash 1.4s ease-out',
        'pulse-ring': 'pulse-ring 1.8s ease-in-out infinite',
        'shake': 'shake 0.3s ease-in-out',
        'marquee': 'marquee 20s linear infinite',
      }
    }
  },
  plugins: []
}

export default {
  content: ['./index.html', './index.tsx', './App.tsx', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'section-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'sheet-in': { from: { opacity: '0', transform: 'translateY(24px)' }, to: { opacity: '1', transform: 'none' } },
        'pop-in': { from: { opacity: '0', transform: 'translateY(8px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'toast-in': { from: { opacity: '0', transform: 'translateY(-8px) scale(0.98)' }, to: { opacity: '1', transform: 'none' } },
        'slide-down': { from: { opacity: '0', transform: 'translateY(-4px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'section-in': 'section-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'sheet-in': 'sheet-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'pop-in': 'pop-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'toast-in': 'toast-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'slide-down': 'slide-down 160ms ease-out both',
      },
    },
  },
  plugins: [],
};

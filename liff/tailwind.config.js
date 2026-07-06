/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // tugical プライマリカラー（ミントグリーン）
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },
        // 予約ステータス専用カラー
        booking: {
          pending: '#f59e0b',     // 申込み中
          confirmed: '#10b981',   // 確定
          cancelled: '#ef4444',   // キャンセル
          completed: '#6b7280',   // 完了
          'no-show': '#dc2626',   // 無断キャンセル
        },
        // ステータスカラー
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Nunito', 'Noto Sans JP', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(1rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
} 
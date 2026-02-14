/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 车辆状态颜色
        'vehicle-primary': '#3B82F6',
        'vehicle-success': '#22C55E',
        'vehicle-warning': '#F59E0B',
        'vehicle-danger': '#EF4444',
        // 暗色模式背景
        'dark-bg': '#1F2937',
        'dark-card': '#374151',
        'dark-border': '#4B5563',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}

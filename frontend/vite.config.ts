import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  optimizeDeps: {
    include: [
      '@fullcalendar/core',
      '@fullcalendar/react',
      '@fullcalendar/resource',
      '@fullcalendar/resource-timeline',
      '@fullcalendar/interaction',
      '@fullcalendar/daygrid',
      '@fullcalendar/timeline',
    ],
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          fullcalendar: [
            '@fullcalendar/core',
            '@fullcalendar/react',
            '@fullcalendar/resource',
            '@fullcalendar/resource-timeline',
            '@fullcalendar/interaction',
            '@fullcalendar/daygrid',
            '@fullcalendar/timeline',
          ],
        },
      },
    },
  },
});

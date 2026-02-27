import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react(),
        laravel({
            input: [
                'resources/css/app.css', 
                'resources/js/app.js',
                'resources/js/app.tsx',
                'resources/js/pages/admin/index.tsx',
                'resources/js/pages/liff/index.tsx'
            ],
            refresh: true,
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    css: {
        postcss: './postcss.config.js',
    },
});

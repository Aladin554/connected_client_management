import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.jsx', // changed to jsx if using React
            ],
            refresh: true,
        }),
        react(),       // React support
        tailwindcss(), // TailwindCSS via Vite
    ],
    server: {
        host: '127.0.0.1',
        port: 5173, // Laravel default Vite port
    },
});

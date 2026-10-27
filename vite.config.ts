import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { studioDevPlugin } from './scripts/dev-plugin';
export default defineConfig({ plugins: [react(),studioDevPlugin()], base: './', server:{watch:{ignored:['**/.local/**','**/release/**','**/dist/**','**/dist-electron/**','**/data/raw/**']}}, build: { outDir: 'dist' } });

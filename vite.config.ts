import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages публикует проект в подпапке /raki/.
export default defineConfig({
  base: '/raki/',
  plugins: [react()],
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const isContentBuild = process.env.BUILD_TYPE === 'content';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: isContentBuild 
        ? { content: resolve(__dirname, 'src/ContentApp.jsx') }
        : { 
            sidepanel: resolve(__dirname, 'index.html'),
            options: resolve(__dirname, 'options.html')
          },
      output: {
        format: isContentBuild ? 'iife' : 'es',
        entryFileNames: '[name].js',
        globals: isContentBuild ? {} : {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react-markdown': 'ReactMarkdown'
        },
        assetFileNames: (chunkInfo) => {
          if (chunkInfo.name && chunkInfo.name.endsWith('.css')) {
            return 'assets/style.css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js'
      },
      external: []
    }
  },
  base: './'
});

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  // Base URL for assets
  base: './',

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    open: true,
  },

  // Build configuration
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,

    // Bundle size optimization
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          // Vendor chunk for external dependencies
          vendor: ['nostr-tools'],
        },
        // Asset naming for caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Performance budgets (500KB gzipped target)
    chunkSizeWarningLimit: 600, // KB uncompressed

    // Minification
    minify: 'esbuild',
    cssMinify: true,
  },

  // CSS configuration
  css: {
    devSourcemap: true,
  },

  // TypeScript path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@helpers': resolve(__dirname, 'src/helpers'),
      '@state': resolve(__dirname, 'src/state'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },

  // Plugin configuration
  plugins: [
    // Bundle analyzer for development
    process.env.ANALYZE && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },

  // Preview server (for production builds)
  preview: {
    port: 4173,
    host: true,
  },
});
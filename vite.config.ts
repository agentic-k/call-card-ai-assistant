import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  return {
    base: isDevelopment ? (process.env.ELECTRON_RENDERER_URL || '/') : './',
    server: {
      host: "127.0.0.1",
      port: 8080,
      strictPort: true,
      hmr: {
        port: 8081,
        host: "127.0.0.1",
        clientPort: 8081,
      },
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'require-corp',
      },
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
    plugins: [
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    clearScreen: false,
    optimizeDeps: {
      force: true,
      exclude: ['electron'],
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      rollupOptions: {
        external: ['electron'],
      },
    },
    publicDir: 'public',
  }
});

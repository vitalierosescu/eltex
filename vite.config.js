import { defineConfig } from 'vite'
import eslintPlugin from 'vite-plugin-eslint2'

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  return {
    plugins: isDev
      ? [
          eslintPlugin({
            cache: false,
            emitWarning: true,
            emitError: false,
          }),
        ]
      : [],
    server: {
      host: 'localhost',
      port: 4000,
      cors: '*',
      hmr: {
        host: 'localhost',
        protocol: 'ws',
        overlay: false,
      },
    },
    build: {
      minify: false,
      manifest: true,
      rollupOptions: {
        input: './src/main.js',
        output: {
          format: 'umd',
          entryFileNames: 'main.js',
          esModule: false,
          compact: false,
          globals: {
            jquery: '$',
            gsap: 'gsap',
          },
        },
        external: ['jquery', 'gsap'],
      },
    },
  }
})

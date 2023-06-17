import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    target: 'esnext',
    lib: {
      entry: resolve(__dirname, 'src/index.mts'),
      formats: ['es'],
      fileName: 'index',
    },
    minify: false,
    sourcemap: false,
    rollupOptions: {
      external: [/^[\w@]/],
    },
  },
  plugins: [dts()],
});

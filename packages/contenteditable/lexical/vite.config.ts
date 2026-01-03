import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ContentEditableVisualizerLexical',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['contenteditable-visualizer', 'lexical'],
    },
  },
  plugins: [dts()],
});

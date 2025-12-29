import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'ContentEditableVisualizerProseMirror',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['contenteditable-visualizer', 'prosemirror-view'],
    },
  },
  plugins: [dts()],
});


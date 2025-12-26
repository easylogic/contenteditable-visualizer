import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
import { createVisualizer } from 'contenteditable-visualizer';

const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
  marks: schema.spec.marks,
});

const editorElement = document.getElementById('editor');
if (!editorElement) {
  throw new Error('Editor element not found');
}

// Create initial content with rich text
const initialContent = mySchema.node('doc', null, [
  mySchema.node('paragraph', null, [mySchema.text('Start typing here to see the visualizer in action! 🎉')]),
  mySchema.node('paragraph', null, [mySchema.text('Try selecting text, using keyboard shortcuts, or IME composition.')]),
  mySchema.node('paragraph', null, [mySchema.text('Special characters: © ® ™ € £ ¥ § ¶ † ‡ • … — – "quotes" \'apostrophes\'')]),
  mySchema.node('paragraph', null, [mySchema.text('Emojis: 😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎')]),
  mySchema.node('paragraph', null, [mySchema.text('Line breaks and whitespace:')]),
  mySchema.node('paragraph', null, [mySchema.text('Line 1')]),
  mySchema.node('paragraph', null, [mySchema.text('Line 2')]),
  mySchema.node('paragraph', null, [mySchema.text('Line 3')]),
  mySchema.node('paragraph', null, [mySchema.text('Non-breaking space: Hello World')]),
  mySchema.node('paragraph', null, [mySchema.text('Tab character: Start→→→End')]),
  mySchema.node('paragraph', null, [
    mySchema.text('Mixed content: '),
    mySchema.text('Bold', [mySchema.marks.strong.create()]),
    mySchema.text(' and '),
    mySchema.text('italic', [mySchema.marks.em.create()]),
  ]),
  mySchema.node('paragraph', null, [mySchema.text('Unicode: 中文 日本語 한국어 العربية русский')]),
  mySchema.node('paragraph', null, [mySchema.text('Math symbols: ∑ ∫ √ ∞ ≈ ≠ ≤ ≥ ± × ÷')]),
  mySchema.node('paragraph', null, []),
  mySchema.node('paragraph', null, [mySchema.text('     ')]),
]);

const state = EditorState.create({
  schema: mySchema,
  plugins: [
    history(),
    keymap(baseKeymap),
  ],
  doc: initialContent,
});

const view = new EditorView(editorElement, {
  state,
});

// Initialize visualizer on ProseMirror's DOM
const visualizer = createVisualizer(view.dom, {
  visualize: true,
  logEvents: true,
  snapshots: true,
  panel: true,
  autoSnapshot: false,
});

// Button handlers
document.getElementById('capture-snapshot')?.addEventListener('click', async () => {
  try {
    const id = await visualizer.captureSnapshot('manual', 'ProseMirror snapshot');
    console.log('Snapshot captured:', id);
    alert(`Snapshot captured! ID: ${id}`);
  } catch (error) {
    console.error('Failed to capture snapshot:', error);
  }
});

document.getElementById('clear-events')?.addEventListener('click', () => {
  visualizer.clearEventLogs();
  console.log('Events cleared');
});

document.getElementById('export-data')?.addEventListener('click', async () => {
  try {
    const data = await visualizer.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prosemirror-visualizer-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
  }
});

console.log('ProseMirror Visualizer initialized');


import EditorJS from '@editorjs/editorjs';
import { createVisualizer } from 'contenteditable-visualizer';

const editorElement = document.getElementById('editorjs');
if (!editorElement) {
  throw new Error('Editor element not found');
}

const editor = new EditorJS({
  holder: 'editorjs',
  placeholder: 'Start typing here to see the visualizer in action!',
  data: {
    blocks: [
      {
        type: 'paragraph',
        data: {
          text: 'Start typing here to see the visualizer in action! 🎉',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Try selecting text, using keyboard shortcuts, or IME composition.',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Special characters: © ® ™ € £ ¥ § ¶ † ‡ • … — – "quotes" \'apostrophes\'',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Emojis: 😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Line breaks and whitespace:',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Line 1',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Line 2',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Line 3',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Non-breaking space: Hello World',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Tab character: Start→→→End',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Unicode: 中文 日本語 한국어 العربية русский',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: 'Math symbols: ∑ ∫ √ ∞ ≈ ≠ ≤ ≥ ± × ÷',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: '',
        },
      },
      {
        type: 'paragraph',
        data: {
          text: '     ',
        },
      },
    ],
  },
});

editor.isReady.then(() => {
  // Find the contenteditable element
  const contentEditable = editorElement.querySelector('[contenteditable]') as HTMLElement;
  if (contentEditable) {
    const visualizer = createVisualizer(contentEditable, {
      visualize: true,
      logEvents: true,
      snapshots: true,
      panel: true,
      autoSnapshot: false,
    });

    document.getElementById('capture-snapshot')?.addEventListener('click', async () => {
      try {
        const id = await visualizer.captureSnapshot('manual', 'Editor.js snapshot');
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
        a.download = `editorjs-visualizer-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to export data:', error);
      }
    });

    console.log('Editor.js Visualizer initialized');
  }
});


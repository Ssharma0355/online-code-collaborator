import React, { useRef, useMemo } from 'react'
import { Editor } from '@monaco-editor/react'
import "./App.css"
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

const App = () => {
  const editorRef = useRef(null);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    const provider = new SocketIOProvider(
      "http://localhost:8000", // ⚠️ match your backend port
      "monaco",
      ydoc,
      { autoConnect: true }
    );

    new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );
  };

  return (
    <main className='h-screen w-full bg-gray-950 flex gap-4 p-4'>
      <aside className='h-full w-1/4 bg-amber-50 rounded-lg'></aside>

      <section className='w-3/4 bg-neutral-800 rounded-lg'>
        <Editor
          height="90vh"
          defaultLanguage="javascript"
          defaultValue="// Write code here in JavaScript"
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  );
};

export default App;
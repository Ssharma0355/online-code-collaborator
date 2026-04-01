import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import "./App.css"
import { MonacoBinding } from "y-monaco"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

const App = () => {
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null); // ✅ prevent duplicate binding

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const [userName, setUserName] = useState(() => {
    return new URLSearchParams(window.location.search).get("userName") || ""
  });

  const [users, setUsers] = useState([]);

  // ✅ Handle editor mount
  const handleMount = (editor) => {
    editorRef.current = editor;

    // Try binding if provider already exists
    if (providerRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      );
    }
  };

  useEffect(() => {
    if (!userName) return;

    const provider = new SocketIOProvider(
      "http://localhost:8000",
      "monaco",
      ydoc,
      { autoConnect: true }
    );

    providerRef.current = provider;

    // ✅ Set username
    provider.awareness.setLocalStateField("user", { userName });

    // ✅ Awareness listener
    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());

      setUsers(
        states
          .filter(state => state.user?.userName)
          .map(state => state.user)
      );
    };

    provider.awareness.on("change", handleAwarenessChange);

    // ✅ Try binding if editor already mounted
    if (editorRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      );
    }

    const handleBeforeUnload = () => {
      provider.awareness.setLocalStateField("user", null);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      provider.disconnect();
      provider.awareness.off("change", handleAwarenessChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);

      // ✅ destroy binding
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [userName, ydoc]);

  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.userName.value;

    setUserName(name);
    window.history.pushState({}, "", "?userName=" + name);
  };

  // ✅ Join Screen
  if (!userName)
    return (
      <main className='h-screen w-full bg-gray-950 flex items-center justify-center'>
        <form className='flex flex-col gap-4' onSubmit={handleJoin}>
          <input
            className='p-2 text-gray-950 rounded'
            type='text'
            name="userName"
            placeholder="Enter your name"
          />

          <button
            type='submit'
            className='p-2 rounded-lg bg-amber-50 text-gray-950 font-bold'
          >
            Join
          </button>
        </form>
      </main>
    );

  // ✅ Main UI
  return (
    <main className='h-screen w-full bg-gray-950 flex gap-4 p-4'>
      <aside className='h-full w-1/4 bg-amber-50 rounded-lg'>
        <div className='p-3 flex flex-col gap-2'>
          <h2 className='font-bold text-lg mb-2'>Active Users</h2>

          {users.length === 0 ? (
            <p className='text-sm text-gray-500'>No users connected</p>
          ) : (
            users.map((user, idx) => (
              <div
                key={idx}
                className='flex items-center gap-3 bg-white/80 rounded-lg p-2 shadow-sm'
              >
                <div className='w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-gray-900'>
                  {user.userName.charAt(0).toUpperCase()}
                </div>

                <p className='font-medium text-gray-900'>
                  {user.userName}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>

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
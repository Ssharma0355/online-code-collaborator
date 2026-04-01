import React, { useRef, useMemo, useState, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import "./App.css";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const DOMAIN = "wss://online-code-collaborator-server-ss.onrender.com";

const App = () => {
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  // ✅ Yjs setup
  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  // ✅ URL params
  const params = new URLSearchParams(window.location.search);
  const initialName = params.get("userName") || "";
  const initialRoom = params.get("room") || Math.random().toString(36).slice(2, 8);

  const [userName, setUserName] = useState(initialName);
  const [roomId] = useState(initialRoom);
  const [users, setUsers] = useState([]);
  const [output, setOutput] = useState("");

  // ✅ Mount editor
  const handleMount = (editor) => {
    editorRef.current = editor;

    if (providerRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editor.getModel(),
        new Set([editor]),
        providerRef.current.awareness
      );
    }
  };

  // ✅ Yjs WebSocket connection
  useEffect(() => {
    if (!userName) return;

    const provider = new WebsocketProvider(
      `${DOMAIN}/${roomId}`,
      roomId,
      ydoc
    );

    providerRef.current = provider;

    // set user
    provider.awareness.setLocalStateField("user", { userName });

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values());
      setUsers(states.filter(s => s.user).map(s => s.user));
    };

    provider.awareness.on("change", updateUsers);

    if (editorRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      );
    }

    return () => {
      provider.disconnect();
      provider.awareness.off("change", updateUsers);
      bindingRef.current?.destroy();
      bindingRef.current = null;
    };
  }, [userName, roomId, ydoc]);

  // ✅ Run code
  const runCode = () => {
    const code = editorRef.current.getValue();

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    doc.open();

    doc.write(`
      <script>
        try {
          let logs = "";
          console.log = (...args) => {
            logs += args.join(" ") + "\\n";
          };

          const result = (function() {
            ${code}
          })();

          parent.postMessage({ logs, result }, "*");
        } catch (err) {
          parent.postMessage({ error: err.message }, "*");
        }
      </script>
    `);

    doc.close();
  };

  // ✅ Listen output
  useEffect(() => {
    const handler = (e) => {
      if (e.data.error) {
        setOutput("❌ " + e.data.error);
      } else {
        setOutput(
          (e.data.logs || "") +
          (e.data.result !== undefined ? e.data.result : "")
        );
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ✅ Join handler
  const handleJoin = (e) => {
    e.preventDefault();
    const name = e.target.userName.value;

    setUserName(name);

    // keep room in URL
    window.history.pushState(
      {},
      "",
      `?userName=${name}&room=${roomId}`
    );
  };

  // ✅ Copy link
  const copyLink = () => {
    const link = `${window.location.origin}?userName=${userName}&room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert("Link copied!");
  };

  // ✅ Join screen
  if (!userName)
    return (
      <main className="h-screen flex items-center justify-center bg-gray-900">
        <form onSubmit={handleJoin} className="flex flex-col gap-3">
          <input name="userName" placeholder="Enter name" className="p-2 rounded" />
          <button className="bg-yellow-400 p-2 rounded font-bold">
            Join
          </button>
        </form>
      </main>
    );

  // ✅ Main UI
  return (
    <main className="h-screen flex gap-4 p-4 bg-gray-900 text-white">

      {/* Sidebar */}
      <aside className="w-1/4 bg-yellow-100 text-black rounded p-3">
        <h2 className="font-bold mb-2">Users</h2>

        <button
          onClick={copyLink}
          className="mb-3 bg-black text-white px-2 py-1 rounded"
        >
          Copy Invite Link
        </button>

        {users.map((u, i) => (
          <p key={i}>{u.userName}</p>
        ))}
      </aside>

      {/* Editor */}
      <section className="w-3/4 flex flex-col gap-2">
        <div className="flex gap-2">
          <button onClick={runCode} className="bg-green-500 px-4 py-2 rounded">
            ▶ Run
          </button>

          <button onClick={() => setOutput("")} className="bg-red-500 px-4 py-2 rounded">
            Clear
          </button>
        </div>

        <Editor
          height="60vh"
          defaultLanguage="javascript"
          theme="vs-dark"
          onMount={handleMount}
        />

        <div className="bg-black text-green-400 p-3 h-40 overflow-auto rounded">
          <h2 className="font-bold mb-2">Output</h2>
          <pre>{output || "Run code to see output..."}</pre>
        </div>
      </section>
    </main>
  );
};

export default App;
import React from 'react'
import { Editor } from '@monaco-editor/react'
import "./App.css"

const App = () => {
  return (
    <main className='h-screen w-full bg-gray-950 flex gap-4 p-4'>
      <aside className='h-full w-1/4 bg-amber-50 rounded-lg'>

      </aside>
      <section className='w-3/4 bg-neutral-800 rounded-lg'>
      <Editor className='overflow-hidden' height="90vh" defaultLanguage="javascript" defaultValue="// Write code here in JavaScript" theme="vs-dark" />

      </section>

    </main>
  )
}

export default App
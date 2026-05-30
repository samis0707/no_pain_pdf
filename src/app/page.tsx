'use client'

import { useState } from 'react'
import DataImportPanel from '@/components/DataImport/DataImportPanel'

type Tab = 'upload' | 'design' | 'export'

export default function EditorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upload')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'design', label: 'Design' },
    { id: 'export', label: 'Export' },
  ]

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold">No Pain PDF</h1>
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="w-24" />
      </header>

      <main className="flex-1 overflow-auto">
        {activeTab === 'upload' && <DataImportPanel itemId={1} />}

        {activeTab === 'design' && (
          <div className="flex h-full">
            <div className="flex-1 border-r p-4">
              <h2 className="text-lg font-semibold mb-2">Template Editor</h2>
              <div className="border rounded-lg h-[calc(100%-2.5rem)] bg-zinc-50 flex items-center justify-center text-zinc-400">
                Editor coming soon
              </div>
            </div>
            <div className="flex-1 p-4">
              <h2 className="text-lg font-semibold mb-2">Preview</h2>
              <div className="border rounded-lg h-[calc(100%-2.5rem)] bg-zinc-50 flex items-center justify-center text-zinc-400">
                Preview coming soon
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div className="p-6 max-w-lg mx-auto space-y-6">
            <h2 className="text-xl font-semibold">Export PDF</h2>
            <p className="text-zinc-500 text-sm">
              Configure export settings and download your PDF.
            </p>
            <div className="border rounded-lg p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Page Size</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm">
                  <option>A4</option>
                  <option>Letter</option>
                  <option>Custom</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Orientation</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm">
                    <option>Portrait</option>
                    <option>Landscape</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Margins</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm">
                    <option>Normal (2cm)</option>
                    <option>Narrow (1cm)</option>
                    <option>Wide (3cm)</option>
                  </select>
                </div>
              </div>
              <button className="w-full bg-zinc-900 text-white py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors">
                Download PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

'use client'

import { useExportStore } from '@/stores/exportStore'
import { useTemplateStore } from '@/stores/templateStore'

const pageSizes = [
  { value: 'A4', label: 'A4' },
  { value: 'Letter', label: 'Letter' },
  { value: 'Custom', label: 'Custom' },
]

const orientations = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]

const marginOptions = [
  { value: 'normal', label: 'Normal (2cm)' },
  { value: 'narrow', label: 'Narrow (1cm)' },
  { value: 'wide', label: 'Wide (3cm)' },
]

export default function ExportPanel() {
  const { pageSize, orientation, margins, bleed, cropMarks, colorMode, enableAccessibility, isExporting, error, setPageSize, setOrientation, setMargins, setBleed, setCropMarks, setColorMode, setEnableAccessibility, exportPdf } = useExportStore()
  const { html, css } = useTemplateStore()

  const handleDownload = () => {
    exportPdf(html, css)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Page Size</label>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm"
        >
          {pageSizes.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Orientation</label>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            {orientations.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Margins</label>
          <select
            value={margins}
            onChange={(e) => setMargins(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            {marginOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Bleed: {bleed}mm
        </label>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={bleed}
          onChange={(e) => setBleed(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-zinc-400">
          <span>0mm</span>
          <span>5mm</span>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={cropMarks}
          onChange={(e) => setCropMarks(e.target.checked)}
          className="rounded"
        />
        Crop marks
      </label>

      <div>
        <label className="block text-sm font-medium mb-1">Color Mode</label>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as 'rgb' | 'cmyk')}
          className="w-full border rounded-md px-3 py-2 text-sm"
        >
          <option value="rgb">RGB</option>
          <option value="cmyk">CMYK (PDF/X-4)</option>
        </select>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enableAccessibility}
            onChange={(e) => setEnableAccessibility(e.target.checked)}
            className="rounded"
          />
          PDF/UA accessibility tagging
        </label>
        <p className="text-xs text-zinc-500 mt-1">
          Generates EU-standard accessible PDF (ISO 14289-1 / PDF/UA)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-600 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => useExportStore.getState().error && useExportStore.setState({ error: null })}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <button
        onClick={handleDownload}
        disabled={isExporting}
        className={`w-full bg-zinc-900 text-white py-2 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isExporting ? 'Exporting...' : 'Download PDF'}
      </button>
    </div>
  )
}

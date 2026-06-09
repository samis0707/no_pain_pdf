export async function renderPdfPages(file: File): Promise<Array<{ mimeType: string; data: string }>> {
  const pageLimit = parseInt(process.env.PDF_VISION_PAGE_LIMIT ?? '3', 10)

  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = Math.min(pdf.numPages, pageLimit)
  const results: Array<{ mimeType: string; data: string }> = []

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1.5 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    const base64 = dataUrl.split(',')[1]
    results.push({ mimeType: 'image/jpeg', data: base64 })
  }

  return results
}

import { NextRequest } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  let body: { html?: string; css?: string; options?: { format?: string; orientation?: string; margin?: string } }
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.html) {
    return new Response(JSON.stringify({ error: 'html is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const html = body.html
  const css = body.css ?? ''
  const options = body.options ?? {}

  const marginMap: Record<string, string> = {
    narrow: '0.5cm',
    normal: '1cm',
    wide: '2cm',
  }
  const margin = marginMap[options.margin ?? 'normal'] || '1cm'
  const marginObj = { top: margin, right: margin, bottom: margin, left: margin }

  const format = (options.format ?? 'A4').toLowerCase() as 'a4' | 'letter'

  try {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    const document = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`
    await page.setContent(document, { waitUntil: 'load' })

    const pdf = await page.pdf({
      format,
      landscape: options.orientation === 'landscape',
      margin: marginObj,
      printBackground: true,
    })

    await browser.close()

    return new Response(new Uint8Array(pdf), {
      headers: { 'Content-Type': 'application/pdf' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PDF generation failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

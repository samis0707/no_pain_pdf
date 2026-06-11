/**
 * Manual end-to-end check for asset rendering in PDF exports.
 *
 * Uploads a test image to MinIO, renders a template referencing it via
 * /api/assets/file/, and asserts the resulting PDF embeds the image —
 * proving the presigned-URL rewrite is resolvable from the WeasyPrint
 * container.
 *
 * Requires: docker compose services minio + weasyprint running.
 * Run: npx tsx scripts/verify-asset-export.ts
 */
import { writeFileSync } from 'node:fs'

// Env must be set before the s3 module is loaded (its clients are built at
// import time), hence the dynamic imports in main().
process.env.S3_ENDPOINT ??= 'http://localhost:9000'
process.env.S3_INTERNAL_ENDPOINT ??= 'http://minio:9000'
process.env.WEASYPRINT_URL ??= 'http://localhost:3001'

const RED_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

async function main() {
  const { uploadFile } = await import('@/lib/s3')
  const { renderPdf } = await import('@/lib/pdf-render')

  const key = 'assets/verify/epic-a.png'
  await uploadFile(key, RED_PIXEL_PNG, 'image/png')
  console.log('uploaded', key)

  const pdf = await renderPdf({
    html: '<h1>Epic A</h1><img src="/api/assets/file/assets/verify/epic-a.png" style="width:100px;height:100px">',
    css: '@page { size: A5 }',
  })

  const hasImageXObject = /\/Subtype\s*\/Image/.test(Buffer.from(pdf).toString('latin1'))
  writeFileSync('/tmp/verify-asset-export.pdf', Buffer.from(pdf))
  console.log('pdf bytes:', pdf.byteLength, '→ /tmp/verify-asset-export.pdf')

  if (!hasImageXObject) {
    console.error('FAIL: WeasyPrint did not embed the asset image')
    process.exit(1)
  }
  console.log('PASS: asset fetched from MinIO via presigned URL and embedded in PDF')
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})

import { generateInternalDownloadUrl } from '@/lib/s3'

// A reference enclosed in quotes (HTML attribute, quoted CSS url()) ends at
// the closing quote, so characters like ')' that encodeURIComponent leaves
// unescaped are allowed inside.
const QUOTED_PATTERN = /(["'])(\/api\/assets\/file\/[^"'\s,]+)\1/g
// Bare references (unquoted CSS url(), srcset candidates) end at whitespace,
// ')' or ','. Commas are safe delimiters: the upload UI percent-encodes them.
const BARE_PATTERN = /\/api\/assets\/file\/[^"'\s)<>,]+/g

function decodeKey(urlPath: string): string {
  const encodedKey = urlPath.slice('/api/assets/file/'.length)
  return encodedKey.split('/').map(decodeURIComponent).join('/')
}

async function presign(urlPath: string, cache: Map<string, string>): Promise<string> {
  const key = decodeKey(urlPath)
  let url = cache.get(key)
  if (!url) {
    url = await generateInternalDownloadUrl(key)
    cache.set(key, url)
  }
  return url
}

async function rewrite(input: string, cache: Map<string, string>): Promise<string> {
  let output = input
  for (const [full, quote, path] of [...input.matchAll(QUOTED_PATTERN)]) {
    output = output.split(full).join(`${quote}${await presign(path, cache)}${quote}`)
  }
  for (const path of new Set(output.match(BARE_PATTERN) ?? [])) {
    output = output.split(path).join(await presign(path, cache))
  }
  return output
}

/**
 * Replaces /api/assets/file/<key> references in HTML and CSS with presigned
 * S3 URLs so the WeasyPrint service can fetch them directly from storage.
 * External http(s) URLs and data: URIs are left untouched.
 */
export async function rewriteAssetUrls(
  html: string,
  css: string
): Promise<{ html: string; css: string }> {
  const cache = new Map<string, string>()
  return {
    html: await rewrite(html, cache),
    css: await rewrite(css, cache),
  }
}

import { apiSpec } from '@/lib/api-spec'

export async function GET() {
  return new Response(JSON.stringify(apiSpec), {
    headers: { 'Content-Type': 'application/json' },
  })
}

import { prisma } from '@/lib/prisma'

export async function GET() {
  const formats = await prisma.pageFormat.findMany({
    orderBy: { name: 'asc' },
  })
  return new Response(JSON.stringify(formats), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

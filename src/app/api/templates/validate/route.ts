import Handlebars from 'handlebars'

export async function POST(request: Request) {
  const { html } = await request.json() as { html: string }

  if (!html) {
    return Response.json({ error: 'html is required' }, { status: 400 })
  }

  try {
    Handlebars.compile(html)
    return Response.json({ valid: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return Response.json({ valid: false, error: message })
  }
}

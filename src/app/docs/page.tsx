'use client'

import { useEffect } from 'react'

export default function DocsPage() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
    script.onload = () => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'
      document.head.appendChild(link)
      // @ts-expect-error SwaggerUIBundle added by script
      window.SwaggerUIBundle({ url: '/api/docs', dom_id: '#swagger-ui' })
    }
    document.body.appendChild(script)
  }, [])

  return <div id="swagger-ui" className="h-screen" />
}

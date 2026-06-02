'use client'

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="chat-message-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-[13px]" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <pre className="bg-zinc-800 text-zinc-100 rounded-md p-3 my-2 overflow-x-auto text-[13px] leading-relaxed">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  )
}

import '@/lib/handlebars-helpers'

export async function GET() {
  return Response.json({
    helpers: [
      { name: 'formatDate', description: 'Format a date string', syntax: "{{formatDate date 'YYYY-MM-DD'}}" },
      { name: 'truncate', description: 'Truncate text to a given length', syntax: '{{truncate text 100}}' },
      { name: 'ifEquals', description: 'Conditionally render content if two values are equal', syntax: '{{#ifEquals a b}}equal{{else}}not equal{{/ifEquals}}' },
    ],
  })
}

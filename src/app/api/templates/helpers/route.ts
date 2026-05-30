import '@/lib/handlebars-helpers'

const helpers = [
  { name: 'formatDate', description: 'Format a date string', syntax: "{{formatDate date 'YYYY-MM-DD'}}" },
  { name: 'truncate', description: 'Truncate text to a given length', syntax: '{{truncate text 100}}' },
  { name: 'ifEquals', description: 'Conditionally render content if two values are equal', syntax: '{{#ifEquals a b}}equal{{else}}not equal{{/ifEquals}}' },
  { name: 'sortBy', description: 'Sort array ascending by field', syntax: '{{#each (sortBy items "name")}}...{{/each}}' },
  { name: 'sortByDesc', description: 'Sort array descending by field', syntax: '{{#each (sortByDesc items "name")}}...{{/each}}' },
  { name: 'filterBy', description: 'Filter array by matching field value', syntax: '{{#each (filterBy items "active" "yes")}}...{{/each}}' },
  { name: 'filterNot', description: 'Exclude items matching field value', syntax: '{{#each (filterNot items "status" "archived")}}...{{/each}}' },
  { name: 'groupBy', description: 'Group array by field into {key, items}[]', syntax: '{{#each (groupBy items "type")}}{{key}}: {{#each items}}...{{/each}}{{/each}}' },
  { name: 'first', description: 'Return first n items', syntax: '{{#each (first items 3)}}...{{/each}}' },
  { name: 'last', description: 'Return last n items', syntax: '{{#each (last items 3)}}...{{/each}}' },
  { name: 'slice', description: 'Slice array from start to end', syntax: '{{#each (slice items 0 5)}}...{{/each}}' },
  { name: 'pluck', description: 'Extract field values from array', syntax: '{{#each (pluck items "name")}}...{{/each}}' },
  { name: 'concat', description: 'Join string values', syntax: '{{concat "Hello" " " "World"}}' },
  { name: 'lower', description: 'Convert to lowercase', syntax: '{{lower title}}' },
  { name: 'upper', description: 'Convert to uppercase', syntax: '{{upper title}}' },
  { name: 'defaultStr', description: 'Return fallback if value is empty/null', syntax: '{{defaultStr title "Untitled"}}' },
  { name: 'eq', description: 'Equality comparison (===)', syntax: '{{#if (eq status "active")}}...{{/if}}' },
  { name: 'gt', description: 'Greater than comparison', syntax: '{{#if (gt count 5)}}...{{/if}}' },
  { name: 'gte', description: 'Greater than or equal comparison', syntax: '{{#if (gte count 5)}}...{{/if}}' },
  { name: 'lt', description: 'Less than comparison', syntax: '{{#if (lt count 5)}}...{{/if}}' },
  { name: 'lte', description: 'Less than or equal comparison', syntax: '{{#if (lte count 5)}}...{{/if}}' },
  { name: 'and', description: 'Logical AND', syntax: '{{#if (and a b)}}...{{/if}}' },
  { name: 'or', description: 'Logical OR', syntax: '{{#if (or a b)}}...{{/if}}' },
  { name: 'not', description: 'Logical NOT', syntax: '{{#if (not active)}}...{{/if}}' },
]

export async function GET() {
  return Response.json({ helpers })
}

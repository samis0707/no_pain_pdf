import Handlebars from 'handlebars'

export function extractTemplateVariables(template: string): string[] {
  if (!template) return []

  let ast: any
  try {
    ast = Handlebars.parse(template)
  } catch {
    return []
  }

  const vars = new Set<string>()

  function addPath(path: any) {
    if (!path || typeof path !== 'object') return
    if (path.type === 'PathExpression') {
      const name = path.original || path.parts?.join('.')
      if (name) vars.add(name)
    } else if (path.type === 'SubExpression') {
      addParams(path.params)
    }
  }

  function addParams(params: any[] | undefined | null) {
    if (!params) return
    for (const p of params) {
      if (p?.type === 'PathExpression') addPath(p)
      else if (p?.type === 'SubExpression') addParams(p.params)
    }
  }

  function walk(node: any) {
    if (!node || typeof node !== 'object') return

    switch (node.type) {
      case 'MustacheStatement':
        if (node.params && node.params.length > 0) {
          addParams(node.params)
        } else {
          addPath(node.path)
        }
        break
      case 'BlockStatement':
        addParams(node.params)
        if (node.program) walk(node.program)
        if (node.inverse) walk(node.inverse)
        break
      case 'Program':
        if (Array.isArray(node.body)) node.body.forEach(walk)
        break
      case 'ContentStatement':
      case 'CommentStatement':
      case 'PartialStatement':
      case 'PartialBlockStatement':
        break
      default:
        if (Array.isArray(node.body)) node.body.forEach(walk)
        break
    }
  }

  walk(ast)
  return [...vars]
}

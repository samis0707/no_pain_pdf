import Handlebars from 'handlebars'

/**
 * Intermediate representation between Handlebars templates and the GrapeJS
 * component tree. Built from the official Handlebars AST (no regex parsing);
 * serialization is canonical and round-trip-identical for templates written
 * in canonical form ({{var}}, {{#helper args}}…{{/helper}}).
 */
export type HbsNode =
  | { kind: 'content'; value: string }
  | { kind: 'variable'; path: string; escaped: boolean }
  | {
      kind: 'block'
      helper: string
      params: string[]
      children: HbsNode[]
      inverse?: HbsNode[]
    }

type AstNode = hbs.AST.Statement

function paramToString(node: hbs.AST.Expression): string {
  switch (node.type) {
    case 'PathExpression':
      return (node as hbs.AST.PathExpression).original
    case 'StringLiteral':
      return `"${(node as hbs.AST.StringLiteral).value.replace(/"/g, '\\"')}"`
    case 'NumberLiteral':
      return String((node as hbs.AST.NumberLiteral).value)
    case 'BooleanLiteral':
      return String((node as hbs.AST.BooleanLiteral).value)
    case 'UndefinedLiteral':
      return 'undefined'
    case 'NullLiteral':
      return 'null'
    case 'SubExpression': {
      const sub = node as hbs.AST.SubExpression
      const parts = [sub.path.original, ...sub.params.map(paramToString)]
      return `(${parts.join(' ')})`
    }
    default:
      throw new Error(`Unsupported Handlebars expression: ${node.type}`)
  }
}

function convertStatement(node: AstNode): HbsNode {
  switch (node.type) {
    case 'ContentStatement': {
      const content = node as hbs.AST.ContentStatement
      return { kind: 'content', value: content.original ?? content.value }
    }
    case 'MustacheStatement': {
      const mustache = node as hbs.AST.MustacheStatement
      const parts = [
        (mustache.path as hbs.AST.PathExpression).original,
        ...mustache.params.map(paramToString),
      ]
      return {
        kind: 'variable',
        path: parts.join(' '),
        escaped: mustache.escaped,
      }
    }
    case 'BlockStatement': {
      const block = node as hbs.AST.BlockStatement
      const result: HbsNode = {
        kind: 'block',
        helper: (block.path as hbs.AST.PathExpression).original,
        params: block.params.map(paramToString),
        children: block.program ? block.program.body.map(convertStatement) : [],
      }
      if (block.inverse) {
        result.inverse = block.inverse.body.map(convertStatement)
      }
      return result
    }
    case 'CommentStatement': {
      const comment = node as hbs.AST.CommentStatement
      return { kind: 'content', value: `{{!--${comment.value}--}}` }
    }
    default:
      throw new Error(`Unsupported Handlebars statement: ${node.type}`)
  }
}

export function parseHandlebars(template: string): HbsNode[] {
  const ast = Handlebars.parse(template)
  return ast.body.map(convertStatement)
}

function serializeNode(node: HbsNode): string {
  switch (node.kind) {
    case 'content':
      return node.value
    case 'variable':
      return node.escaped ? `{{${node.path}}}` : `{{{${node.path}}}}`
    case 'block': {
      const open = [node.helper, ...node.params].join(' ')
      const children = node.children.map(serializeNode).join('')
      const inverse =
        node.inverse !== undefined
          ? `{{else}}${node.inverse.map(serializeNode).join('')}`
          : ''
      return `{{#${open}}}${children}${inverse}{{/${node.helper}}}`
    }
  }
}

export function serializeHandlebars(nodes: HbsNode[]): string {
  return nodes.map(serializeNode).join('')
}

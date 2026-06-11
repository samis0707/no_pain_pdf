import { parseHandlebars, serializeHandlebars, type HbsNode } from './handlebars-ast'

/**
 * Bidirectional transform between Handlebars templates and the marked-up
 * HTML the GrapeJS canvas edits. Markers only WRAP mustaches — surrounding
 * HTML is never re-serialized, which keeps the reverse direction
 * byte-identical for untouched content.
 */

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function unescapeAttr(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}

function nodeToGrapes(node: HbsNode): string {
  switch (node.kind) {
    case 'content':
      return node.value
    case 'variable': {
      const mustache = node.escaped ? `{{${node.path}}}` : `{{{${node.path}}}}`
      return `<span data-hbs-var="${escapeAttr(node.path)}" data-hbs-escaped="${node.escaped}">${mustache}</span>`
    }
    case 'block': {
      const children = node.children.map(nodeToGrapes).join('')
      const inverse =
        node.inverse !== undefined
          ? `<div data-hbs-branch="else">${node.inverse.map(nodeToGrapes).join('')}</div>`
          : ''
      return `<div data-hbs-block="${escapeAttr(node.helper)}" data-hbs-params="${escapeAttr(node.params.join(' '))}">${children}${inverse}</div>`
    }
  }
}

export function hbsToGrapesHtml(template: string): string {
  return parseHandlebars(template).map(nodeToGrapes).join('')
}

const TOKEN_PATTERN =
  /<span data-hbs-var="[^"]*" data-hbs-escaped="(?:true|false)">([\s\S]*?)<\/span>|<div data-hbs-block="([^"]*)" data-hbs-params="([^"]*)">|<div data-hbs-branch="else">|<div\b|<\/div>/g

/**
 * Converts the GrapeJS marker HTML back to a Handlebars template. Marker
 * elements are replaced by their Handlebars equivalents; everything else
 * passes through untouched. Plain <div> nesting is tracked so each marker's
 * closing tag is identified correctly.
 */
export function grapesHtmlToHbs(html: string): string {
  let out = ''
  let lastIndex = 0
  let divDepth = 0
  // Marker elements currently open, with the div depth they opened at.
  const stack: Array<{ closeText: string; depth: number }> = []

  for (const match of html.matchAll(TOKEN_PATTERN)) {
    out += html.slice(lastIndex, match.index)
    lastIndex = match.index! + match[0].length

    const [token, varInner, blockHelper, blockParams] = match

    if (varInner !== undefined) {
      out += varInner
    } else if (blockHelper !== undefined) {
      const params = unescapeAttr(blockParams ?? '')
      const open = [unescapeAttr(blockHelper), ...(params ? [params] : [])].join(' ')
      out += `{{#${open}}}`
      divDepth++
      stack.push({ closeText: `{{/${unescapeAttr(blockHelper)}}}`, depth: divDepth })
    } else if (token.startsWith('<div data-hbs-branch')) {
      out += '{{else}}'
      divDepth++
      stack.push({ closeText: '', depth: divDepth })
    } else if (token === '</div>') {
      const top = stack[stack.length - 1]
      if (top && top.depth === divDepth) {
        out += top.closeText
        stack.pop()
      } else {
        out += token
      }
      divDepth--
    } else {
      // plain <div … from the template content
      out += token
      divDepth++
    }
  }

  out += html.slice(lastIndex)
  return out
}

export { parseHandlebars, serializeHandlebars }

import type { Editor } from 'grapesjs'

/**
 * GrapeJS plugin for Handlebars constructs. Templates enter the canvas via
 * hbsToGrapesHtml (marker elements) and leave via grapesHtmlToHbs; this
 * plugin makes the markers first-class editable components.
 */
export default function hbsPlugin(editor: Editor) {
  editor.Components.addType('hbs-variable', {
    isComponent: (el) =>
      el.getAttribute?.('data-hbs-var') != null ? { type: 'hbs-variable' } : false,
    model: {
      defaults: {
        name: 'Field',
        tagName: 'span',
        draggable: true,
        droppable: false,
        traits: [
          {
            type: 'text',
            name: 'data-hbs-var',
            label: 'Field',
            changeProp: false,
          },
        ],
      },
    },
  })

  editor.Components.addType('hbs-each', {
    isComponent: (el) =>
      el.getAttribute?.('data-hbs-block') === 'each' ? { type: 'hbs-each' } : false,
    model: {
      defaults: {
        name: 'Repeating Block',
        draggable: true,
        droppable: true,
        traits: [
          {
            type: 'text',
            name: 'data-hbs-params',
            label: 'Loop over',
          },
        ],
      },
    },
  })

  editor.Components.addType('hbs-if', {
    isComponent: (el) =>
      el.getAttribute?.('data-hbs-block') === 'if' ? { type: 'hbs-if' } : false,
    model: {
      defaults: {
        name: 'Conditional',
        draggable: true,
        droppable: true,
        traits: [
          {
            type: 'text',
            name: 'data-hbs-params',
            label: 'Condition',
          },
        ],
      },
    },
  })

  editor.Blocks.add('hbs-variable', {
    label: 'Field',
    category: 'Data',
    content:
      '<span data-hbs-var="field" data-hbs-escaped="true">{{field}}</span>',
  })

  editor.Blocks.add('hbs-each', {
    label: 'Repeating Block',
    category: 'Data',
    content:
      '<div data-hbs-block="each" data-hbs-params="rows"><p>Row content…</p></div>',
  })

  editor.Blocks.add('hbs-if', {
    label: 'Conditional',
    category: 'Data',
    content:
      '<div data-hbs-block="if" data-hbs-params="condition"><p>Shown when true…</p></div>',
  })
}

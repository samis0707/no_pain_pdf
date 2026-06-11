import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import {
  getTemplate,
  updateTemplate,
  updateTemplateHtml,
  getDataInfo,
  analyzeData,
  renderPreview,
  getAssets,
  registerHelper,
  getData,
  updateData,
  getHelpers,
  getPageFormats,
  updatePageFormat,
  updateExportSettings,
  generatePdf,
  listTemplatesTool,
  applyTemplateTool,
  saveAsTemplateTool,
} from './tools'

/**
 * AI SDK wrappers around the legacy tool implementations in tools.ts —
 * the implementations stay byte-identical; only the declaration format
 * changes (zod schemas + tool()).
 */
export function buildSdkTools(itemId: string): ToolSet {
  return {
    get_template: tool({
      description: 'Get the current template HTML, CSS, name and page format',
      inputSchema: z.object({}),
      execute: () => getTemplate(itemId),
    }),

    update_template: tool({
      description:
        'Update the template HTML and/or CSS. The previous state is snapshotted and can be rolled back. An automatic preview render follows so you can verify the result.',
      inputSchema: z.object({
        html: z.string().optional().describe('Full new HTML body of the template'),
        css: z.string().optional().describe('Full new CSS of the template'),
      }),
      execute: ({ html, css }) => updateTemplate(itemId, html, css),
    }),

    update_template_html: tool({
      description: 'Update ONLY the template HTML, leaving the CSS untouched',
      inputSchema: z.object({
        html: z.string().describe('Full new HTML body of the template'),
      }),
      execute: ({ html }) => updateTemplateHtml(itemId, html),
    }),

    get_data_info: tool({
      description: 'Get dataset columns, row count and sample rows',
      inputSchema: z.object({}),
      execute: () => getDataInfo(itemId),
    }),

    analyze_data: tool({
      description: 'Deep data analysis: duplicates, null values, suggestions',
      inputSchema: z.object({}),
      execute: () => analyzeData(itemId),
    }),

    render_preview: tool({
      description:
        'Render the template with current data through the PDF pipeline and return images of the rendered pages so you can visually inspect the result',
      inputSchema: z.object({}),
      execute: () => renderPreview(itemId),
      toModelOutput: ({ output }) => {
        const { images, ...summary } = output as {
          images: Array<{ mimeType: string; data: string }>
          pageCount: number
          truncated: boolean
        }
        return {
          type: 'content',
          value: [
            { type: 'text' as const, text: JSON.stringify(summary) },
            ...images.map((img) => ({
              type: 'media' as const,
              mediaType: img.mimeType,
              data: img.data,
            })),
          ],
        }
      },
    }),

    get_assets: tool({
      description: 'List uploaded images for this item with their URLs',
      inputSchema: z.object({}),
      execute: () => getAssets(itemId),
    }),

    register_helper: tool({
      description:
        'Create a custom Handlebars helper usable immediately in the template',
      inputSchema: z.object({
        name: z.string().describe('Helper name, e.g. formatPhone'),
        params: z.array(z.string()).describe('Parameter names'),
        body: z.string().describe('JavaScript function body returning the result'),
      }),
      execute: ({ name, params, body }) => registerHelper(itemId, name, params, body),
    }),

    get_data: tool({
      description: 'Return the full dataset (columns and all rows)',
      inputSchema: z.object({}),
      execute: () => getData(itemId),
    }),

    update_data: tool({
      description: 'Replace the dataset rows with transformed rows',
      inputSchema: z.object({
        rows: z.array(z.record(z.string(), z.unknown())).describe('The new rows'),
      }),
      execute: ({ rows }) => updateData(itemId, rows),
    }),

    get_helpers: tool({
      description: 'List all available Handlebars helpers with signatures',
      inputSchema: z.object({}),
      execute: () => getHelpers(itemId),
    }),

    get_page_formats: tool({
      description: 'List available page formats and the current selection',
      inputSchema: z.object({}),
      execute: () => getPageFormats(itemId),
    }),

    update_page_format: tool({
      description:
        'Change the page format and/or CSS. Snapshotted and rollbackable; auto-previewed.',
      inputSchema: z.object({
        pageFormatId: z.number().nullable().optional().describe('Page format id, or null to clear'),
        css: z.string().optional().describe('Updated CSS for the new format'),
      }),
      execute: ({ pageFormatId, css }) => updatePageFormat(itemId, pageFormatId, css),
    }),

    update_export_settings: tool({
      description:
        'Set bleed (0-5mm), crop marks, and/or color mode (rgb | cmyk) for PDF export',
      inputSchema: z.object({
        bleed: z.number().min(0).max(5).optional(),
        cropMarks: z.boolean().optional(),
        colorMode: z.enum(['rgb', 'cmyk']).optional(),
      }),
      execute: ({ bleed, cropMarks, colorMode }) =>
        updateExportSettings(itemId, bleed, cropMarks, colorMode),
    }),

    export_pdf: tool({
      description:
        'Generate a PDF with the current template, data, and export settings. The PDF downloads automatically.',
      inputSchema: z.object({
        filename: z.string().optional().describe('Optional custom filename'),
      }),
      execute: () => generatePdf(itemId),
    }),

    list_templates: tool({
      description:
        "List available design templates: global presets, the user's own saved templates (corporate identity), and templates of the current project",
      inputSchema: z.object({}),
      execute: () => listTemplatesTool(itemId),
    }),

    apply_template: tool({
      description:
        "Apply a template's HTML and CSS to the current item to fit content into an existing styling. Snapshotted and rollbackable; re-insert the user's content afterwards.",
      inputSchema: z.object({
        templateId: z.number().describe('ID of the template to apply (from list_templates)'),
      }),
      execute: ({ templateId }) => applyTemplateTool(itemId, templateId),
    }),

    save_as_template: tool({
      description:
        'Save the current item design as a reusable template for future items',
      inputSchema: z.object({
        name: z.string().describe('Template name, e.g. "ACME letterhead"'),
        scope: z.enum(['user', 'project']).describe('Visibility scope'),
      }),
      execute: ({ name, scope }) => saveAsTemplateTool(itemId, name, scope),
    }),
  }
}

/** Tools whose success changes the rendered document (used for auto-preview). */
export const SDK_MUTATOR_TOOLS = new Set([
  'update_template',
  'update_template_html',
  'update_page_format',
  'apply_template',
])

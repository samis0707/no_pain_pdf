import { prisma } from '@/lib/prisma'
import { snapshotItem } from '@/lib/versioning'

export interface TemplateScopeInput {
  name: string
  scope: 'user' | 'project'
  userId: number
  category?: string
}

function parseItemId(itemId: string): number {
  const id = parseInt(itemId)
  if (isNaN(id)) throw new Error(`Invalid item ID: ${itemId}`)
  return id
}

/**
 * Templates visible to a user: global presets (no owner), the user's own
 * templates, and — when a project is given — that project's templates.
 */
export async function listTemplates(userId: number, projectId?: number) {
  const scopes: Array<Record<string, unknown>> = [
    { userId: null, projectId: null },
    { userId },
  ]
  if (projectId !== undefined) {
    scopes.push({ projectId })
  }
  return prisma.printTemplate.findMany({
    where: { OR: scopes },
    orderBy: [{ projectId: 'desc' }, { userId: 'desc' }, { name: 'asc' }],
  })
}

/**
 * Copies a template's html/css onto the item so new content can be fitted
 * into an existing styling (corporate identity). Snapshots the item first
 * so the change is rollbackable.
 */
export async function applyTemplateToItem(itemId: string, templateId: number) {
  const id = parseItemId(itemId)

  const [item, template] = await Promise.all([
    prisma.printItem.findUnique({ where: { id } }),
    prisma.printTemplate.findUnique({ where: { id: templateId } }),
  ])
  if (!item) throw new Error(`Item not found: ${itemId}`)
  if (!template) throw new Error(`Template not found: ${templateId}`)

  await snapshotItem(itemId)

  const updated = await prisma.printItem.update({
    where: { id },
    data: {
      html: template.html,
      css: template.css,
      templateId: template.id,
      version: item.version + 1,
    },
  })

  return {
    id: updated.id,
    html: updated.html ?? '',
    css: updated.css ?? '',
    templateId: updated.templateId,
    version: updated.version,
  }
}

/**
 * Captures the item's current design as a reusable template, scoped to the
 * user (cross-project corporate identity) or to the item's project.
 */
export async function saveItemAsTemplate(itemId: string, input: TemplateScopeInput) {
  const id = parseItemId(itemId)
  const item = await prisma.printItem.findUnique({
    where: { id },
    include: { project: true },
  })
  if (!item) throw new Error(`Item not found: ${itemId}`)

  return prisma.printTemplate.create({
    data: {
      name: input.name,
      category: input.category ?? null,
      html: item.html ?? '',
      css: item.css ?? '',
      userId: input.userId,
      projectId: input.scope === 'project' ? item.projectId : null,
      sourceItemId: item.id,
    },
  })
}

export async function deleteTemplate(templateId: number) {
  const template = await prisma.printTemplate.findUnique({ where: { id: templateId } })
  if (!template) throw new Error(`Template not found: ${templateId}`)
  if (template.userId === null && template.projectId === null) {
    throw new Error('Global presets cannot be deleted')
  }
  return prisma.printTemplate.delete({ where: { id: templateId } })
}

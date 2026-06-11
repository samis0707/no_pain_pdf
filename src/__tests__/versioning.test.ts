import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockItemFindUnique,
  mockItemUpdate,
  mockVersionUpsert,
  mockVersionFindUnique,
  mockVersionFindMany,
} = vi.hoisted(() => ({
  mockItemFindUnique: vi.fn(),
  mockItemUpdate: vi.fn(),
  mockVersionUpsert: vi.fn(),
  mockVersionFindUnique: vi.fn(),
  mockVersionFindMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    printItem: {
      findUnique: mockItemFindUnique,
      update: mockItemUpdate,
    },
    printItemVersion: {
      upsert: mockVersionUpsert,
      findUnique: mockVersionFindUnique,
      findMany: mockVersionFindMany,
    },
  },
}))

const ITEM = {
  id: 1,
  version: 3,
  html: '<h1>current</h1>',
  css: 'h1 { color: red }',
  miscText: '{"customHelpers":[]}',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockItemFindUnique.mockResolvedValue(ITEM)
  mockItemUpdate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    ...ITEM,
    ...data,
  }))
  mockVersionUpsert.mockResolvedValue({})
})

describe('snapshotItem', () => {
  it('persists the CURRENT state under the current version number', async () => {
    const { snapshotItem } = await import('@/lib/versioning')

    await snapshotItem('1')

    expect(mockVersionUpsert).toHaveBeenCalledTimes(1)
    const arg = mockVersionUpsert.mock.calls[0][0]
    expect(arg.where).toEqual({
      printItemId_version: { printItemId: 1, version: 3 },
    })
    expect(arg.create).toMatchObject({
      printItemId: 1,
      version: 3,
      html: '<h1>current</h1>',
      css: 'h1 { color: red }',
      miscText: '{"customHelpers":[]}',
    })
  })

  it('throws for a missing item', async () => {
    const { snapshotItem } = await import('@/lib/versioning')
    mockItemFindUnique.mockResolvedValue(null)

    await expect(snapshotItem('99')).rejects.toThrow(/not found/i)
  })
})

describe('rollbackItem', () => {
  it('restores html, css and miscText from the requested snapshot and sets the version', async () => {
    const { rollbackItem } = await import('@/lib/versioning')
    mockVersionFindUnique.mockResolvedValue({
      printItemId: 1,
      version: 2,
      html: '<h1>old</h1>',
      css: 'h1 { color: blue }',
      miscText: '{}',
    })

    const restored = await rollbackItem('1', 2)

    expect(mockVersionFindUnique).toHaveBeenCalledWith({
      where: { printItemId_version: { printItemId: 1, version: 2 } },
    })
    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        html: '<h1>old</h1>',
        css: 'h1 { color: blue }',
        miscText: '{}',
        version: 2,
      },
    })
    expect(restored).toMatchObject({ html: '<h1>old</h1>', version: 2 })
  })

  it('rolls back to the most recent snapshot when no version is given (undo)', async () => {
    const { rollbackItem } = await import('@/lib/versioning')
    mockVersionFindMany.mockResolvedValue([
      { printItemId: 1, version: 2, html: '<h1>v2</h1>', css: '', miscText: '{}' },
    ])

    await rollbackItem('1')

    expect(mockVersionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { printItemId: 1 },
        orderBy: { version: 'desc' },
        take: 1,
      })
    )
    expect(mockItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ html: '<h1>v2</h1>', version: 2 }),
      })
    )
  })

  it('throws VersionNotFoundError for a missing snapshot', async () => {
    const { rollbackItem, VersionNotFoundError } = await import('@/lib/versioning')
    mockVersionFindUnique.mockResolvedValue(null)

    await expect(rollbackItem('1', 7)).rejects.toBeInstanceOf(VersionNotFoundError)
  })

  it('throws VersionNotFoundError when undo has no snapshots at all', async () => {
    const { rollbackItem, VersionNotFoundError } = await import('@/lib/versioning')
    mockVersionFindMany.mockResolvedValue([])

    await expect(rollbackItem('1')).rejects.toBeInstanceOf(VersionNotFoundError)
  })
})

describe('listVersions', () => {
  it('returns snapshots newest-first without their html/css payloads', async () => {
    const { listVersions } = await import('@/lib/versioning')
    mockVersionFindMany.mockResolvedValue([
      { version: 3, createdAt: new Date('2026-06-11T10:00:00Z') },
      { version: 2, createdAt: new Date('2026-06-11T09:00:00Z') },
    ])

    const versions = await listVersions('1')

    expect(mockVersionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { printItemId: 1 },
        orderBy: { version: 'desc' },
        select: { version: true, createdAt: true },
      })
    )
    expect(versions).toHaveLength(2)
    expect(versions[0].version).toBe(3)
  })
})

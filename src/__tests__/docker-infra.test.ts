import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import path from 'path'
import { readFileSync } from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const yaml = require('js-yaml') as { load: (input: string) => unknown }

const projectRoot = path.resolve(import.meta.dirname, '../..')

function readYaml(filePath: string): Record<string, unknown> {
  const content = readFileSync(filePath, 'utf-8')
  return yaml.load(content) as Record<string, unknown>
}

describe('Docker Compose infrastructure', () => {
  it('docker-compose.yml exists at project root', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    expect(existsSync(composePath)).toBe(true)
  })

  it('docker-compose.yml is valid YAML', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath)
    expect(config).toBeDefined()
    expect(typeof config).toBe('object')
  })

  it('defines all required services', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as { services: Record<string, unknown> }
    const expected = ['nextjs', 'weasyprint', 'ghostscript', 'minio', 'postgres']
    for (const name of expected) {
      expect(config.services).toHaveProperty(name)
    }
  })

  it('weasyprint service exposes port 3001', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { ports?: string[] }>
    }
    const ports = config.services.weasyprint.ports ?? []
    const match = ports.some((p: string) => p.includes('3001'))
    expect(match).toBe(true)
  })

  it('ghostscript service exposes port 3002', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { ports?: string[] }>
    }
    const ports = config.services.ghostscript.ports ?? []
    const match = ports.some((p: string) => p.includes('3002'))
    expect(match).toBe(true)
  })

  it('postgres service has a health check', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { healthcheck?: Record<string, unknown> }>
    }
    expect(config.services.postgres.healthcheck).toBeDefined()
  })

  it('minio service has a health check', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { healthcheck?: Record<string, unknown> }>
    }
    expect(config.services.minio.healthcheck).toBeDefined()
  })

  it('nextjs service depends on postgres, minio, and weasyprint', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { depends_on?: Record<string, unknown> | string[] }>
    }
    const deps = config.services.nextjs.depends_on ?? {}
    const depNames = Array.isArray(deps) ? deps : Object.keys(deps)
    expect(depNames).toContain('postgres')
    expect(depNames).toContain('minio')
    expect(depNames).toContain('weasyprint')
  })

  it('has createbuckets init container for MinIO', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, unknown>
    }
    expect(config.services).toHaveProperty('createbuckets')
  })

  it('uses postgresql DATABASE_URL for nextjs', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { environment?: Record<string, string> }>
    }
    const dbUrl = config.services.nextjs.environment?.DATABASE_URL ?? ''
    expect(dbUrl).toMatch(/^postgresql:\/\//)
  })
})

describe('Next.js Dockerfile', () => {
  it('Dockerfile exists at project root', () => {
    const dockerfilePath = path.join(projectRoot, 'Dockerfile')
    expect(existsSync(dockerfilePath)).toBe(true)
  })

  it('uses multi-stage build pattern', () => {
    const dockerfilePath = path.join(projectRoot, 'Dockerfile')
    const content = readFileSync(dockerfilePath, 'utf-8')
    const stageCount = (content.match(/^FROM /gm) || []).length
    expect(stageCount).toBeGreaterThan(1)
  })

  it('sets output standalone via next.config.ts or Dockerfile args', () => {
    const nextConfigPath = path.join(projectRoot, 'next.config.ts')
    const configContent = readFileSync(nextConfigPath, 'utf-8')
    const dockerfilePath = path.join(projectRoot, 'Dockerfile')
    const dockerContent = readFileSync(dockerfilePath, 'utf-8')
    const hasStandalone =
      configContent.includes("output: 'standalone'") ||
      configContent.includes('output: "standalone"') ||
      dockerContent.includes('.next/standalone') ||
      dockerContent.includes('NEXT_OUTPUT') ||
      dockerContent.includes('standalone')
    expect(hasStandalone).toBe(true)
  })

  it('no longer copies better-sqlite3 native module', () => {
    const dockerfilePath = path.join(projectRoot, 'Dockerfile')
    const content = readFileSync(dockerfilePath, 'utf-8')
    expect(content).not.toContain('better-sqlite3')
  })
})

describe('Ghostscript service', () => {
  it('Dockerfile exists in gs-service/', () => {
    const dockerfilePath = path.join(projectRoot, 'gs-service', 'Dockerfile')
    expect(existsSync(dockerfilePath)).toBe(true)
  })

  it('installs ghostscript system package', () => {
    const dockerfilePath = path.join(projectRoot, 'gs-service', 'Dockerfile')
    const content = readFileSync(dockerfilePath, 'utf-8').toLowerCase()
    expect(content).toContain('ghostscript')
  })

  it('exposes port 3002 in Dockerfile', () => {
    const dockerfilePath = path.join(projectRoot, 'gs-service', 'Dockerfile')
    const content = readFileSync(dockerfilePath, 'utf-8')
    expect(content).toContain('3002')
  })

  it('has a main.py with /convert endpoint', () => {
    const mainPy = path.join(projectRoot, 'gs-service', 'app', 'main.py')
    expect(existsSync(mainPy)).toBe(true)
    const content = readFileSync(mainPy, 'utf-8')
    expect(content).toContain('/convert')
  })
})

describe('WeasyPrint Dockerfile', () => {
  it('Dockerfile exists in pdf-service/', () => {
    const dockerfilePath = path.join(projectRoot, 'pdf-service', 'Dockerfile')
    expect(existsSync(dockerfilePath)).toBe(true)
  })

  it('installs system dependencies for WeasyPrint (Pango, Cairo, fontconfig)', () => {
    const dockerfilePath = path.join(projectRoot, 'pdf-service', 'Dockerfile')
    const content = readFileSync(dockerfilePath, 'utf-8').toLowerCase()
    const hasPango = content.includes('pango')
    const hasCairo = content.includes('cairo')
    const hasFontconfig = content.includes('fontconfig')
    expect(hasPango && hasCairo && hasFontconfig).toBe(true)
  })
})

describe('Environment configuration', () => {
  it('.env.example includes postgresql DATABASE_URL', () => {
    const envPath = path.join(projectRoot, '.env.example')
    const content = readFileSync(envPath, 'utf-8')
    expect(content).toMatch(/postgresql:\/\//)
  })

  it('.env.example includes Docker-related S3 variables', () => {
    const envPath = path.join(projectRoot, '.env.example')
    const content = readFileSync(envPath, 'utf-8')
    const required = [
      'S3_ENDPOINT',
      'S3_PORT',
      'S3_ACCESS_KEY',
      'S3_SECRET_KEY',
      'S3_BUCKET',
      'S3_REGION',
      'S3_FORCE_PATH_STYLE',
    ]
    for (const varName of required) {
      expect(content).toContain(varName)
    }
  })

  it('.env.example includes WEASYPRINT_URL and GHOSTSCRIPT_URL', () => {
    const envPath = path.join(projectRoot, '.env.example')
    const content = readFileSync(envPath, 'utf-8')
    expect(content).toContain('WEASYPRINT_URL')
    expect(content).toContain('GHOSTSCRIPT_URL')
  })
})

describe('Prisma schema uses postgresql', () => {
  it('schema.prisma has provider = postgresql', () => {
    const schemaPath = path.join(projectRoot, 'prisma', 'schema.prisma')
    const content = readFileSync(schemaPath, 'utf-8')
    expect(content).toContain('provider = "postgresql"')
  })

  it('lib/prisma.ts uses PrismaPg adapter for PostgreSQL', () => {
    const prismaLib = path.join(projectRoot, 'src', 'lib', 'prisma.ts')
    const content = readFileSync(prismaLib, 'utf-8')
    expect(content).toContain('PrismaPg')
    expect(content).toContain('PrismaClient')
    expect(content).not.toContain('better-sqlite3')
  })
})

describe('docker-entrypoint.sh', () => {
  it('does not redirect stderr to stdout', () => {
    const entrypointPath = path.join(projectRoot, 'docker-entrypoint.sh')
    const content = readFileSync(entrypointPath, 'utf-8')
    expect(content).not.toContain('2>&1')
  })
})

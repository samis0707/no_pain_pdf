import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import path from 'path'
import { readFileSync } from 'fs'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
// js-yaml has no types, but it's widely used and stable
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
    const expected = ['nextjs', 'weasyprint', 'postgres', 'minio', 'ghostscript']
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

  it('minio service has a health check', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { healthcheck?: Record<string, unknown> }>
    }
    expect(config.services.minio.healthcheck).toBeDefined()
  })

  it('postgres service has a health check', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { healthcheck?: Record<string, unknown> }>
    }
    expect(config.services.postgres.healthcheck).toBeDefined()
  })

  it('nextjs service depends on postgres and minio', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, { depends_on?: Record<string, unknown> | string[] }>
    }
    const deps = config.services.nextjs.depends_on ?? {}
    const depNames = Array.isArray(deps) ? deps : Object.keys(deps)
    expect(depNames).toContain('postgres')
    expect(depNames).toContain('minio')
  })

  it('has createbuckets init container for MinIO', () => {
    const composePath = path.join(projectRoot, 'docker-compose.yml')
    const config = readYaml(composePath) as {
      services: Record<string, unknown>
    }
    expect(config.services).toHaveProperty('createbuckets')
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

  it('.env.example includes WEASYPRINT_URL', () => {
    const envPath = path.join(projectRoot, '.env.example')
    const content = readFileSync(envPath, 'utf-8')
    expect(content).toContain('WEASYPRINT_URL')
  })

  it('.env.example includes GHOSTSCRIPT_URL', () => {
    const envPath = path.join(projectRoot, '.env.example')
    const content = readFileSync(envPath, 'utf-8')
    expect(content).toContain('GHOSTSCRIPT_URL')
  })
})

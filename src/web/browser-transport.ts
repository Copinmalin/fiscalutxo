import { ZodError, z } from 'zod'
import { demoProject, emptyProject, importInputSchema, ingest, projectSchema } from '../mvp/project.js'
import { calculate } from '../mvp/tax.js'
import { exportReport } from '../mvp/export.js'

const exportSchema = z.object({ project: projectSchema, format: z.enum(['json', 'csv', 'xlsx']) })
const mimes = {
  json: 'application/json',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// GitHub Pages serves only the application assets. Requests from the UI run locally.
export async function request(path: string, data?: unknown) {
  try {
    if (data !== undefined && new TextEncoder().encode(JSON.stringify(data)).length > 24 * 1024 * 1024) {
      throw new Error('Dossier ou import supérieur à 24 Mio')
    }
    switch (path) {
      case 'new': return emptyProject()
      case 'demo': return demoProject()
      case 'import': return ingest(importInputSchema.parse(data))
      case 'check': {
        const project = projectSchema.parse(data)
        return { project, result: calculate(project) }
      }
      case 'export': {
        const { project, format } = exportSchema.parse(data)
        const result = calculate(project)
        if (!result.ready) throw new Error('Complétez le dossier avant l’export fiscal.')
        const report = exportReport(result, format)
        return new Blob([typeof report === 'string' ? report : new Uint8Array(report)], { type: mimes[format] })
      }
      default: throw new Error('Action inconnue')
    }
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues.slice(0, 6).map(issue => issue.code === 'custom' ? issue.message :
        issue.path.filter(key => typeof key === 'string').at(-1) ?? 'Dossier')
      throw new Error(['Données invalides', ...issues].join(' · '))
    }
    if (error instanceof SyntaxError) throw new Error('JSON invalide')
    throw error
  }
}

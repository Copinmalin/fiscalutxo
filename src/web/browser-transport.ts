import template3916 from './public/3916-2026.pdf'
import { export3916 } from '../mvp/pdf-3916.js'
import { ZodError, z } from 'zod'
import { demoProject, emptyProject, fiscalYearSchema, importInputSchema, ingest, projectSchema } from '../mvp/project.js'
import { calculate } from '../mvp/tax.js'
import { generateReport, reportFormats, reportMimeTypes } from '../mvp/export.js'

const exportSchema = z.object({ project: projectSchema, format: z.enum(reportFormats) })
// GitHub Pages serves only the application assets. Requests from the UI run locally.
export async function request(path: string, data?: unknown) {
  try {
    if (data !== undefined && new TextEncoder().encode(JSON.stringify(data)).length > 24 * 1024 * 1024) {
      throw new Error('Dossier ou import supérieur à 24 Mio')
    }
    switch (path) {
      case 'new': return emptyProject(fiscalYearSchema.optional().parse(data))
      case 'demo': return demoProject(fiscalYearSchema.optional().parse(data))
      case 'import': return ingest(importInputSchema.parse(data))
      case 'check': {
        const project = projectSchema.parse(data)
        return { project, result: calculate(project) }
      }
      case '3916': return new Blob([new Uint8Array(await export3916(template3916, data))], {type:'application/pdf'})
      case 'export': {
        const { project, format } = exportSchema.parse(data)
        const result = calculate(project)
        if (!result.ready) throw new Error('Complétez le dossier avant l’export fiscal.')
        const report = await generateReport(result, format)
        return new Blob([typeof report === 'string' ? report : new Uint8Array(report)], { type: reportMimeTypes[format] })
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

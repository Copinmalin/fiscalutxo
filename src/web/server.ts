import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { calculate } from '../mvp/tax.js'
import { generateReport, reportFormats, reportMimeTypes } from '../mvp/export.js'
import { demoProject, emptyProject, fiscalYearSchema, importInputSchema, ingest, projectSchema } from '../mvp/project.js'

const assets = {
  '/': ['./public/index.html', 'text/html; charset=utf-8'],
  '/app.js': ['./public/app.js', 'text/javascript; charset=utf-8'],
  '/period.js': ['../mvp/period.js', 'text/javascript; charset=utf-8'],
  '/transport.js': ['./public/transport.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['./public/style.css', 'text/css; charset=utf-8'],
} as const


const limit = 24 * 1024 * 1024

export function createLocalServer() {
  const server = createServer(async (request, response) => {
    const address = server.address()
    const host = typeof address === 'object' && address && '127.0.0.1:' + address.port
    headers(response)
    if (!host || request.headers.host !== host) return json(response, 403, { error: 'Adresse locale requise' })
    const path = request.url ?? ''
    if (request.method === 'GET' && Object.hasOwn(assets, path)) {
      const [file, mime] = assets[path as keyof typeof assets]
      try {
        const content = await readFile(new URL(file, import.meta.url))
        response.writeHead(200, { 'Content-Type': mime }).end(content)
      } catch {
        json(response, 500, { error: 'Ressource locale indisponible' })
      }
      return
    }
    const [route, query] = path.split('?')
    if (request.method === 'GET' && (route === '/api/new' || route === '/api/demo')) {
      const year = new URLSearchParams(query).get('year')
      const parsed = fiscalYearSchema.optional().safeParse(year === null ? undefined : Number(year))
      if (!parsed.success) return json(response, 422, { error: 'Année des opérations invalide' })
      return json(response, 200, route === '/api/new' ? emptyProject(parsed.data) : demoProject(parsed.data))
    }
    if (request.method !== 'POST' || !['/api/import', '/api/check', '/api/export'].includes(path)) {
      return json(response, 404, { error: 'Route inconnue' })
    }
    if (request.headers.origin !== 'http://' + host ||
        request.headers['content-type']?.split(';')[0] !== 'application/json') {
      return json(response, 403, { error: 'Origine locale et JSON requis' })
    }
    try {
      const input = await readJson(request)
      if (path === '/api/import') return json(response, 200, ingest(importInputSchema.parse(input)))
      if (path === '/api/check') {
        const project = projectSchema.parse(input)
        return json(response, 200, { project, result: calculate(project) })
      }
      const { project, format } = z.object({
        project: projectSchema, format: z.enum(reportFormats),
      }).parse(input)
      const result = calculate(project)
      if (!result.ready) return json(response, 409, { error: 'Complétez le dossier avant l’export fiscal.' })
      const report = await generateReport(result, format)
      const filename = format === 'pdf' ? 'fiscalutxo-aide-2086-' + (result.year + 1) + '.pdf' : 'fiscalutxo-' + result.year + '.' + format
      response.writeHead(200, {
        'Content-Type': reportMimeTypes[format], 'Content-Disposition': 'attachment; filename="' + filename + '"',
      }).end(report)
    } catch (error) {
      if (error instanceof RangeError) return json(response, 413, { error: 'Dossier ou import supérieur à 24 Mio' })
      if (error instanceof z.ZodError) {
        return json(response, 422, { error: 'Données invalides', issues: error.issues.slice(0, 6).map(issue =>
          issue.code === 'custom' ? issue.message : issue.path.filter(key => typeof key === 'string').at(-1) ?? 'Dossier') })
      }
      if (error instanceof SyntaxError) return json(response, 400, { error: 'JSON invalide' })
      return json(response, 500, { error: 'Traitement local impossible' })
    }
  })
  return server
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.from(chunk)
    size += buffer.length
    if (size > limit) {
      request.resume()
      throw new RangeError()
    }
    chunks.push(buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function headers(response: ServerResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; " +
    "base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('X-Content-Type-Options', 'nosniff')
}

function json(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify(value))
}

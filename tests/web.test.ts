import { afterEach, describe, expect, it } from 'vitest'
import { once } from 'node:events'
import { PDFDocument } from 'pdf-lib'
import { demoProject, emptyProject } from '../src/mvp/project.js'
import { request as browserRequest } from '../src/web/browser-transport.js'
import { createLocalServer } from '../src/web/server.js'

it('calcule et exporte l’exemple statique sans serveur', async () => {
  const project = await browserRequest('demo')
  expect(await browserRequest('check', project)).toMatchObject({
    result: { year: 2025, ready: true, report: { '3AN': 75_000 } },
  })
  expect(await browserRequest('demo', 2026)).toEqual(demoProject(2026))
  const report = await browserRequest('export', { project, format: 'xlsx' })
  expect(report).toBeInstanceOf(Blob)
  if (report instanceof Blob) {
    expect(new Uint8Array(await report.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([80, 75]))
  }
  const pdf = await browserRequest('export', { project, format: 'pdf' })
  expect(pdf).toBeInstanceOf(Blob)
  if (pdf instanceof Blob) {
    expect(pdf.type).toBe('application/pdf')
    expect((await PDFDocument.load(await pdf.arrayBuffer())).getPageCount()).toBe(1)
  }
  await expect(browserRequest('export', { project: emptyProject(), format: 'csv' })).rejects.toThrow('Complétez le dossier')
})

describe('serveur local', () => {
  const server = createLocalServer()
  afterEach(async () => {
    server.close()
    await once(server, 'close')
  })

  it('refuse les origines étrangères et sert la page, les exports et les blocages', async () => {
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Adresse locale manquante')
    const base = 'http://127.0.0.1:' + address.port
    const page = await fetch(base)
    expect(page.status).toBe(200)
    expect(page.headers.get('cache-control')).toBe('no-store')
    expect(await page.text()).toContain('Dossier Bitcoin')
    expect(await (await fetch(base + '/api/new')).json()).toMatchObject({ year: 2025 })
    expect(await (await fetch(base + '/api/demo?year=2026')).json()).toEqual(demoProject(2026))
    expect((await fetch(base + '/api/new?year=2024')).status).toBe(422)
    const request = (path: string, data: object, origin = base) => fetch(base + '/api/' + path, {
      method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    expect((await request('check', {}, 'https://example.test')).status).toBe(403)
    expect((await request('check', {})).status).toBe(422)
    expect((await request('export', { project: emptyProject(), format: 'xlsx' })).status).toBe(409)
    const exportResponse = await request('export', { project: { ...emptyProject(), complete: true, accountsReviewed: true }, format: 'xlsx' })
    expect(exportResponse.status).toBe(200)
    expect(new Uint8Array(await exportResponse.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([80, 75]))
    const pdfResponse = await request('export', { project: demoProject(), format: 'pdf' })
    expect(pdfResponse.status).toBe(200)
    expect(pdfResponse.headers.get('content-type')).toBe('application/pdf')
    expect(pdfResponse.headers.get('content-disposition')).toContain('fiscalutxo-aide-2086-2026.pdf')
    expect((await PDFDocument.load(await pdfResponse.arrayBuffer())).getPageCount()).toBe(1)
  })
})

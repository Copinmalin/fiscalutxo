import { afterEach, describe, expect, it } from 'vitest'
import { once } from 'node:events'
import { emptyProject } from '../src/mvp/project.js'
import { createLocalServer } from '../src/web/server.js'

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
    const request = (path: string, data: object, origin = base) => fetch(base + '/api/' + path, {
      method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    })
    expect((await request('check', {}, 'https://example.test')).status).toBe(403)
    expect((await request('check', {})).status).toBe(422)
    expect((await request('export', { project: emptyProject(), format: 'xlsx' })).status).toBe(409)
    const exportResponse = await request('export', { project: { ...emptyProject(), complete: true, accountsReviewed: true }, format: 'xlsx' })
    expect(exportResponse.status).toBe(200)
    expect(new Uint8Array(await exportResponse.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([80, 75]))
  })
})

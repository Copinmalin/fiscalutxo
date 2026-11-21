import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { emptyProject, ingest, projectSchema, type Operation, type Project } from '../src/mvp/project.js'
import { calculate } from '../src/mvp/tax.js'
import { exportReport } from '../src/mvp/export.js'

const acquisition: Operation = {
  type: 'achat', date: '2026-01-12T12:00:00.000Z', sats: 1_000_000, gross: 100_000, reference: 'Achat fictif',
}
const sale: Operation = {
  type: 'vente', date: '2026-03-12T12:00:00.000Z', sats: 375_000,
  gross: 45_000, fee: 0, portfolio: 120_000, reference: 'Vente fictive', valuationReference: 'Cours fictif',
}
const finalSale: Operation = {
  ...sale, date: '2026-08-12T12:00:00.000Z', sats: 625_000, gross: 130_000, portfolio: 130_000,
}
const projectWith = (...operations: Operation[]): Project => ({
  ...emptyProject(), complete: true, accountsReviewed: true,
  operations: Object.fromEntries(operations.map((operation, index) => ['manual:' + index, operation])),
})

const sparrowHeader = 'Date (UTC),Label,Value (BTC),Balance (BTC),Fee (BTC),Txid\n'
const sourceFile = (project: Project, source: string, csv: string, format: 'sparrow' | 'generique' = 'sparrow') =>
  ingest({ project, source, format, name: 'fictif.csv', content: csv })

describe('calcul fiscal 2026', () => {
  it('reproduit les deux cessions de la notice 2086', () => {
    const result = calculate(projectWith(finalSale, acquisition, sale))
    expect(result.ready).toBe(true)
    expect(result.disposals.map(row => [row.fraction, row.gain])).toEqual([[37_500, 7_500], [62_500, 67_500]])
    expect(result.report['3AN']).toBe(75_000)
    expect(result.capitalRemaining).toBe(0)
  })

  it.each([[30_499, true], [30_500, true], [30_501, false]])('applique le seuil à %i centimes', (gross, exempt) => {
    const result = calculate(projectWith(acquisition, { ...sale, gross }))
    expect(result.ready).toBe(true)
    expect(result.exempt).toBe(exempt)
    expect(result.exempt ? result.report['3AN'] : result.totalGain).toBe(exempt ? null : 5_084)
    if (exempt) {
      const exported = JSON.parse(exportReport(result, 'json') as string)
      expect(exported.disposals[0]).toMatchObject({ gross })
      expect(exported.disposals[0].gain).toBeUndefined()
    }
  })

  it('déduit les frais du produit de cession et conserve le prix avant frais dans le quotient', () => {
    const result = calculate(projectWith(acquisition, { ...sale, fee: 1_000 }))
    expect(result.disposals[0]).toMatchObject({ net: 44_000, fraction: 37_500, gain: 6_500 })
  })

  it('repart de la fraction consommée avant l’année et compense les résultats annuels', () => {
    const project = projectWith(sale, { ...finalSale, gross: 24_000, portfolio: 24_000 })
    project.opening = { sats: 1_000_000, acquisitions: 110_000, used: 10_000, reference: 'Historique fictif' }
    const result = calculate(project)
    expect(result.ready).toBe(true)
    expect(result.disposals[0]).toMatchObject({ used: 10_000, gain: 7_500 })
    expect(result.report['3BN']).toBe(31_000)
  })

  it('bloque le résultat fiscal quand la valorisation manque', () => {
    const { portfolio: _, ...missing } = sale
    const result = calculate(projectWith(acquisition, missing))
    expect(result.ready).toBe(false)
    expect(result.report['3AN']).toBeNull()
    expect(() => exportReport(result, 'csv')).toThrow('Dossier à compléter')
  })

  it('ignore les lignes justifiées hors année selon la frontière locale', () => {
    const { project } = sourceFile(projectWith(acquisition), 'Wallet A',
      sparrowHeader + '2026-12-31 23:10:00,Après clôture,0.01000000,0.01000000,,fictif-post')
    const id = project.imports[0]!.rawRows[0]!.id
    project.operations[id] = {
      rowId: id, type: 'post_cloture', date: '2026-12-31T23:10:00Z', reference: 'Historique fictif',
    }
    expect(calculate(projectSchema.parse(project)).ready).toBe(true)
  })
})

describe('dossier local', () => {
  it('rapproche deux wallets et une plateforme sans compter le transfert ni un réimport', () => {
    const out = sparrowHeader + '2026-02-12 12:00:00,Transfert,-0.00100000,0.00900000,,fictif-transfert'
    const incoming = sparrowHeader + '2026-02-12 12:00:00,Transfert,0.00100000,0.00100000,,fictif-transfert'
    let { project } = sourceFile(projectWith(), 'Wallet A', out)
    ;({ project } = sourceFile(project, 'Wallet B', incoming))
    ;({ project } = sourceFile(project, 'Plateforme fictive',
      'date_utc,type,sats,prix_eur,frais_eur,portefeuille_eur,justificatif,valorisation,txid\n' +
      '2026-01-12T12:00:00Z,achat,1000000,1000,,,Achat fictif,,\n' +
      '2026-03-12T12:00:00Z,vente,375000,450,0,1200,Vente fictive,Cours fictif,', 'generique'))
    const [walletA, walletB, platform] = project.imports
    const sourceA = walletA!.rawRows[0]!.id
    const sourceB = walletB!.rawRows[0]!.id
    const buyId = platform!.rawRows[0]!.id
    const sellId = platform!.rawRows[1]!.id
    const transfer: Operation = { type: 'transfert', date: '2026-02-12T12:00:00.000Z', sats: 100_000, reference: 'Transfert fictif' }
    project.operations = {
      [sourceA]: { ...transfer, rowId: sourceA, peer: sourceB },
      [sourceB]: { ...transfer, rowId: sourceB, peer: sourceA },
      [buyId]: { ...acquisition, rowId: buyId },
      [sellId]: { ...sale, rowId: sellId },
    }
    project.accounts = [{ entity: '=FAUX', country: 'DE', reference: 'Compte fictif', relevant: true }]
    const result = calculate(project)
    expect(result.ready).toBe(true)
    expect(result.disposals).toHaveLength(1)
    expect(result.disposals[0]).toMatchObject({ gain: 7_500, source: 'Plateforme fictive', row: 3 })
    expect(sourceFile(project, 'Wallet A renommé', out).duplicate).toBe(true)
    expect(calculate(projectSchema.parse(JSON.parse(JSON.stringify(project))))).toEqual(result)
    expect(exportReport(result, 'csv')).toContain('"\'=FAUX"')
    const sheets = unzipSync(exportReport(result, 'xlsx') as Uint8Array)
    expect(strFromU8(sheets['xl/worksheets/sheet3.xml']!)).toContain('=FAUX')
    expect(strFromU8(sheets['xl/worksheets/sheet3.xml']!)).not.toContain('<f>')
  })

  it('garde les erreurs de lignes et bloque les imports en échec', () => {
    const { project, status } = sourceFile(projectWith(), 'Wallet fictif', 'Invalide\nvaleur')
    expect(status).toBe('failed')
    expect(project.imports[0]?.sourceText).toBe('Invalide\nvaleur')
    expect(calculate(project).blockers).toHaveLength(1)
  })
})

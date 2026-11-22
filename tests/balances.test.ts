import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { walletBalances } from '../src/mvp/balances.js'
import { fiscalPeriod } from '../src/mvp/period.js'
import { emptyProject, ingest, projectSchema, type Project } from '../src/mvp/project.js'
import { calculate } from '../src/mvp/tax.js'

const { start } = fiscalPeriod(2025)
const transferDate = '2025-02-10T14:00:00.000Z'
const disposalDate = '2025-05-07T13:40:00.000Z'

function scenario() {
  let project: Project = {
    ...emptyProject(), complete: true, accountsReviewed: true,
    opening: { sats: 0, acquisitions: 90_000, used: 0, reference: 'Capital fictif', confirmed: true },
    accounts: [{ sourceId: 'platform', entity: 'Plateforme fictive', country: 'FR', reference: '', relevant: true }],
    sources: [
      { id: 'platform', name: 'Plateforme fictive', kind: 'platform', coverage: true,
        anchor: { date: start, sats: 1_200_000, reference: 'Relevé fictif' } },
      { id: 'wallet', name: 'Sparrow fictif', kind: 'wallet', coverage: true },
    ],
  }
  function load(name: string, sourceId: string, format: 'generique' | 'sparrow') {
    const content = readFileSync(new URL('../samples/' + name, import.meta.url), 'utf8')
    project = ingest({ project, content, format, name, source: sourceId, sourceId }).project
  }
  load('plateforme-multisource.csv', 'platform', 'generique')
  load('sparrow-multisource.csv', 'wallet', 'sparrow')
  return {
    project, out: project.imports[0]!.rawRows[1]!.id,
    incoming: project.imports[1]!.rawRows[1]!.id, disposal: project.imports[1]!.rawRows[2]!.id,
  }
}

describe('soldes par source', () => {
  it('reconstitue l’ouverture, exige les deux lignes du transfert et valorise la cession avec le total du foyer', () => {
    const { project, out, incoming, disposal } = scenario()
    expect(walletBalances(project, start)).toMatchObject({
      sats: 1_500_000, accounts: [{ sats: 1_200_000 }, { sats: 300_000, automatic: true }],
    })
    expect(walletBalances(project, disposalDate, disposal).sats).toBeNull()
    project.operations[out] = {
      rowId: out, type: 'transfert', peer: incoming, date: transferDate, sats: 500_000, reference: 'Fictif',
    }
    expect(walletBalances(project, disposalDate, disposal).sats).toBeNull()
    project.operations[incoming] = { ...project.operations[out], rowId: incoming, peer: out }
    const balances = walletBalances(project, disposalDate, disposal)
    expect(balances).toMatchObject({ sats: 1_500_000, accounts: [{ sats: 700_000 }, { sats: 800_000 }] })
    project.operations[disposal] = {
      rowId: disposal, type: 'vente', date: disposalDate, sats: 400_000, gross: 40_000, portfolio: 150_000,
      fee: 0, reference: 'Vente fictive', valuationReference: 'Cours fictif Sparrow',
    }
    const saved = projectSchema.parse(JSON.parse(JSON.stringify(project)))
    expect(calculate(saved).foreignAccounts).toEqual([])
    const account = saved.accounts[0]!
    account.country = 'DE'
    expect(calculate(saved).ready).toBe(false)
    account.reference = 'Référence fictive'
    expect(calculate(saved).foreignAccounts).toEqual([account])
    expect(calculate(saved)).toMatchObject({ ready: true, remainingSats: 1_100_000, report: { '3AN': 16_000 } })
  })

  it('remonte depuis un solde de référence ultérieur et refuse une source sans couverture ou solde', () => {
    const { project } = scenario()
    const platform = project.sources[0]!
    platform.anchor = { date: '2025-03-01T12:00:00Z', sats: 700_000, reference: 'Relevé fictif' }
    expect(walletBalances(project, start).accounts[0]?.sats).toBe(1_200_000)
    platform.coverage = false
    expect(walletBalances(project, start).sats).toBeNull()
    platform.coverage = true
    delete platform.anchor
    expect(walletBalances(project, start).accounts[0]).toMatchObject({ sats: 1_200_000, automatic: true })
    for (const row of project.imports[0]!.rawRows) delete row.rawPayload.solde_sats
    expect(walletBalances(project, start).accounts[0]).toMatchObject({ sats: null, reason: 'Ajoutez un solde de référence daté.' })
  })

  it('reprend une saisie manuelle rattachée à un wallet sans fichier', () => {
    const project = emptyProject()
    project.sources.push({
      id: 'offline', name: 'Wallet hors ligne', kind: 'wallet', coverage: true,
      anchor: { date: start, sats: 0, reference: 'Aucune détention fictive' },
    })
    project.operations['manual:buy'] = {
      sourceId: 'offline', type: 'achat', date: transferDate, sats: 150_000, gross: 20_000, reference: 'Achat fictif',
    }
    expect(walletBalances(projectSchema.parse(project), disposalDate, undefined, true).sats).toBe(150_000)
  })

  it('détecte un solde de référence incohérent avec le relevé Sparrow', () => {
    const { project, out, incoming, disposal } = scenario()
    project.sources[1]!.anchor = { date: start, sats: 100_000, reference: 'Relevé erroné' }
    project.operations[out] = {
      rowId: out, type: 'transfert', peer: incoming, date: transferDate, sats: 500_000, reference: 'Fictif',
    }
    project.operations[incoming] = { ...project.operations[out], rowId: incoming, peer: out }
    expect(walletBalances(project, disposalDate, disposal).accounts[1]).toMatchObject({
      sats: null, reason: 'Le solde de référence et les mouvements ne concordent pas.',
    })
  })
})

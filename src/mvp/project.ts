import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { z } from 'zod'
import { createSparrowImportBundle } from '../imports/import-bundle.js'
import { parseFixedDecimal, parseSparrowTransactionsCsv, readCsv, type ParsedRawRow } from '../importers/sparrow-transactions-csv.js'
import type { NormalizedEvent } from '../domain/normalized-event.js'

export const fiscalYearSchema = z.union([z.literal(2025), z.literal(2026)])
export const defaultFiscalYear = 2025
const satoshis = z.number().int().min(0).max(2_100_000_000_000_000)
const cents = z.number().int().min(0).max(100_000_000_000_000)
const key = z.string().min(1).max(300)
const reference = z.string().trim().min(1).max(500)
const date = z.iso.datetime().refine(value => {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19)
}, 'Date UTC invalide').transform(value => new Date(value).toISOString())
const type = z.enum(['achat', 'vente', 'paiement', 'transfert', 'doublon', 'historique', 'post_cloture', 'hors_perimetre'])
export const operationSchema = z.object({
  rowId: key.optional(),
  sourceId: key.optional(),
  type,
  date: date.optional(),
  sats: satoshis.optional(),
  gross: cents.optional(),
  fee: cents.optional(),
  portfolio: cents.optional(),
  reference: reference.optional(),
  valuationReference: reference.optional(),
  peer: key.optional(),
})
const sourceSchema = z.object({
  id: key, name: key, sourceType: z.enum(['wallet', 'platform', 'manual']),
  country: z.string().nullable(), isFrenchPlatform: z.boolean(), requires3916Review: z.boolean(),
})
const parsedEventSchema = z.object({
  id: key,
  schemaVersion: z.literal('normalized-event.v0'),
  sourceRef: z.object({ sourceId: key, importId: key, rawRowId: key, parserVersion: key }),
  occurredAt: z.string().nullable(),
  timezone: z.string().optional(), asset: z.literal('BTC'), quantitySats: satoshis,
  direction: z.enum(['in', 'out', 'internal', 'fee']),
  eventType: z.literal('manual_review'), taxableStatus: z.literal('needs_review'),
  txid: z.string().optional(), label: z.string().optional(),
  fee: z.object({ asset: z.literal('BTC'), amountSats: satoshis }).optional(),
  fiat: z.object({
    currency: z.literal('EUR'), grossAmountCents: cents.optional(),
    priceSource: z.enum(['market_price', 'manual']), priceSourceLabel: z.string().optional(),
  }).optional(),
  reviewReasons: z.array(z.string()).optional(),
})
const bundleSchema = z.object({
  schemaVersion: z.literal('local-import-bundle.v0'),
  generatedAt: z.string(), source: sourceSchema,
  import: z.object({
    id: key, sourceId: key, fileName: key, fileFingerprint: key, parserName: key,
    parserVersion: key, importedAt: z.string(), importStatus: z.enum(['imported', 'failed', 'partial']),
    rowCount: z.number().int().nonnegative(), errorCount: z.number().int().nonnegative(),
  }),
  rawRows: z.array(z.object({
    id: key, importId: key, rowNumber: z.number().int().positive(), rawPayload: z.record(z.string(), z.string()),
    rowFingerprint: key, parseStatus: z.enum(['parsed', 'needs_review', 'error']), parseErrors: z.array(z.string()),
    fields: z.array(z.string()).optional(),
  })),
  normalizedEvents: z.array(parsedEventSchema),
  errors: z.array(z.string()),
  sourceText: z.string().optional(),
})
const inventorySource = z.object({
  id: key, name: reference.max(120), kind: z.enum(['wallet', 'platform']),
  coverage: z.boolean(),
  anchor: z.object({ date, sats: satoshis, reference }).optional(),
})

export const projectSchema = z.object({
  schemaVersion: z.literal('fiscalutxo-project.v1'),
  year: fiscalYearSchema,
  complete: z.boolean(),
  opening: z.object({ sats: satoshis, acquisitions: cents, used: cents, reference, confirmed: z.boolean().optional() }),
  sources: z.array(inventorySource).default([]),
  imports: z.array(bundleSchema),
  operations: z.record(key, operationSchema),
  accounts: z.array(z.object({
    sourceId: key.optional(), entity: reference, country: z.string().trim().regex(/^[A-Z]{2}$/),
    reference: z.string().trim().max(200), relevant: z.boolean(),
  })),
  accountsReviewed: z.boolean(),
}).superRefine((project, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
  if (project.opening.used > project.opening.acquisitions) issue('Capital consommé supérieur aux acquisitions')
  if (!project.sources.length && !project.opening.sats && project.opening.used !== project.opening.acquisitions) {
    issue('Un solde d’ouverture nul doit avoir un capital restant nul')
  }
  const sourceIds = new Set(project.sources.map(source => source.id))
  if (sourceIds.size !== project.sources.length) issue('Source déclarée en double')
  const linkedAccounts = new Set<string>()
  const platformIds = new Set(project.sources.filter(source => source.kind === 'platform').map(source => source.id))
  for (const account of project.accounts) {
    if (!account.sourceId) continue
    if (!platformIds.has(account.sourceId) || linkedAccounts.has(account.sourceId)) issue('Lien de compte plateforme invalide')
    linkedAccounts.add(account.sourceId)
  }
  const fileHashes = new Set<string>()
  const importIds = new Set<string>()
  const rowIds = new Set<string>()
  for (const bundle of project.imports) {
    if (fileHashes.has(bundle.import.fileFingerprint)) issue('Import dupliqué')
    fileHashes.add(bundle.import.fileFingerprint)
    if (importIds.has(bundle.import.id) || bundle.import.sourceId !== bundle.source.id ||
        bundle.import.rowCount !== bundle.rawRows.length) issue('Métadonnées d’import incohérentes')
    importIds.add(bundle.import.id)
    const ownRows = new Set<string>()
    for (const row of bundle.rawRows) {
      if (rowIds.has(row.id) || row.importId !== bundle.import.id) issue('Lien de ligne source invalide')
      ownRows.add(row.id)
      rowIds.add(row.id)
    }
    const eventRows = new Set<string>()
    for (const event of bundle.normalizedEvents) {
      if (!ownRows.has(event.sourceRef.rawRowId) || event.sourceRef.sourceId !== bundle.source.id ||
          event.sourceRef.importId !== bundle.import.id || eventRows.has(event.sourceRef.rawRowId)) {
        issue('Lien d’événement source invalide')
      }
      eventRows.add(event.sourceRef.rawRowId)
    }
  }
  for (const [id, operation] of Object.entries(project.operations)) {
    if (operation.sourceId && (operation.rowId || !sourceIds.has(operation.sourceId))) issue('Source de saisie manuelle invalide')
    if (operation.rowId ? operation.rowId !== id || !rowIds.has(id) : !id.startsWith('manual:') || rowIds.has(id)) {
      issue('Lien de qualification invalide')
    }
  }
})

export type Project = z.infer<typeof projectSchema>
export type Bundle = z.infer<typeof bundleSchema>
export type Operation = z.infer<typeof operationSchema>

export function emptyProject(year: Project['year'] = defaultFiscalYear): Project {
  return {
    schemaVersion: 'fiscalutxo-project.v1', year, complete: false,
    opening: { sats: 0, acquisitions: 0, used: 0, reference: 'Aucun avoir au 1er janvier ' + year },
    sources: [], imports: [], operations: {}, accounts: [], accountsReviewed: false,
  }
}

export function demoProject(year: Project['year'] = defaultFiscalYear): Project {
  const { project } = ingest({
    project: { ...emptyProject(year), complete: true, accountsReviewed: true },
    format: 'sparrow', name: 'sparrow-demo.csv', source: 'Wallet fictif',
    content: [
      'Date (UTC),Label,Value (sats),Balance (sats),Fee (sats),Value (EUR),Txid',
      year + '-01-12 12:00:00,Achat : acquisition fictive,1000000,1000000,,1000.00,achat-fictif',
      year + '-03-12 12:00:00,Vente : cession fictive,-750000,250000,0,-1500.00,vente-fictive',
      year + '-04-05 09:15:00,Achat : épargne mensuelle,250000,500000,,250.00,epargne-avril-fictive',
      year + '-07-05 09:20:00,Achat : épargne mensuelle,125000,625000,,150.00,epargne-juillet-fictive',
      year + '-09-06 10:05:00,Achat : épargne mensuelle,210000,835000,,210.00,epargne-septembre-fictive',
      year + '-10-18 14:30:00,Paiement : achat de livres,-83500,751500,0,-86.00,paiement-fictif',
    ].join('\n') + '\n',
  })
  // The first purchase and sale stay open for the walkthrough.
  for (const event of project.imports[0]!.normalizedEvents.slice(2)) {
    const rowId = event.sourceRef.rawRowId
    const details = {
      rowId, date: event.occurredAt!, sats: event.quantitySats,
      gross: event.fiat!.grossAmountCents!, reference: event.label! + ' (exemple fictif)',
    }
    project.operations[rowId] = event.direction === 'in'
      ? { ...details, type: 'achat' }
      : { ...details, type: 'paiement', fee: 0, portfolio: 86_000, valuationReference: 'Cours fictif Sparrow' }
  }
  return projectSchema.parse(project)
}

export const importInputSchema = z.object({
  project: projectSchema,
  format: z.enum(['sparrow', 'generique', 'bundle']),
  name: key,
  source: key,
  sourceId: key.optional(),
  content: z.string().min(1),
})

export function ingest({ project, format, content, name, source, sourceId: selectedId }: z.infer<typeof importInputSchema>) {
  const registered = selectedId ? project.sources.find(item => item.id === selectedId) : undefined
  const legacy = selectedId && !project.sources.length
    ? project.imports.find(bundle => bundle.source.id === selectedId)?.source
    : undefined
  const target = registered ?? (legacy && { id: legacy.id, name: legacy.name, kind: legacy.sourceType })
  if (selectedId && !target) throw new z.ZodError([{ code: 'custom', path: ['sourceId'], message: 'Sélectionnez une source déclarée.' }])
  let bundle: Bundle
  if (format === 'bundle') {
    bundle = bundleSchema.parse(JSON.parse(content))
    if (bundle.import.parserVersion === 'sparrow-transactions-csv.v0') {
      for (const event of bundle.normalizedEvents) {
        if (event.occurredAt?.startsWith('1970-01-01')) event.occurredAt = null
      }
    }
    bundle.source.id = target?.id ?? 'src:' + digest(bundle.source.sourceType + ':' + source.trim().toLowerCase())
    bundle.source.name = target?.name ?? source
    if (target) bundle.source.sourceType = target.kind
    bundle.import.sourceId = bundle.source.id
    for (const event of bundle.normalizedEvents) event.sourceRef.sourceId = bundle.source.id
  } else {
    const fingerprint = 'sha256:' + digest(content)
    const sourceId = target?.id ?? 'src:' + digest((format === 'sparrow' ? 'wallet' : 'platform') + ':' + source.trim().toLowerCase())
    const importId = 'imp:' + digest(fingerprint)
    const context = { sourceId, importId }
    const parseResult = format === 'sparrow'
      ? parseSparrowTransactionsCsv(content, context)
      : parseGeneric(content, context)
    bundle = bundleSchema.parse(createSparrowImportBundle({
      ...context, fileName: name, fileFingerprint: fingerprint, importedAt: new Date().toISOString(),
      parseResult, sourceText: content, source: {
        id: sourceId, name: target?.name ?? source, sourceType: target?.kind ?? (format === 'sparrow' ? 'wallet' : 'platform'),
        country: null, isFrenchPlatform: false, requires3916Review: format !== 'sparrow',
      },
    }))
  }
  if (project.imports.some(item => item.import.fileFingerprint === bundle.import.fileFingerprint)) {
    return { project, duplicate: true, status: bundle.import.importStatus }
  }
  project.imports.push(bundle)
  return { project: projectSchema.parse(project), duplicate: false, status: bundle.import.importStatus }
}

function digest(text: string) {
  return bytesToHex(sha256(new TextEncoder().encode(text)))
}

const genericHeaders = ['date_utc', 'type', 'sats', 'prix_eur', 'frais_eur', 'portefeuille_eur', 'justificatif', 'valorisation', 'txid']
const genericVersion = 'generic-btc-csv.v1'

function parseGeneric(csv: string, context: { importId: string; sourceId: string }) {
  const result = {
    parserName: 'generic-btc-csv', parserVersion: genericVersion,
    rows: [] as ParsedRawRow[], events: [] as NormalizedEvent[], errors: [] as string[],
  }
  try {
    const [header, ...records] = readCsv(csv)
    if (JSON.stringify(header?.record) !== JSON.stringify(genericHeaders)) {
      result.errors.push('En-têtes du CSV générique invalides')
      return result
    }
    records.forEach(({ record, info }) => {
      const rowNumber = info.lines
      const id = context.importId + ':row:' + rowNumber
      const rawPayload = Object.fromEntries(genericHeaders.map((field, column) => [field, record[column] ?? '']))
      const occurredAt = date.safeParse(rawPayload.date_utc)
      const amount = satoshis.safeParse(parseFixedDecimal(rawPayload.sats ?? '', 0))
      const kind = z.enum(['achat', 'vente', 'paiement', 'depot', 'retrait']).safeParse(rawPayload.type)
      const rowErrors = []
      if (record.length !== genericHeaders.length) rowErrors.push('Nombre de colonnes invalide')
      if (!occurredAt.success) rowErrors.push('Date UTC invalide')
      if (!amount.success || !amount.data) rowErrors.push('Quantité en sats invalide')
      if (!kind.success) rowErrors.push('Type inconnu')
      result.rows.push({
        id, rowNumber, rawPayload, fields: record,
        parseStatus: rowErrors.length ? 'error' : 'parsed', parseErrors: rowErrors,
      })
      if (rowErrors.length || !occurredAt.success || !amount.success) return
      result.events.push({
        id: id + ':event', schemaVersion: 'normalized-event.v0',
        sourceRef: { ...context, rawRowId: id, parserVersion: genericVersion },
        occurredAt: occurredAt.data, timezone: 'UTC', asset: 'BTC', quantitySats: amount.data,
        direction: kind.data === 'achat' || kind.data === 'depot' ? 'in' : 'out', eventType: 'manual_review', taxableStatus: 'needs_review',
        ...(rawPayload.txid ? { txid: rawPayload.txid } : {}),
      })
    })
  } catch {
    result.errors.push('CSV générique mal formé')
  }
  return result
}

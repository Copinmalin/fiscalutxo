import type { NormalizedEvent } from '../domain/normalized-event.js'
import type { ParsedRawRow, SparrowParseResult } from '../importers/sparrow-transactions-csv.js'

export type LocalSourceRecord = {
  id: string
  name: string
  sourceType: 'wallet' | 'platform' | 'manual'
  country: string | null
  isFrenchPlatform: boolean
  requires3916Review: boolean
  notes?: string
}

export type LocalImportRecord = {
  id: string
  sourceId: string
  fileName: string
  fileFingerprint: string
  parserName: string
  parserVersion: string
  importedAt: string
  importStatus: 'imported' | 'partial' | 'failed'
  rowCount: number
  errorCount: number
  notes?: string
}

export type LocalRawRowRecord = {
  id: string
  importId: string
  rowNumber: number
  rawPayload: Record<string, string>
  rowFingerprint: string
  parseStatus: ParsedRawRow['parseStatus']
  parseErrors: string[]
}

export type LocalImportBundle = {
  schemaVersion: 'local-import-bundle.v0'
  generatedAt: string
  source: LocalSourceRecord
  import: LocalImportRecord
  rawRows: LocalRawRowRecord[]
  normalizedEvents: NormalizedEvent[]
  errors: string[]
}

export type CreateSparrowImportBundleInput = {
  sourceId: string
  importId: string
  fileName: string
  fileFingerprint: string
  importedAt: string
  parseResult: SparrowParseResult
}

export function createSparrowImportBundle(input: CreateSparrowImportBundleInput): LocalImportBundle {
  const rawRows = input.parseResult.rows.map((row) => toLocalRawRow(input.importId, row))
  const errorCount = rawRows.filter((row) => row.parseStatus === 'error' || row.parseStatus === 'needs_review').length
  const importStatus = getImportStatus(input.parseResult.errors, rawRows)

  return {
    schemaVersion: 'local-import-bundle.v0',
    generatedAt: input.importedAt,
    source: {
      id: input.sourceId,
      name: 'Sparrow Wallet',
      sourceType: 'wallet',
      country: null,
      isFrenchPlatform: false,
      requires3916Review: false,
    },
    import: {
      id: input.importId,
      sourceId: input.sourceId,
      fileName: input.fileName,
      fileFingerprint: input.fileFingerprint,
      parserName: input.parseResult.parserName,
      parserVersion: input.parseResult.parserVersion,
      importedAt: input.importedAt,
      importStatus,
      rowCount: rawRows.length,
      errorCount,
    },
    rawRows,
    normalizedEvents: [...input.parseResult.events].sort((left, right) => left.id.localeCompare(right.id)),
    errors: [...input.parseResult.errors],
  }
}

export function stringifyImportBundle(bundle: LocalImportBundle): string {
  return `${JSON.stringify(sortJsonValue(bundle), null, 2)}\n`
}

function toLocalRawRow(importId: string, row: ParsedRawRow): LocalRawRowRecord {
  const rawPayload = sortStringRecord(row.rawPayload)

  return {
    id: row.id,
    importId,
    rowNumber: row.rowNumber,
    rawPayload,
    rowFingerprint: buildRowFingerprint(row.rowNumber, rawPayload),
    parseStatus: row.parseStatus,
    parseErrors: [...row.parseErrors],
  }
}

function getImportStatus(errors: string[], rawRows: LocalRawRowRecord[]): LocalImportRecord['importStatus'] {
  if (errors.length > 0) {
    return 'failed'
  }

  if (rawRows.some((row) => row.parseStatus === 'error' || row.parseStatus === 'needs_review')) {
    return 'partial'
  }

  return 'imported'
}

function sortStringRecord(record: Record<string, string>): Record<string, string> {
  return Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, string>>((sorted, key) => {
      sorted[key] = record[key] ?? ''
      return sorted
    }, {})
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortJsonValue((value as Record<string, unknown>)[key])
        return sorted
      }, {})
  }

  return value
}

function buildRowFingerprint(rowNumber: number, rawPayload: Record<string, string>): string {
  const keys = Object.keys(rawPayload).join('|')
  const valuesLength = Object.values(rawPayload).join('|').length
  return `row:${rowNumber}:keys:${keys.length}:values:${valuesLength}`
}

import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
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
  fields?: string[]
}

export type LocalImportBundle = {
  schemaVersion: 'local-import-bundle.v0'
  generatedAt: string
  source: LocalSourceRecord
  import: LocalImportRecord
  rawRows: LocalRawRowRecord[]
  normalizedEvents: NormalizedEvent[]
  errors: string[]
  sourceText?: string
}

export type CreateSparrowImportBundleInput = {
  sourceId: string
  importId: string
  fileName: string
  fileFingerprint: string
  importedAt: string
  parseResult: Pick<SparrowParseResult, 'events' | 'errors'> & {
    parserName: string
    parserVersion: string
    rows: (Omit<ParsedRawRow, 'fields'> & { fields?: string[] })[]
  }
  source?: LocalSourceRecord
  sourceText?: string
}

export function createSparrowImportBundle(input: CreateSparrowImportBundleInput): LocalImportBundle {
  const rawRows = input.parseResult.rows.map((row) => toLocalRawRow(input.importId, row))
  const errorCount = rawRows.filter((row) => row.parseStatus === 'error' || row.parseStatus === 'needs_review').length
  const importStatus = getImportStatus(input.parseResult.errors, rawRows)

  return {
    schemaVersion: 'local-import-bundle.v0',
    generatedAt: input.importedAt,
    source: input.source ?? {
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
    ...(input.sourceText === undefined ? {} : { sourceText: input.sourceText }),
  }
}

export function stringifyImportBundle(bundle: LocalImportBundle): string {
  return `${JSON.stringify(sortJsonValue(bundle), null, 2)}\n`
}

function toLocalRawRow(importId: string, row: CreateSparrowImportBundleInput['parseResult']['rows'][number]): LocalRawRowRecord {
  const rawPayload = sortStringRecord(row.rawPayload)

  return {
    id: row.id,
    importId,
    rowNumber: row.rowNumber,
    rawPayload,
    rowFingerprint: buildRowFingerprint(row.rowNumber, rawPayload),
    parseStatus: row.parseStatus,
    parseErrors: [...row.parseErrors],
    ...(row.fields ? { fields: row.fields } : {}),
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
  return Object.fromEntries(Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => [key, record[key] ?? '']))
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortJsonValue(child)]))
  }

  return value
}

function buildRowFingerprint(rowNumber: number, rawPayload: Record<string, string>): string {
  return 'sha256:' + bytesToHex(sha256(new TextEncoder().encode(JSON.stringify([rowNumber, rawPayload]))))
}

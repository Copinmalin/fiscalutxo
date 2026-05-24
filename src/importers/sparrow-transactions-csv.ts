import type { NormalizedEvent, SourceRef } from '../domain/normalized-event.js'
import { validateNormalizedEvent } from '../domain/normalized-event.js'

export const SPARROW_TRANSACTIONS_CSV_PARSER = 'sparrow-transactions-csv'
export const SPARROW_TRANSACTIONS_CSV_PARSER_VERSION = 'sparrow-transactions-csv.v0'

const REQUIRED_HEADERS = ['Date (UTC)', 'Label', 'Value', 'Balance', 'Fee', 'Txid'] as const

export type SparrowRawRow = Record<string, string>

export type ParsedRawRow = {
  id: string
  rowNumber: number
  rawPayload: SparrowRawRow
  parseStatus: 'parsed' | 'needs_review' | 'error'
  parseErrors: string[]
}

export type SparrowImportContext = {
  sourceId: string
  importId: string
}

export type SparrowParseResult = {
  parserName: typeof SPARROW_TRANSACTIONS_CSV_PARSER
  parserVersion: typeof SPARROW_TRANSACTIONS_CSV_PARSER_VERSION
  rows: ParsedRawRow[]
  events: NormalizedEvent[]
  errors: string[]
}

export function parseSparrowTransactionsCsv(csv: string, context: SparrowImportContext): SparrowParseResult {
  const errors: string[] = []
  const records = parseCsvRecords(csv)

  if (records.length === 0) {
    return emptyResult(['CSV is empty'])
  }

  const headers = records[0]?.map((header) => header.trim()) ?? []
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header))

  if (missingHeaders.length > 0) {
    return emptyResult([`Missing required headers: ${missingHeaders.join(', ')}`])
  }

  const rows: ParsedRawRow[] = []
  const events: NormalizedEvent[] = []

  records.slice(1).forEach((record, index) => {
    const rowNumber = index + 2

    if (record.every((value) => value.trim() === '')) {
      return
    }

    const rawPayload = buildRawPayload(headers, record)
    const rawRowId = buildRawRowId(context.importId, rowNumber)
    const rowErrors: string[] = []

    const event = toNormalizedEvent(rawPayload, {
      sourceId: context.sourceId,
      importId: context.importId,
      rawRowId,
      parserVersion: SPARROW_TRANSACTIONS_CSV_PARSER_VERSION,
    }, rowErrors)

    const parseStatus = rowErrors.length === 0 ? 'parsed' : event ? 'needs_review' : 'error'

    rows.push({
      id: rawRowId,
      rowNumber,
      rawPayload,
      parseStatus,
      parseErrors: rowErrors,
    })

    if (event) {
      events.push(event)
    }
  })

  return {
    parserName: SPARROW_TRANSACTIONS_CSV_PARSER,
    parserVersion: SPARROW_TRANSACTIONS_CSV_PARSER_VERSION,
    rows,
    events,
    errors,
  }
}

function toNormalizedEvent(raw: SparrowRawRow, sourceRef: SourceRef, rowErrors: string[]): NormalizedEvent | null {
  const occurredAt = parseSparrowDate(raw['Date (UTC)'], rowErrors)
  const valueSats = parseBitcoinAmountToSats(raw.Value, 'Value', rowErrors)
  const feeSats = parseOptionalBitcoinAmountToSats(raw.Fee, 'Fee', rowErrors)
  const fiat = parseOptionalEurValue(raw)

  if (valueSats === null) {
    return null
  }

  const direction = valueSats > 0 ? 'in' : valueSats < 0 ? 'out' : 'internal'
  const reviewReasons = buildReviewReasons(raw, valueSats, rowErrors)

  const event: NormalizedEvent = {
    id: buildEventId(sourceRef.importId, sourceRef.rawRowId),
    schemaVersion: 'normalized-event.v0',
    sourceRef,
    occurredAt: occurredAt ?? new Date(0).toISOString(),
    timezone: 'UTC',
    asset: 'BTC',
    quantitySats: Math.abs(valueSats),
    direction,
    eventType: 'manual_review',
    taxableStatus: 'needs_review',
    label: raw.Label || undefined,
    txid: raw.Txid || undefined,
    reviewReasons,
  }

  if (feeSats !== null && feeSats > 0) {
    event.fee = {
      asset: 'BTC',
      amountSats: feeSats,
    }
  }

  if (fiat) {
    event.fiat = fiat
  }

  const validation = validateNormalizedEvent(event)
  if (!validation.valid) {
    rowErrors.push(...validation.errors)
  }

  return event
}

function buildReviewReasons(raw: SparrowRawRow, valueSats: number, rowErrors: string[]): string[] {
  const reasons: string[] = []

  if (valueSats > 0) {
    reasons.push('Sparrow incoming transaction requires user qualification')
  } else if (valueSats < 0) {
    reasons.push('Sparrow outgoing transaction requires user qualification')
  } else {
    reasons.push('Sparrow transaction with zero net wallet value requires review')
  }

  if (!raw.Txid?.trim()) {
    reasons.push('Missing txid')
  }

  const fiatHeaders = Object.keys(raw).filter((header) => header.startsWith('Value (') && header !== 'Value (EUR)')
  if (fiatHeaders.length > 0) {
    reasons.push('Non-EUR fiat value ignored in V0')
  }

  if (rowErrors.length > 0) {
    reasons.push(...rowErrors)
  }

  return [...new Set(reasons)]
}

function parseSparrowDate(value: string | undefined, errors: string[]): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    errors.push('Date (UTC) is required')
    return null
  }

  if (trimmed === 'Unconfirmed') {
    errors.push('Unconfirmed transaction has no confirmed UTC date')
    return null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(trimmed)
  if (!match) {
    errors.push('Date (UTC) must match yyyy-MM-dd HH:mm:ss or Unconfirmed')
    return null
  }

  const [, year, month, day, hour, minute, second] = match
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  const timestamp = Date.parse(iso)

  if (!Number.isFinite(timestamp)) {
    errors.push('Date (UTC) is invalid')
    return null
  }

  return iso
}

function parseBitcoinAmountToSats(value: string | undefined, fieldName: string, errors: string[]): number | null {
  const trimmed = normalizeNumericString(value)

  if (!trimmed) {
    errors.push(`${fieldName} is required`)
    return null
  }

  const sats = parseAmountToSats(trimmed)
  if (sats === null) {
    errors.push(`${fieldName} must be a BTC decimal or sats integer`)
    return null
  }

  return sats
}

function parseOptionalBitcoinAmountToSats(value: string | undefined, fieldName: string, errors: string[]): number | null {
  const trimmed = normalizeNumericString(value)

  if (!trimmed) {
    return null
  }

  const sats = parseAmountToSats(trimmed)
  if (sats === null) {
    errors.push(`${fieldName} must be a BTC decimal or sats integer`)
    return null
  }

  return Math.abs(sats)
}

function parseAmountToSats(value: string): number | null {
  const sign = value.startsWith('-') ? -1 : 1
  const unsigned = value.replace(/^[+-]/, '')

  if (/^\d+$/.test(unsigned)) {
    return sign * Number.parseInt(unsigned, 10)
  }

  const decimalMatch = /^(\d+)\.(\d{1,8})$/.exec(unsigned)
  if (!decimalMatch) {
    return null
  }

  const [, wholePart, fractionalPart] = decimalMatch
  const wholeSats = Number.parseInt(wholePart, 10) * 100_000_000
  const fractionalSats = Number.parseInt(fractionalPart.padEnd(8, '0'), 10)

  return sign * (wholeSats + fractionalSats)
}

function parseOptionalEurValue(raw: SparrowRawRow): NormalizedEvent['fiat'] | undefined {
  const value = raw['Value (EUR)']
  const normalized = normalizeNumericString(value)

  if (!normalized) {
    return undefined
  }

  const cents = parseEuroCents(normalized)
  if (cents === null) {
    return undefined
  }

  return {
    currency: 'EUR',
    grossAmountCents: Math.abs(cents),
    priceSource: 'market_price',
    priceSourceLabel: 'Sparrow historical daily rate',
  }
}

function parseEuroCents(value: string): number | null {
  const sign = value.startsWith('-') ? -1 : 1
  const unsigned = value.replace(/^[+-]/, '')
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(unsigned)

  if (!match) {
    return null
  }

  const [, euros, cents = '0'] = match
  return sign * (Number.parseInt(euros, 10) * 100 + Number.parseInt(cents.padEnd(2, '0'), 10))
}

function normalizeNumericString(value: string | undefined): string {
  return value?.trim().replace(/,/g, '') ?? ''
}

function buildRawPayload(headers: string[], record: string[]): SparrowRawRow {
  return headers.reduce<SparrowRawRow>((payload, header, index) => {
    payload[header] = record[index]?.trim() ?? ''
    return payload
  }, {})
}

function buildRawRowId(importId: string, rowNumber: number): string {
  return `${importId}:row:${rowNumber}`
}

function buildEventId(importId: string, rawRowId: string): string {
  return `${importId}:event:${rawRowId}`
}

function emptyResult(errors: string[]): SparrowParseResult {
  return {
    parserName: SPARROW_TRANSACTIONS_CSV_PARSER,
    parserVersion: SPARROW_TRANSACTIONS_CSV_PARSER_VERSION,
    rows: [],
    events: [],
    errors,
  }
}

function parseCsvRecords(csv: string): string[][] {
  const records: string[][] = []
  let currentRecord: string[] = []
  let currentValue = ''
  let inQuotes = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const next = csv[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      currentRecord.push(currentValue)
      currentValue = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1
      }
      currentRecord.push(currentValue)
      records.push(currentRecord)
      currentRecord = []
      currentValue = ''
      continue
    }

    currentValue += char
  }

  currentRecord.push(currentValue)
  if (currentRecord.some((value) => value.length > 0)) {
    records.push(currentRecord)
  }

  return records
}

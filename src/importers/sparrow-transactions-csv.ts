import { parse } from 'csv-parse/sync'
import type { FiatValue, NormalizedEvent, SourceRef } from '../domain/normalized-event.js'
import { validateNormalizedEvent } from '../domain/normalized-event.js'

export const SPARROW_TRANSACTIONS_CSV_PARSER = 'sparrow-transactions-csv'
export const SPARROW_TRANSACTIONS_CSV_PARSER_VERSION = 'sparrow-transactions-csv.v1'

const REQUIRED_HEADERS = ['Date (UTC)', 'Label', 'Value', 'Balance', 'Fee', 'Txid'] as const

export type SparrowRawRow = Record<string, string>

export type ParsedRawRow = {
  id: string
  rowNumber: number
  rawPayload: SparrowRawRow
  parseStatus: 'parsed' | 'needs_review' | 'error'
  parseErrors: string[]
  fields: string[]
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
  let records: CsvRecord[]
  try {
    records = readCsv(csv, '#')
  } catch {
    return emptyResult(['Malformed CSV: check quoting and delimiters'])
  }

  if (records.length === 0) {
    return emptyResult(['CSV is empty'])
  }

  const headers = records[0]?.record.map((header) => header.trim()) ?? []
  const amountHeaders = headers.map(header => /^(Value|Balance|Fee) \((BTC|sats?)\)$/i.exec(header))
  const units = amountHeaders.flatMap(match => match?.[2] ? [match[2].toLowerCase() === 'btc' ? 'btc' : 'sats'] : [])
  const unit = units[0]
  const mapped = headers.map((header, index) => amountHeaders[index]?.[1] ?? header)
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !mapped.includes(header))
  if (new Set(mapped).size !== mapped.length || mapped.includes('')) {
    return emptyResult(['CSV headers must be unique and non-empty'])
  }
  if (unit && (units.length !== 3 || units.some(value => value !== unit))) {
    return emptyResult(['Sparrow amount headers must use the same Bitcoin unit'])
  }

  if (missingHeaders.length > 0) {
    return emptyResult([`Missing required headers: ${missingHeaders.join(', ')}`])
  }

  const rows: ParsedRawRow[] = []
  const events: NormalizedEvent[] = []

  const seen = new Map<string, string>()
  records.slice(1).forEach(({ record, info }) => {
    const rowNumber = info.lines

    if (record.every((value) => value.trim() === '')) {
      return
    }

    const rawPayload = buildRawPayload(headers, record)
    const rawRowId = buildRawRowId(context.importId, rowNumber)
    const rowErrors: string[] = []
    const canonical = buildRawPayload(mapped, record)
    const txid = canonical.Txid?.toLowerCase()
    if (record.length !== headers.length) rowErrors.push('Unexpected number of CSV columns')
    const signature = JSON.stringify(record)
    const previous = txid ? seen.get(txid) : undefined
    if (previous !== undefined) {
      rowErrors.push(previous === signature ? 'Duplicate transaction row' : 'Conflicting rows for the same transaction')
    }
    if (!txid) rowErrors.push('Missing txid')

    const event = record.length === headers.length && previous === undefined ? toNormalizedEvent(canonical, {
      sourceId: context.sourceId,
      importId: context.importId,
      rawRowId,
      parserVersion: SPARROW_TRANSACTIONS_CSV_PARSER_VERSION,
    }, rowErrors, unit) : null

    if (txid && event) seen.set(txid, signature)
    const parseStatus = rowErrors.length === 0 ? 'parsed' : event ? 'needs_review' : 'error'

    rows.push({
      id: rawRowId,
      rowNumber,
      rawPayload,
      fields: record,
      parseStatus: previous === signature ? 'needs_review' : parseStatus,
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

function toNormalizedEvent(raw: SparrowRawRow, sourceRef: SourceRef, rowErrors: string[], unit?: string): NormalizedEvent | null {
  const occurredAt = parseSparrowDate(raw['Date (UTC)'], rowErrors)
  const valueSats = parseBitcoinAmountToSats(raw.Value, 'Value', rowErrors, unit)
  const feeSats = parseOptionalBitcoinAmountToSats(raw.Fee, 'Fee', rowErrors, unit)
  const fiat = parseOptionalEurValue(raw, unit)
  if (raw['Value (EUR)']?.trim() && !fiat) rowErrors.push('Invalid indicative EUR value')

  if (valueSats === null || Math.abs(valueSats) > 2_100_000_000_000_000) {
    if (valueSats !== null) rowErrors.push('Value exceeds the maximum Bitcoin supply')
    return null
  }

  const direction = valueSats > 0 ? 'in' : valueSats < 0 ? 'out' : 'internal'
  const reviewReasons = buildReviewReasons(raw, valueSats, rowErrors)

  const event: NormalizedEvent = {
    id: buildEventId(sourceRef.importId, sourceRef.rawRowId),
    schemaVersion: 'normalized-event.v0',
    sourceRef,
    occurredAt,
    timezone: 'UTC',
    asset: 'BTC',
    quantitySats: Math.abs(valueSats),
    direction,
    eventType: 'manual_review',
    taxableStatus: 'needs_review',
    reviewReasons,
  }

  if (raw.Label?.trim()) {
    event.label = raw.Label.trim()
  }

  if (raw.Txid?.trim()) {
    event.txid = raw.Txid.trim()
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
    return null
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

  const year = match[1]
  const month = match[2]
  const day = match[3]
  const hour = match[4]
  const minute = match[5]
  const second = match[6]
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
  const timestamp = Date.parse(iso)

  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().replace('.000Z', 'Z') !== iso) {
    errors.push('Date (UTC) is invalid')
    return null
  }

  return iso
}

function parseBitcoinAmountToSats(value: string | undefined, fieldName: string, errors: string[], unit?: string): number | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    errors.push(`${fieldName} is required`)
    return null
  }

  const sats = parseAmountToSats(trimmed, unit)
  if (sats === null) {
    errors.push(`${fieldName} must be a BTC decimal or sats integer`)
    return null
  }

  return sats
}

function parseOptionalBitcoinAmountToSats(value: string | undefined, fieldName: string, errors: string[], unit?: string): number | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const sats = parseAmountToSats(trimmed, unit)
  if (sats === null) {
    errors.push(`${fieldName} must be a BTC decimal or sats integer`)
    return null
  }

  return Math.abs(sats)
}

function parseAmountToSats(value: string, unit?: string): number | null {
  if (unit === 'btc') return parseFixedDecimal(value, 8, true)
  if (unit) return /^[-+]?\d+$/.test(value) ? parseFixedDecimal(value, 0) : null
  const normalized = value.replace(/,/g, '')
  if (value.includes(',') && !/^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d{1,8})?$/.test(value)) return null
  return parseLegacyAmount(normalized)
}

function parseLegacyAmount(value: string): number | null {
  return parseFixedDecimal(value, value.includes('.') ? 8 : 0)
}

function parseOptionalEurValue(raw: SparrowRawRow, unit?: string): FiatValue | undefined {
  const value = raw['Value (EUR)']
  const normalized = value?.trim()

  if (!normalized) {
    return undefined
  }

  const withGrouping = !unit && /^[-+]?\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(normalized)
  const cents = parseFixedDecimal(withGrouping ? normalized.replace(/,/g, '') : normalized, 2, true)
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

export function parseFixedDecimal(value: string, places: number, decimalComma = false): number | null {
  const input = decimalComma ? value.replace(',', '.') : value
  const pattern = places ? new RegExp('^([+-]?)(\\d+)(?:\\.(\\d{1,' + places + '}))?$') : /^([+-]?)(\d+)$/
  const match = pattern.exec(input)
  if (!match || !match[2]) return null
  const total = BigInt(match[2] + (match[3] ?? '').padEnd(places, '0'))
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return null
  return Number(total) * (match[1] === '-' ? -1 : 1)
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

type CsvRecord = { record: string[]; info: { lines: number } }

export function readCsv(csv: string, comment?: string): CsvRecord[] {
  return parse(csv, {
    bom: true,
    info: true,
    relax_column_count: true,
    skip_empty_lines: true,
    ...(comment ? { comment, comment_no_infix: true } : {}),
  }) as unknown as CsvRecord[]
}

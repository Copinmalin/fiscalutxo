export type NormalizedEventSchemaVersion = 'normalized-event.v0'

export type BitcoinAsset = 'BTC'

export type FiatCurrency = 'EUR'

export type EventDirection = 'in' | 'out' | 'internal' | 'fee'

export type EventType =
  | 'acquisition'
  | 'disposal_sale'
  | 'disposal_spend'
  | 'self_transfer'
  | 'fee'
  | 'reward'
  | 'donation'
  | 'pro_income'
  | 'manual_review'

export type TaxableStatus =
  | 'taxable'
  | 'non_taxable'
  | 'needs_review'
  | 'out_of_scope'

export type PriceSource =
  | 'platform_csv'
  | 'invoice'
  | 'manual'
  | 'market_price'
  | 'unknown'

export type SourceRef = {
  sourceId: string
  importId: string
  rawRowId: string
  parserVersion: string
}

export type FiatValue = {
  currency: FiatCurrency
  grossAmountCents?: number
  feeCents?: number
  netAmountCents?: number
  priceSource: PriceSource
  priceSourceLabel?: string
}

export type BitcoinFee = {
  asset: BitcoinAsset
  amountSats: number
}

export type NormalizedEvent = {
  id: string
  schemaVersion: NormalizedEventSchemaVersion

  sourceRef: SourceRef

  occurredAt: string
  timezone?: string

  asset: BitcoinAsset
  quantitySats: number
  direction: EventDirection

  eventType: EventType
  taxableStatus: TaxableStatus

  fiat?: FiatValue
  fee?: BitcoinFee

  txid?: string
  label?: string
  counterparty?: string

  relatedEventIds?: string[]
  reviewReasons?: string[]
  userNotes?: string
}

export const NORMALIZED_EVENT_SCHEMA_VERSION: NormalizedEventSchemaVersion = 'normalized-event.v0'

const eventDirections = ['in', 'out', 'internal', 'fee'] as const
const eventTypes = [
  'acquisition',
  'disposal_sale',
  'disposal_spend',
  'self_transfer',
  'fee',
  'reward',
  'donation',
  'pro_income',
  'manual_review',
] as const
const taxableStatuses = ['taxable', 'non_taxable', 'needs_review', 'out_of_scope'] as const
const priceSources = ['platform_csv', 'invoice', 'manual', 'market_price', 'unknown'] as const

export type NormalizedEventValidationResult = {
  valid: boolean
  errors: string[]
}

export function validateNormalizedEvent(event: NormalizedEvent): NormalizedEventValidationResult {
  const errors: string[] = []

  if (!event.id.trim()) {
    errors.push('id is required')
  }

  if (event.schemaVersion !== NORMALIZED_EVENT_SCHEMA_VERSION) {
    errors.push('schemaVersion must be normalized-event.v0')
  }

  if (!event.sourceRef.sourceId.trim()) {
    errors.push('sourceRef.sourceId is required')
  }

  if (!event.sourceRef.importId.trim()) {
    errors.push('sourceRef.importId is required')
  }

  if (!event.sourceRef.rawRowId.trim()) {
    errors.push('sourceRef.rawRowId is required')
  }

  if (!event.sourceRef.parserVersion.trim()) {
    errors.push('sourceRef.parserVersion is required')
  }

  if (!isValidIsoDate(event.occurredAt)) {
    errors.push('occurredAt must be a valid ISO 8601 date')
  }

  if (event.asset !== 'BTC') {
    errors.push('asset must be BTC')
  }

  if (!Number.isInteger(event.quantitySats) || event.quantitySats < 0) {
    errors.push('quantitySats must be a non-negative integer')
  }

  if (!includesReadonly(eventDirections, event.direction)) {
    errors.push('direction is invalid')
  }

  if (!includesReadonly(eventTypes, event.eventType)) {
    errors.push('eventType is invalid')
  }

  if (!includesReadonly(taxableStatuses, event.taxableStatus)) {
    errors.push('taxableStatus is invalid')
  }

  if (event.fiat) {
    validateFiatValue(event.fiat, errors)
  }

  if (event.fee) {
    validateBitcoinFee(event.fee, errors)
  }

  validateFiscalPrudence(event, errors)

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateFiatValue(fiat: FiatValue, errors: string[]): void {
  if (fiat.currency !== 'EUR') {
    errors.push('fiat.currency must be EUR')
  }

  if (!includesReadonly(priceSources, fiat.priceSource)) {
    errors.push('fiat.priceSource is invalid')
  }

  validateOptionalCents('fiat.grossAmountCents', fiat.grossAmountCents, errors)
  validateOptionalCents('fiat.feeCents', fiat.feeCents, errors)
  validateOptionalCents('fiat.netAmountCents', fiat.netAmountCents, errors)
}

function validateBitcoinFee(fee: BitcoinFee, errors: string[]): void {
  if (fee.asset !== 'BTC') {
    errors.push('fee.asset must be BTC')
  }

  if (!Number.isInteger(fee.amountSats) || fee.amountSats < 0) {
    errors.push('fee.amountSats must be a non-negative integer')
  }
}

function validateOptionalCents(fieldName: string, value: number | undefined, errors: string[]): void {
  if (value === undefined) {
    return
  }

  if (!Number.isInteger(value)) {
    errors.push(`${fieldName} must be an integer number of cents`)
  }
}

function validateFiscalPrudence(event: NormalizedEvent, errors: string[]): void {
  if (event.eventType === 'manual_review' && event.taxableStatus !== 'needs_review') {
    errors.push('manual_review must use taxableStatus needs_review')
  }

  if (event.eventType === 'pro_income' && event.taxableStatus !== 'out_of_scope') {
    errors.push('pro_income must use taxableStatus out_of_scope')
  }

  if (event.eventType === 'self_transfer' && event.taxableStatus !== 'non_taxable') {
    errors.push('self_transfer must use taxableStatus non_taxable')
  }
}

function isValidIsoDate(value: string): boolean {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && value.includes('T')
}

function includesReadonly<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T)
}

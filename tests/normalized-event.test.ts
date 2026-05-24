import { describe, expect, it } from 'vitest'

import type { NormalizedEvent } from '../src/index.js'
import { validateNormalizedEvent } from '../src/index.js'

function buildValidEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    id: 'evt_test_001',
    schemaVersion: 'normalized-event.v0',
    sourceRef: {
      sourceId: 'src_test',
      importId: 'imp_test',
      rawRowId: 'raw_test_001',
      parserVersion: 'test-parser.v0',
    },
    occurredAt: '2025-05-21T18:30:00Z',
    asset: 'BTC',
    quantitySats: 1000,
    direction: 'in',
    eventType: 'manual_review',
    taxableStatus: 'needs_review',
    ...overrides,
  }
}

describe('validateNormalizedEvent', () => {
  it('accepts a valid manual review event', () => {
    const result = validateNormalizedEvent(buildValidEvent())

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects an invalid schema version', () => {
    const event = buildValidEvent({
      schemaVersion: 'invalid' as NormalizedEvent['schemaVersion'],
    })

    const result = validateNormalizedEvent(event)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('schemaVersion must be normalized-event.v0')
  })

  it('rejects an asset different from BTC', () => {
    const event = buildValidEvent({
      asset: 'ETH' as NormalizedEvent['asset'],
    })

    const result = validateNormalizedEvent(event)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('asset must be BTC')
  })

  it('rejects negative sats values', () => {
    const result = validateNormalizedEvent(buildValidEvent({ quantitySats: -1 }))

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('quantitySats must be a non-negative integer')
  })

  it('requires a complete source reference', () => {
    const result = validateNormalizedEvent(
      buildValidEvent({
        sourceRef: {
          sourceId: '',
          importId: 'imp_test',
          rawRowId: 'raw_test_001',
          parserVersion: 'test-parser.v0',
        },
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('sourceRef.sourceId is required')
  })

  it('requires manual_review to use needs_review', () => {
    const result = validateNormalizedEvent(
      buildValidEvent({
        eventType: 'manual_review',
        taxableStatus: 'taxable',
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('manual_review must use taxableStatus needs_review')
  })

  it('requires self_transfer to use non_taxable', () => {
    const result = validateNormalizedEvent(
      buildValidEvent({
        eventType: 'self_transfer',
        taxableStatus: 'needs_review',
        direction: 'internal',
      }),
    )

    expect(result.valid).toBe(false)
    expect(result.errors).toContain('self_transfer must use taxableStatus non_taxable')
  })

  it('accepts a valid disposal sale event', () => {
    const result = validateNormalizedEvent(
      buildValidEvent({
        eventType: 'disposal_sale',
        taxableStatus: 'taxable',
        direction: 'out',
        fiat: {
          currency: 'EUR',
          grossAmountCents: 4200,
          priceSource: 'platform_csv',
        },
      }),
    )

    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })
})

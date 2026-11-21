import { describe, expect, it } from 'vitest'

import { parseSparrowTransactionsCsv } from '../src/index.js'

const context = {
  sourceId: 'src_sparrow_test',
  importId: 'imp_sparrow_test',
}

describe('parseSparrowTransactionsCsv', () => {
  it('parses a valid incoming Sparrow transaction as manual review', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Value (EUR),Txid',
      '2025-05-21 18:30:00,Incoming,0.00010000,0.00010000,,10.00,tx_test_incoming',
    ].join('\n')

    const result = parseSparrowTransactionsCsv(csv, context)

    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.parseStatus).toBe('parsed')
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({
      asset: 'BTC',
      quantitySats: 10000,
      direction: 'in',
      eventType: 'manual_review',
      taxableStatus: 'needs_review',
      txid: 'tx_test_incoming',
    })
    expect(result.events[0]?.fiat).toMatchObject({
      currency: 'EUR',
      grossAmountCents: 1000,
      priceSource: 'market_price',
    })
  })

  it('parses an outgoing Sparrow transaction without classifying it as taxable', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Txid',
      '2025-05-21 18:30:00,Outgoing,-0.00070000,0.01000000,0.00000120,tx_test_outgoing',
    ].join('\n')

    const result = parseSparrowTransactionsCsv(csv, context)

    expect(result.errors).toEqual([])
    expect(result.rows[0]?.parseStatus).toBe('parsed')
    expect(result.events[0]).toMatchObject({
      quantitySats: 70000,
      direction: 'out',
      eventType: 'manual_review',
      taxableStatus: 'needs_review',
      fee: {
        asset: 'BTC',
        amountSats: 120,
      },
    })
    expect(result.events[0]?.taxableStatus).not.toBe('taxable')
  })

  it('refuses a CSV missing required headers', () => {
    const csv = ['Date (UTC),Label,Value', '2025-05-21 18:30:00,Incoming,0.00010000'].join('\n')

    const result = parseSparrowTransactionsCsv(csv, context)

    expect(result.events).toEqual([])
    expect(result.errors[0]).toContain('Missing required headers')
  })

  it('marks unconfirmed transactions as needs_review', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Txid',
      'Unconfirmed,Pending,10000,10000,,tx_test_pending',
    ].join('\n')

    const result = parseSparrowTransactionsCsv(csv, context)

    expect(result.rows[0]?.parseStatus).toBe('needs_review')
    expect(result.events[0]?.taxableStatus).toBe('needs_review')
    expect(result.events[0]?.reviewReasons).toContain('Unconfirmed transaction has no confirmed UTC date')
  })

  it('keeps non-EUR fiat values out of fiat fields', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Value (USD),Txid',
      '2025-05-21 18:30:00,Incoming,0.00010000,0.00010000,,11.00,tx_test_usd',
    ].join('\n')

    const result = parseSparrowTransactionsCsv(csv, context)

    expect(result.events[0]?.fiat).toBeUndefined()
    expect(result.events[0]?.reviewReasons).toContain('Non-EUR fiat value ignored in V0')
  })

  it('reports invalid amounts without creating an event', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Txid',
      '2025-05-21 18:30:00,Broken,not-a-number,0.00010000,,tx_test_broken',
    ].join('\n')

    const result = parseSparrowTransactionsCsv(csv, context)

    expect(result.rows[0]?.parseStatus).toBe('error')
    expect(result.rows[0]?.parseErrors).toContain('Value must be a BTC decimal or sats integer')
    expect(result.events).toEqual([])
  })
})

describe('formats Sparrow actuels', () => {
  it.each([
    ['BTC', '"0,00010000"', '"0,00000120"'],
    ['Sats', '10000', '120'],
  ])('importe les en-têtes avec unité %s', (unit, value, fee) => {
    const result = parseSparrowTransactionsCsv(
      'Date (UTC),Label,Value (' + unit + '),Balance (' + unit + '),Fee (' + unit + '),Value (EUR),Txid\r\n' +
      '2026-05-23 11:00:00,"Libellé, fictif",' + value + ',' + value + ',' + fee + ',"12,34",fictif\r\n\r\n' +
      '# Historical EUR values are taken from daily rates.\r\n', context,
    )
    expect(result.errors).toEqual([])
    expect(result.rows).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ quantitySats: 10_000, fee: { amountSats: 120 }, fiat: { grossAmountCents: 1234 } })
  })

  it('isole les dates invalides, les lignes de trop et les doublons', () => {
    const valid = '2026-02-01 12:00:00,Exemple,1000,1000,,fictif'
    const result = parseSparrowTransactionsCsv([
      'Date (UTC),Label,Value,Balance,Fee,Txid', valid, valid,
      '2026-02-30 12:00:00,Exemple,1000,1000,,fictif-invalide',
      '2026-02-01 12:00:00,Exemple,1000,1000,,fictif-colonne,extra',
    ].join('\n'), context)
    expect(result.events.map(event => event.occurredAt)).toEqual(['2026-02-01T12:00:00Z', null])
    expect(result.rows.map(row => row.parseStatus)).toEqual(['parsed', 'needs_review', 'needs_review', 'error'])
    expect(result.rows[3]?.fields.at(-1)).toBe('extra')
  })
})

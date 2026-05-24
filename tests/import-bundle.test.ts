import { describe, expect, it } from 'vitest'

import {
  createSparrowImportBundle,
  parseSparrowTransactionsCsv,
  stringifyImportBundle,
} from '../src/index.js'

const context = {
  sourceId: 'src_sparrow_test',
  importId: 'imp_sparrow_test',
}

const importedAt = '2026-05-24T17:30:00Z'

describe('createSparrowImportBundle', () => {
  it('creates a local import bundle aligned with raw rows and normalized events', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Txid',
      '2025-05-21 18:30:00,Incoming,0.00010000,0.00010000,,tx_test_incoming',
    ].join('\n')

    const parseResult = parseSparrowTransactionsCsv(csv, context)
    const bundle = createSparrowImportBundle({
      ...context,
      fileName: 'sparrow-export.csv',
      fileFingerprint: 'test-file-fingerprint',
      importedAt,
      parseResult,
    })

    expect(bundle.schemaVersion).toBe('local-import-bundle.v0')
    expect(bundle.source).toMatchObject({
      id: 'src_sparrow_test',
      name: 'Sparrow Wallet',
      sourceType: 'wallet',
      requires3916Review: false,
    })
    expect(bundle.import).toMatchObject({
      id: 'imp_sparrow_test',
      sourceId: 'src_sparrow_test',
      fileName: 'sparrow-export.csv',
      fileFingerprint: 'test-file-fingerprint',
      importStatus: 'imported',
      rowCount: 1,
      errorCount: 0,
    })
    expect(bundle.rawRows).toHaveLength(1)
    expect(bundle.normalizedEvents).toHaveLength(1)
    expect(bundle.normalizedEvents[0]?.sourceRef.rawRowId).toBe(bundle.rawRows[0]?.id)
  })

  it('marks the import as partial when rows need review', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Txid',
      'Unconfirmed,Pending,10000,10000,,tx_test_pending',
    ].join('\n')

    const parseResult = parseSparrowTransactionsCsv(csv, context)
    const bundle = createSparrowImportBundle({
      ...context,
      fileName: 'sparrow-export.csv',
      fileFingerprint: 'test-file-fingerprint',
      importedAt,
      parseResult,
    })

    expect(bundle.import.importStatus).toBe('partial')
    expect(bundle.import.errorCount).toBe(1)
    expect(bundle.rawRows[0]?.parseStatus).toBe('needs_review')
  })

  it('exports deterministic JSON with a trailing newline', () => {
    const csv = [
      'Date (UTC),Label,Value,Balance,Fee,Txid',
      '2025-05-21 18:30:00,Incoming,0.00010000,0.00010000,,tx_test_incoming',
    ].join('\n')

    const parseResult = parseSparrowTransactionsCsv(csv, context)
    const bundle = createSparrowImportBundle({
      ...context,
      fileName: 'sparrow-export.csv',
      fileFingerprint: 'test-file-fingerprint',
      importedAt,
      parseResult,
    })

    const json = stringifyImportBundle(bundle)
    const parsed = JSON.parse(json)

    expect(json.endsWith('\n')).toBe(true)
    expect(parsed.schemaVersion).toBe('local-import-bundle.v0')
    expect(parsed.rawRows).toHaveLength(1)
    expect(parsed.normalizedEvents).toHaveLength(1)
  })
})

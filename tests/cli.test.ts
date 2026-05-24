import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { describe, expect, it } from 'vitest'

import { runCli } from '../src/cli/fiscalutxo.js'

describe('fiscalutxo CLI', () => {
  it('prints help', async () => {
    const result = await runCli(['--help'])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('fiscalutxo sparrow')
    expect(result.stderr).toBe('')
  })

  it('converts a Sparrow CSV file to JSON on stdout', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fiscalutxo-cli-'))
    const csvPath = join(dir, 'sparrow.csv')
    await writeFile(
      csvPath,
      [
        'Date (UTC),Label,Value,Balance,Fee,Txid',
        '2025-05-21 18:30:00,Incoming,0.00010000,0.00010000,,tx_test_cli',
      ].join('\n'),
      'utf8',
    )

    const result = await runCli([
      'sparrow',
      csvPath,
      '--source-id',
      'src_cli_test',
      '--import-id',
      'imp_cli_test',
      '--imported-at',
      '2026-05-24T17:30:00Z',
    ])

    const parsed = JSON.parse(result.stdout)

    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    expect(parsed.schemaVersion).toBe('local-import-bundle.v0')
    expect(parsed.source.id).toBe('src_cli_test')
    expect(parsed.import.id).toBe('imp_cli_test')
    expect(parsed.rawRows).toHaveLength(1)
    expect(parsed.normalizedEvents).toHaveLength(1)
  })

  it('writes JSON to a file when --out is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fiscalutxo-cli-'))
    const csvPath = join(dir, 'sparrow.csv')
    const outPath = join(dir, 'bundle.json')
    await writeFile(
      csvPath,
      [
        'Date (UTC),Label,Value,Balance,Fee,Txid',
        '2025-05-21 18:30:00,Outgoing,-0.00070000,0.01000000,0.00000120,tx_test_cli_out',
      ].join('\n'),
      'utf8',
    )

    const result = await runCli(['sparrow', csvPath, '--out', outPath])
    const json = await readFile(outPath, 'utf8')
    const parsed = JSON.parse(json)

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('')
    expect(parsed.normalizedEvents[0].direction).toBe('out')
    expect(parsed.normalizedEvents[0].taxableStatus).toBe('needs_review')
  })

  it('returns a non-zero exit code for missing input', async () => {
    const result = await runCli(['sparrow'])

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Missing input CSV path')
  })
})

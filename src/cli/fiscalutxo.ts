#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'
import process from 'node:process'

import {
  createSparrowImportBundle,
  parseSparrowTransactionsCsv,
  stringifyImportBundle,
} from '../index.js'

type CliOptions = {
  command: 'sparrow' | 'help' | 'invalid'
  inputPath?: string
  outPath?: string
  sourceId?: string
  importId?: string
  importedAt?: string
}

type CliResult = {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCli(argv: string[]): Promise<CliResult> {
  const parsed = parseArgs(argv)

  if (parsed.command === 'help') {
    return {
      exitCode: 0,
      stdout: `${usage()}\n`,
      stderr: '',
    }
  }

  if (parsed.command === 'invalid') {
    return { exitCode: 1, stdout: '', stderr: 'Unknown command or invalid arguments. Use --help.\n' }
  }

  if (!parsed.inputPath) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `Missing input CSV path.\n\n${usage()}\n`,
    }
  }

  try {
    const csv = await readFile(parsed.inputPath, 'utf8')
    const importedAt = parsed.importedAt ?? new Date().toISOString()
    const sourceId = parsed.sourceId ?? 'src_sparrow_cli'
    const importId = parsed.importId ?? buildImportId(parsed.inputPath, csv)
    const parseResult = parseSparrowTransactionsCsv(csv, { sourceId, importId })
    const bundle = createSparrowImportBundle({
      sourceId,
      importId,
      fileName: basename(parsed.inputPath),
      fileFingerprint: createSha256Fingerprint(csv),
      importedAt,
      parseResult,
    })
    const json = stringifyImportBundle(bundle)
    const exitCode = bundle.import.importStatus === 'failed' ? 2 : bundle.import.importStatus === 'partial' ? 3 : 0
    const diagnostics = [...bundle.errors, ...bundle.rawRows.filter(row => row.parseErrors.length)
      .map(row => 'Row ' + row.rowNumber + ': ' + row.parseErrors.join(', '))]
    const stderr = diagnostics.length ? diagnostics.join('\n') + '\n' : ''

    if (parsed.outPath) {
      await writeFile(parsed.outPath, json, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
      return {
        exitCode,
        stdout: '',
        stderr,
      }
    }

    return {
      exitCode,
      stdout: json,
      stderr,
    }
  } catch (error) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${error instanceof Error ? error.message : String(error)}\n`,
    }
  }
}

function parseArgs(argv: string[]): CliOptions {
  const [command, ...rest] = argv

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    return { command: 'help' }
  }

  if (command !== 'sparrow') {
    return { command: 'invalid' }
  }

  const options: CliOptions = { command: 'sparrow' }

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    const next = rest[index + 1]

    if (!arg) {
      continue
    }

    if (arg === '--out' && next) {
      options.outPath = next
      index += 1
      continue
    }

    if (arg === '--source-id' && next) {
      options.sourceId = next
      index += 1
      continue
    }

    if (arg === '--import-id' && next) {
      options.importId = next
      index += 1
      continue
    }

    if (arg === '--imported-at' && next) {
      options.importedAt = next
      index += 1
      continue
    }

    if (!arg.startsWith('-') && !options.inputPath) {
      options.inputPath = arg
      continue
    }

    return { command: 'invalid' }
  }

  return options
}

function usage(): string {
  return [
    'Usage:',
    '  fiscalutxo sparrow <transactions.csv> [--out bundle.json] [--source-id id] [--import-id id] [--imported-at iso-date]',
    '',
    'Description:',
    '  Convert a local Sparrow Wallet transactions CSV export into a local import JSON bundle.',
    '',
    'Security:',
    '  The command reads a local file and does not perform network calls.',
  ].join('\n')
}

function createSha256Fingerprint(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`
}

function buildImportId(inputPath: string, csv: string): string {
  return `imp_sparrow_${basename(inputPath).replace(/[^a-zA-Z0-9]+/g, '_')}_${createHash('sha256').update(csv).digest('hex').slice(0, 12)}`
}

const isMainModule = process.argv[1]?.endsWith('/fiscalutxo.js') || process.argv[1]?.endsWith('\\fiscalutxo.js')

if (isMainModule) {
  const result = await runCli(process.argv.slice(2))
  if (result.stdout) {
    process.stdout.write(result.stdout)
  }
  if (result.stderr) {
    process.stderr.write(result.stderr)
  }
  process.exitCode = result.exitCode
}

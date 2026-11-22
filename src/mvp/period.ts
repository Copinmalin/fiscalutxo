import type { Project } from './project.js'

// Midnight in mainland France on 1 January is 23:00 UTC on 31 December.
export function fiscalPeriod(year: number) {
  return {
    start: (year - 1) + '-12-31T23:00:00.000Z',
    end: year + '-12-31T23:00:00.000Z',
  }
}

export function inFiscalPeriod(date: string, year: number) {
  const { start, end } = fiscalPeriod(year)
  const timestamp = Date.parse(date)
  return timestamp >= Date.parse(start) && timestamp < Date.parse(end)
}

function utcDate(value?: string) {
  const normalized = value?.trim().replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/, '$1T$2Z')
  if (!normalized || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(normalized)) return undefined
  const timestamp = Date.parse(normalized)
  if (!Number.isFinite(timestamp)) return undefined
  const iso = new Date(timestamp).toISOString()
  if (iso.slice(0, 19) === normalized.slice(0, 19)) return iso
}

export function importedDate(payload: Record<string, string>, occurredAt?: string | null) {
  // Older Sparrow bundles used 1970-01-01 for undated transactions.
  const eventDate = occurredAt?.startsWith('1970-01-01') ? undefined : utcDate(occurredAt ?? undefined)
  return eventDate ?? utcDate(payload['Date (UTC)']) ?? utcDate(payload.date_utc)
}

export function sourceRows(project: Project) {
  return project.imports.flatMap(bundle => {
    const events = new Map(bundle.normalizedEvents.map(event => [event.sourceRef.rawRowId, event]))
    return bundle.rawRows.map(row => {
      const event = events.get(row.id)
      const date = importedDate(row.rawPayload, event?.occurredAt)
      return {
        id: row.id, row, event, bundle, date, operation: project.operations[row.id],
        outsidePeriod: Boolean(date && !inFiscalPeriod(date, project.year)),
        title: bundle.source.name + ' · ' + bundle.import.fileName + ' · ligne ' + row.rowNumber,
      }
    })
  })
}

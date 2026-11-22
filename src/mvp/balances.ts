import { fiscalPeriod, importedDate } from './period.js'
import type { Operation, Project } from './project.js'

const maxSats = 2_100_000_000_000_000n

export function importedBalanceAfter(payload: Record<string, string>) {
  for (const [header, raw] of Object.entries(payload)) {
    const unit = /^Balance \((BTC|sats?)\)$/i.exec(header)?.[1]?.toLowerCase()
    if (!unit) continue
    const match = (unit === 'btc' ? /^(\d+)(?:[.,](\d{1,8}))?$/ : /^(\d+)$/).exec(raw.trim())
    if (!match) return null
    const balance = BigInt(unit === 'btc' ? match[1] + (match[2] ?? '').padEnd(8, '0') : match[1]!)
    return balance <= maxSats ? balance : null
  }
  return null
}

type Movement = { id: string; date: number; delta: bigint | null; operation?: Operation; after: bigint | null; txid?: string }
type SourceBalance = { id: string; name: string; sats: number | null; reason?: string; automatic?: boolean }

export function walletBalances(project: Project, at: string, selected?: string, newManual = false) {
  const target = Date.parse(at)
  const opening = Date.parse(fiscalPeriod(project.year).start)
  const sources = project.sources ?? []
  const sourceIds = new Set(sources.map(source => source.id))
  const unassigned = project.imports.some(bundle => !sourceIds.has(bundle.source.id)) ||
    Object.values(project.operations).some(op => !op.rowId && !op.sourceId)
  const imported = new Map(project.imports.flatMap(bundle => bundle.normalizedEvents.map(event => [
    event.sourceRef.rawRowId, { source: bundle.source.id, event },
  ] as const)))
  const accounts = sources.map((source): SourceBalance => {
    const base = { id: source.id, name: source.name }
    const missing = (reason: string): SourceBalance => ({ ...base, sats: null, reason })
    if (!source.coverage) return missing('Confirmez la couverture de l’historique.')
    const movements: Movement[] = []
    for (const bundle of project.imports.filter(item => item.source.id === source.id)) {
      if (bundle.import.importStatus === 'failed') return missing('Un fichier de cette source est illisible.')
      const events = new Map(bundle.normalizedEvents.map(event => [event.sourceRef.rawRowId, event]))
      for (const row of bundle.rawRows) {
        const event = events.get(row.id)
        const operation = project.operations[row.id]
        const timestamp = Date.parse(importedDate(row.rawPayload, event?.occurredAt) ?? operation?.date ?? '')
        const direction = event?.direction ?? (operation?.type === 'achat' ? 'in' :
          operation?.type === 'vente' || operation?.type === 'paiement' ? 'out' : undefined)
        const quantity = operation?.sats ?? event?.quantitySats
        const delta = quantity === undefined || !direction ? null :
          direction === 'in' ? BigInt(quantity) : direction === 'out' ? -BigInt(quantity) :
          direction === 'internal' && quantity === 0 ? 0n : null
        const txid = (event?.txid ?? row.rawPayload.Txid ?? row.rawPayload.txid)?.toLowerCase()
        movements.push({
          id: row.id, date: timestamp, delta, after: event && delta !== null && quantity === event.quantitySats
            ? importedBalanceAfter(row.rawPayload) : null,
          ...(txid ? { txid } : {}), ...(operation ? { operation } : {}),
        })
      }
    }
    for (const [id, op] of Object.entries(project.operations)) {
      if (op.rowId || op.sourceId !== source.id || (op.type === 'paiement' && op.peer)) continue
      const delta = op.sats === undefined ? null :
        op.type === 'achat' ? BigInt(op.sats) : ['vente', 'paiement'].includes(op.type) ? -BigInt(op.sats) : null
      movements.push({ id, date: Date.parse(op.date ?? ''), delta, after: null, operation: op })
    }

    const byId = new Map(movements.map(movement => [movement.id, movement]))
    const active = movements.filter(movement => {
      const op = movement.operation
      if (op?.type !== 'doublon' || !op.peer || !op.reference) return true
      const original = byId.get(op.peer)
      return !original || original.id === movement.id || original.operation?.type === 'doublon' ||
        !movement.txid || movement.txid !== original.txid || movement.date !== original.date ||
        (movement.delta !== null && movement.delta !== original.delta)
    })
    if (active.some(move => !Number.isFinite(move.date))) return missing('Une ligne est sans date fiable.')
    active.sort((a, b) => a.date - b.date)
    const automatic = active.filter((move, index) => move.after !== null && move.delta !== null &&
      active[index - 1]?.date !== move.date && active[index + 1]?.date !== move.date)
    const firstAfterOpening = automatic.find(move => move.date >= opening)
    const lastBeforeOpening = automatic.filter(move => move.date < opening).at(-1)
    const snapshot = firstAfterOpening ?? lastBeforeOpening
    if (!source.anchor && !snapshot) return missing('Ajoutez un solde de référence daté.')
    const anchorDate = source.anchor ? Date.parse(source.anchor.date) : snapshot!.date
    const anchorSats = source.anchor ? BigInt(source.anchor.sats) : snapshot!.after! - snapshot!.delta!
    if (newManual && anchorDate > target) return missing('Ajoutez un solde de référence antérieur à cette cession manuelle.')
    if (!Number.isFinite(target)) return missing('Renseignez la date de la cession.')
    const selectedMovement = selected ? byId.get(selected) : undefined
    if (selectedMovement && selectedMovement.date !== target) {
      return missing('La date saisie diffère de celle du mouvement utilisé pour reconstituer les soldes.')
    }

    const low = Math.min(anchorDate, target)
    const high = Math.max(anchorDate, target)
    const range = active.filter(move => move.date >= low && move.date < high)
    const txids = new Set<string>()
    for (const move of range) {
      if (move.delta === null || (move.txid && txids.has(move.txid))) {
        return missing('Vérifiez les quantités et les doublons dans l’historique.')
      }
      if (move.txid) txids.add(move.txid)
    }

    // For automatic valuation, the earlier operation history must have been reviewed.
    if (target !== opening || selected || newManual) {
      const prior = active.filter(move => move.date >= opening && move.date < target)
      for (const move of prior) {
        const op = move.operation
        if (!op || ['hors_perimetre', 'historique', 'post_cloture', 'doublon'].includes(op.type)) {
          return missing('Qualifiez les mouvements précédant cette cession.')
        }
        if (op.type === 'transfert') {
          const peer = op.peer ? project.operations[op.peer] : undefined
          const counterpart = op.peer ? imported.get(op.peer) : undefined
          const counterpartDate = Date.parse(counterpart?.event.occurredAt ?? peer?.date ?? '')
          const direction = move.delta === null ? null : move.delta < 0n ? 'out' : 'in'
          if (peer?.type !== 'transfert' || peer.peer !== move.id || peer.date !== op.date ||
              !counterpart || counterpart.source === source.id || !sourceIds.has(counterpart.source) ||
              !['in', 'out'].includes(counterpart.event.direction) || counterpart.event.direction === direction ||
              !Number.isFinite(counterpartDate) || counterpartDate >= target) {
            return missing('Rapprochez les deux côtés du transfert précédent.')
          }
        }
      }
      if (active.some(move => move.date === target && move.id !== selected && move.delta !== 0n)) {
        return missing('Précisez l’ordre des mouvements au même instant.')
      }
    }
    // Both reference balances and the target are measured immediately before their timestamp.
    let balance = anchorSats
    for (const move of range) balance += target >= anchorDate ? move.delta! : -move.delta!
    if (balance < 0n || balance > maxSats) return missing('Le solde reconstitué est incohérent.')
    let replay = target >= anchorDate ? anchorSats : balance
    for (const [index, move] of range.entries()) {
      replay += move.delta!
      if (range[index + 1]?.date === move.date || range[index - 1]?.date === move.date) continue
      if (replay < 0n || replay > maxSats || (move.after !== null && move.after !== replay)) {
        return missing('Le solde de référence et les mouvements ne concordent pas.')
      }
    }
    return { ...base, sats: Number(balance), automatic: !source.anchor }
  })
  const total = accounts.reduce((sum, account) => sum + BigInt(account.sats ?? 0), 0n)
  const sats = accounts.length && !unassigned && total <= maxSats && accounts.every(account => account.sats !== null)
    ? Number(total) : null
  return { accounts, sats, unassigned }
}

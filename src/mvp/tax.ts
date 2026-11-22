import type { Operation, Project } from './project.js'
import { walletBalances } from './balances.js'
import { fiscalPeriod, importedDate, inFiscalPeriod } from './period.js'

const PRECISION = 100_000_000n
const THRESHOLD = 30_500n
const sale = (item: Operation) => item.type === 'vente' || item.type === 'paiement'

const cent = (amount: bigint) =>
  Number(amount < 0n ? -((-amount + PRECISION / 2n) / PRECISION) : (amount + PRECISION / 2n) / PRECISION)

export function sourceRows(project: Project) {
  return project.imports.flatMap(bundle => {
    const byRow = new Map(bundle.normalizedEvents.map(event => [event.sourceRef.rawRowId, event]))
    return bundle.rawRows.map(row => ({
      row, bundle, event: byRow.get(row.id), operation: project.operations[row.id],
    }))
  })
}

export function calculate(project: Project) {
  const blockers: { id?: string; message: string }[] = []
  const block = (message: string, id?: string) => blockers.push(id ? { id, message } : { message })
  if (!project.complete) block('Confirmez que le dossier couvre tout le portefeuille fiscal du foyer et toutes ses opérations.')
  if (!project.accountsReviewed) block('Confirmez la revue des comptes, même en l’absence de compte étranger.')
  for (const bundle of project.imports) {
    if (bundle.import.importStatus === 'failed') block('Import illisible à corriger ou retirer', bundle.import.id)
  }
  const rows = sourceRows(project)
  const { start, end } = fiscalPeriod(project.year)
  const inventory = project.sources?.length ? walletBalances(project, start) : null
  if (inventory) {
    if (!project.opening.confirmed) block('Validez le capital d’acquisition à l’ouverture.')
    if (inventory.unassigned) block('Rattachez les imports et les saisies manuelles aux sources déclarées.')
    for (const account of inventory.accounts) {
      if (account.sats === null) block(account.name + ' · ' + account.reason)
    }
    if (inventory.sats === null && !inventory.unassigned && inventory.accounts.every(account => account.sats !== null)) {
      block('Le solde d’ouverture global dépasse la quantité maximale de BTC.')
    }
    if (inventory.sats === 0 && project.opening.acquisitions !== project.opening.used) {
      block('Un solde d’ouverture nul doit avoir un capital restant nul.')
    }
  }
  const outsideRows = new Set(rows.filter(item => {
    const date = importedDate(item.row.rawPayload, item.event?.occurredAt)
    return date && !inFiscalPeriod(date, project.year)
  }).map(item => item.row.id))
  const byRow = new Map(rows.filter(item => !outsideRows.has(item.row.id)).map(item => [item.row.id, item]))
  const activeKeys = new Set<string>()
  const exactDuplicates = new Map<string, string>()
  for (const item of byRow.values()) {
    const txid = item.event?.txid ?? item.row.rawPayload.Txid ?? item.row.rawPayload.txid
    const transactionKey = txid?.trim()
      ? JSON.stringify([item.bundle.source.id, txid.trim().toLowerCase()])
      : JSON.stringify([item.bundle.source.id, item.row.rawPayload])
    if (!item.operation) {
      block('Ligne source à qualifier ou à corriger', item.row.id)
      continue
    }
    if (item.operation.type === 'doublon') continue
    if (activeKeys.has(transactionKey)) block('Transaction déjà qualifiée sur cette source', item.row.id)
    activeKeys.add(transactionKey)
    exactDuplicates.set(item.row.id, transactionKey)
  }

  const timeline: { id: string; operation: Operation & { date: string; sats: number; reference: string } }[] = []
  for (const [id, operation] of Object.entries(project.operations)) {
    if (outsideRows.has(id)) continue
    if (operation.type === 'hors_perimetre') {
      block('Opération hors périmètre à traiter avant de déclarer', id)
      continue
    }
    const item = byRow.get(id)
    if (operation.type === 'doublon') {
      const peer = operation.peer ? byRow.get(operation.peer) : undefined
      const ownTx = item?.event?.txid ?? item?.row.rawPayload.Txid ?? item?.row.rawPayload.txid
      const samePayload = item && peer && JSON.stringify(item.row.rawPayload) === JSON.stringify(peer.row.rawPayload)
      const sameTx = ownTx && peer?.event?.txid?.toLowerCase() === ownTx.toLowerCase() &&
        (!item?.event || (item.event.direction === peer.event.direction && item.event.quantitySats === peer.event.quantitySats))
      if (!operation.reference || !peer || id === operation.peer || !item ||
          peer.bundle.source.id !== item.bundle.source.id || !exactDuplicates.has(peer.row.id) ||
          (!samePayload && !sameTx)) block('Doublon sans ligne originale correspondante et justification', id)
      continue
    }
    if (operation.type === 'historique' || operation.type === 'post_cloture') {
      const rawDate = item && importedDate(item.row.rawPayload, item.event?.occurredAt)
      const inHistoricalPeriod = (value: string) => Date.parse(value) < Date.parse(start)
      const afterClosing = (value: string) => Date.parse(value) >= Date.parse(end)
      const inPeriod = operation.type === 'historique' ? inHistoricalPeriod : afterClosing
      if (!operation.date || !inPeriod(operation.date) || !operation.reference || !item || (rawDate && !inPeriod(rawDate))) {
        block(operation.type === 'historique' ? 'Justifiez l’inclusion de cette ligne dans l’état d’ouverture' :
          'Justifiez la date postérieure à la clôture', id)
      }
      continue
    }
    const { date, sats, reference } = operation
    if (!date || !sats || !reference) {
      block('Date, quantité et justificatif requis', id)
      continue
    }
    if (!inFiscalPeriod(date, project.year)) {
      block('Date hors de l’année des opérations (' + project.year + ')', id)
      continue
    }
    if (item?.event && (operation.type === 'achat' && item.event.direction !== 'in' ||
        sale(operation) && item.event.direction !== 'out')) {
      block('Le sens de la transaction contredit la qualification', id)
      continue
    }
    if (operation.type === 'transfert') {
      const peer = operation.peer ? byRow.get(operation.peer) : undefined
      const validPair = item?.event && peer?.event && peer.operation?.peer === id &&
        peer.operation.type === 'transfert' && peer.operation.date === date &&
        item.bundle.source.id !== peer.bundle.source.id && item.event.direction !== peer.event.direction &&
        ['in', 'out'].includes(item.event.direction) && ['in', 'out'].includes(peer.event.direction)
      if (!validPair) {
        block('Reliez les deux lignes d’un transfert personnel et confirmez la même date', id)
        continue
      }
      if (item.event?.direction === 'out') {
        const received = peer.operation?.sats ?? 0
        const feeSats = sats - received
        const feeLines = Object.entries(project.operations).filter(([candidateId, candidate]) =>
          !outsideRows.has(candidateId) && candidate.type === 'paiement' && candidate.peer === id && candidate.sats === feeSats && candidate.date === date)
        const reportedFee = item.event.fee?.amountSats
        if (!received || feeSats < 0 || (reportedFee !== undefined && feeSats !== reportedFee) ||
            (feeSats > 0 && feeLines.length !== 1)) {
          block('Frais du transfert à rapprocher avec un paiement de service séparé', id)
        }
      }
      continue
    }
    if (operation.peer && (operation.type !== 'paiement' || project.operations[operation.peer]?.type !== 'transfert' ||
        byRow.get(operation.peer)?.event?.direction !== 'out')) {
      block('Le paiement des frais doit pointer vers la ligne sortante du transfert', id)
      continue
    }
    if (operation.gross === undefined || (sale(operation) && (!operation.gross || operation.fee === undefined ||
        operation.fee > operation.gross || !operation.portfolio ||
        operation.gross > operation.portfolio || !operation.valuationReference))) {
      block('Prix, frais et valorisation justifiée du portefeuille à compléter', id)
      continue
    }
    timeline.push({ id, operation: { ...operation, date, sats, reference } })
  }

  timeline.sort((a, b) => a.operation.date.localeCompare(b.operation.date) || a.id.localeCompare(b.id))
  let balance = BigInt(inventory ? inventory.sats ?? 0 : project.opening.sats)
  let acquisitions = BigInt(project.opening.acquisitions) * PRECISION
  let used = BigInt(project.opening.used) * PRECISION
  let proceeds = 0n
  let gain = 0n
  const disposals = []
  for (const [index, { id, operation }] of timeline.entries()) {
    if (index && timeline[index - 1]?.operation.date === operation.date) {
      block('Deux opérations fiscales au même instant. Précisez leur ordre avec les heures justificatives.', id)
    }
    if (operation.type === 'achat') {
      balance += BigInt(operation.sats)
      acquisitions += BigInt(operation.gross!) * PRECISION
      continue
    }
    const quantity = BigInt(operation.sats)
    if (balance < quantity) {
      block('Solde global insuffisant pour cette cession', id)
      continue
    }
    const gross = BigInt(operation.gross!)
    const fee = BigInt(operation.fee!)
    const net = gross - fee
    const portfolio = BigInt(operation.portfolio!)
    const basis = acquisitions - used
    const fraction = (basis * gross + portfolio / 2n) / portfolio
    const result = net * PRECISION - fraction
    const linked = byRow.get(id)
    disposals.push({
      id, date: operation.date, type: operation.type, sats: operation.sats, satsBefore: Number(balance),
      gross: Number(gross), fee: Number(fee), net: Number(net), portfolio: Number(portfolio),
      acquisitions: cent(acquisitions), used: cent(used), basis: cent(basis),
      fraction: cent(fraction), gain: cent(result), reference: operation.reference,
      valuationReference: operation.valuationReference!,
      source: linked?.bundle.source.name ?? project.sources?.find(source => source.id === operation.sourceId)?.name ?? 'Saisie manuelle',
      file: linked?.bundle.import.fileName ?? '', row: linked?.row.rowNumber ?? null,
    })
    gain += result
    proceeds += net
    balance -= quantity
    used += fraction
    if (balance === 0n && used !== acquisitions) {
      block('La cession épuise le solde de BTC mais laisse du capital. Vérifiez la valorisation et la quantité.', id)
    }
  }

  if (project.accounts.some(account => account.relevant && account.country !== 'FR' && !account.reference)) {
    block('Renseignez la référence de chaque compte étranger concerné.')
  }
  const ready = blockers.length === 0
  const exempt = proceeds <= THRESHOLD
  const assessable = !exempt && ready
  const totalGain = assessable ? cent(gain) : null
  const foreignAccounts = project.accounts.filter(account => account.relevant && account.country !== 'FR')
  return {
    year: project.year, ready, blockers, proceeds: Number(proceeds), exempt: ready ? exempt : null,
    disposals, totalGain, capitalRemaining: cent(acquisitions - used), remainingSats: Number(balance),
    report: { '3AN': totalGain && totalGain > 0 ? totalGain : null, '3BN': totalGain && totalGain < 0 ? -totalGain : null, '3CN': 'Choix utilisateur' },
    foreignAccounts,
  }
}

export type Calculation = ReturnType<typeof calculate>

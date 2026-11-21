import { request } from './transport.js'
import { fiscalPeriod, importedDate, inFiscalPeriod } from './period.js'

const $ = id => document.getElementById(id)
const operationForm = $('operation-form')
const dialog = $('operation-dialog')
const labels = {
  achat: 'Achat', vente: 'Vente', paiement: 'Paiement',
  transfert: 'Transfert personnel', doublon: 'Doublon',
  historique: 'Déjà inclus dans l’ouverture', post_cloture: 'Après la clôture', hors_perimetre: 'Hors périmètre',
}
const labelSuggestions = new Map([
  ['achat', 'achat'], ['buy', 'achat'],
  ['vente', 'vente'], ['sell', 'vente'],
  ['paiement', 'paiement'], ['payment', 'paiement'],
  ['transfert interne', 'transfert'], ['transfert personnel', 'transfert'], ['self transfer', 'transfert'],
])
const statuses = { imported: 'Importé', partial: 'À vérifier', failed: 'Échec' }
const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const money = cents => currency.format(cents / 100)
let project
let dirty = false
let busy = false
let selection = null
let priceDrafts = {}
let priceKind = null
let importedAcquisitionPrice = ''
let appliedPortfolioEstimate = ''
let appliedDisposalEstimate = ''
let ready = false

function element(tag, text, className) {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  if (className) node.className = className
  return node
}

function button(label, callback) {
  const node = element('button', label, 'secondary')
  node.type = 'button'
  node.addEventListener('click', callback)
  return node
}

function status(text, error = false, target = 'status') {
  $(target).textContent = text
  $(target).classList.toggle('error', error)
}

async function task(action, errorTarget) {
  if (busy) return
  busy = true
  $('workspace').inert = true
  try {
    await action()
  } catch (error) {
    status(error.message, true, errorTarget)
  } finally {
    $('workspace').inert = false
    busy = false
  }
}

function changed(text, target) {
  dirty = true
  ready = false
  render()
  $('result').replaceChildren()
  status(text, false, target)
}

async function readImportFile(file) {
  try {
    return await file.text()
  } catch {
    throw new Error('Impossible de lire le fichier. Enregistrez-le sur cet appareil ou collez son contenu dans le formulaire.')
  }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = element('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function rows() {
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

function indicativeCents(event) {
  const fiat = event?.fiat
  if (fiat?.currency !== 'EUR' || fiat.priceSource !== 'market_price' || !Number.isFinite(fiat.grossAmountCents)) {
    return null
  }
  return fiat.grossAmountCents
}

function estimatedEuros(event) {
  const cents = indicativeCents(event)
  if (cents === null) return null
  return money(event.direction === 'out' && cents > 0 ? -cents : cents)
}

function importedDisposalRate(entry, date) {
  const event = entry?.event
  const cents = indicativeCents(event)
  if (entry?.bundle?.import.parserName !== 'sparrow-transactions-csv' ||
      event?.direction !== 'out' || !event.quantitySats || !cents ||
      !event.occurredAt || Date.parse(date + 'Z') !== Date.parse(event.occurredAt)) return null
  const movedSats = BigInt(event.quantitySats)
  return sats => (sats * BigInt(cents) + movedSats / 2n) / movedSats
}

function updateDisposalEstimate() {
  const fields = operationForm.elements
  const rate = grossKind(fields.type.value) === 'cession' && importedDisposalRate(selection, fields.date.value)
  const sats = fields.sats.value
  const amount = rate && /^\d{1,16}$/.test(sats) && BigInt(sats) <= 2_100_000_000_000_000n
    ? rate(BigInt(sats)) : 0n
  const estimate = amount > 0n && amount <= 100_000_000_000_000n
    ? (Number(amount) / 100).toFixed(2).replace('.', ',') : ''
  const button = $('apply-disposal-estimate')
  $('disposal-estimate').hidden = !estimate
  if (estimate) button.textContent = 'Reprendre ' + money(Number(amount))
  if (grossKind(fields.type.value) === 'cession' && appliedDisposalEstimate && appliedDisposalEstimate !== estimate) {
    if (fields.gross.value === appliedDisposalEstimate) fields.gross.value = ''
    appliedDisposalEstimate = ''
  }
  return estimate
}

function importedWalletBalanceBefore(entry) {
  for (const [header, raw] of Object.entries(entry.row.rawPayload)) {
    const unit = /^Balance \((BTC|sats?)\)$/i.exec(header)?.[1].toLowerCase()
    if (!unit) continue
    const value = raw.trim()
    const match = (unit === 'btc' ? /^(\d+)(?:[.,](\d{1,8}))?$/ : /^(\d+)$/).exec(value)
    if (!match) return null
    const balanceAfter = BigInt(unit === 'btc' ? match[1] + (match[2] ?? '').padEnd(8, '0') : match[1])
    const balanceBefore = balanceAfter + BigInt(entry.event.quantitySats)
    return balanceBefore <= 2_100_000_000_000_000n ? balanceBefore : null
  }
  return null
}

function updatePortfolioEstimate() {
  const fields = operationForm.elements
  const isDisposal = fields.type.value === 'vente' || fields.type.value === 'paiement'
  const isSparrow = selection?.bundle?.import.parserName === 'sparrow-transactions-csv'
  const panel = $('portfolio-estimate')
  panel.hidden = !isDisposal || !isSparrow
  if (panel.hidden) return null

  const estimate = importedDisposalRate(selection, fields.date.value)
  const walletSats = estimate ? importedWalletBalanceBefore(selection) : null
  const message = $('portfolio-estimate-message')
  const controls = $('portfolio-estimate-controls')
  const apply = $('apply-portfolio-estimate')
  controls.hidden = walletSats === null
  apply.disabled = true
  apply.textContent = 'Reprendre l’estimation'
  if (controls.hidden) {
    message.textContent = 'Estimation indisponible. Il faut une sortie confirmée à la date importée, un solde et une valeur EUR Sparrow.'
    return null
  }

  message.textContent = 'Wallet importé avant cession : ' + walletSats.toLocaleString('fr-FR') +
    ' sats, soit environ ' + money(Number(estimate(walletSats))) + ' au cours journalier Sparrow.'
  const other = $('other-holdings').value.trim()
  if (!/^\d{1,16}$/.test(other)) return null
  const totalSats = walletSats + BigInt(other)
  if (totalSats > 2_100_000_000_000_000n) return null
  const total = estimate(totalSats)
  if (total > 100_000_000_000_000n) return null
  apply.disabled = false
  apply.textContent = 'Reprendre ' + money(Number(total))
  return Number(total)
}

function importedLabel(entry) {
  return entry?.event?.label || entry?.row?.rawPayload.Label?.trim() || ''
}

function movementSats(quantity, direction) {
  if (quantity === undefined) return '—'
  return (direction === 'out' && quantity > 0 ? '−' : '') + quantity.toLocaleString('fr-FR')
}

function suggestedQualification(entry) {
  const label = importedLabel(entry).split(':', 1)[0].trim().toLowerCase()
  const proposal = labelSuggestions.get(label)
  const direction = entry.event?.direction
  if (proposal === 'achat' && direction === 'in') return proposal
  if ((proposal === 'vente' || proposal === 'paiement') && direction === 'out') return proposal
  if (proposal === 'transfert' && (direction === 'in' || direction === 'out')) return proposal
  return null
}

function render(blockedRows = new Set()) {
  $('fiscal-year').value = project.year
  $('opening-title').textContent = 'Situation au 1er janvier ' + project.year
  $('accounts-year').textContent = 'J’ai vérifié les comptes ouverts, détenus, utilisés ou clos en ' + project.year + '.'
  const importNodes = project.imports.map(bundle => {
    const info = element('span', bundle.source.name + ' · ' + bundle.import.fileName + ' — ' +
      statuses[bundle.import.importStatus] + ' (' + bundle.rawRows.length + ' lignes)' +
      (bundle.errors.length ? ' · ' + bundle.errors.join(', ') : ''))
    const item = element('li')
    item.append(info, button('Retirer', () => {
      if (!confirm('Retirer cet import et ses qualifications du dossier ouvert ?')) return
      project.imports = project.imports.filter(value => value !== bundle)
      for (const row of bundle.rawRows) delete project.operations[row.id]
      project.complete = false
      changed('Import retiré du dossier ouvert.')
    }))
    return item
  })
  $('import-list').replaceChildren(...importNodes)
  const imported = rows()
  const activeRows = imported.filter(entry => !entry.outsidePeriod)
  const outside = imported.length - activeRows.length
  $('operation-period').textContent = 'Du 1er janvier au 31 décembre ' + project.year + ' (heure de Paris).' +
    (outside ? ' Lignes hors période conservées dans les imports : ' + outside + '.' : '')
  const operations = [
    ...activeRows,
    ...Object.entries(project.operations).filter(([, op]) => !op.rowId)
      .map(([id, operation]) => ({ id, operation, title: 'Saisie manuelle' })),
  ]
  $('operations-empty').hidden = operations.length > 0
  $('table-scroll').hidden = operations.length === 0
  const operationsTable = document.createDocumentFragment()
  for (const entry of operations) {
    const tr = element('tr')
    tr.dataset.id = entry.id
    const source = entry.bundle?.source.name ?? entry.title
    const label = importedLabel(entry) || (!entry.row ? entry.operation?.reference : '') || '—'
    const date = entry.operation?.date ?? entry.date
    const displayDate = date ? date.slice(0, 16).replace('T', ' ') : 'À confirmer'
    const quantity = entry.operation?.sats ?? entry.event?.quantitySats
    const estimate = estimatedEuros(entry.event) ?? '—'
    for (const [column, value, fullValue] of [
      ['source', source], ['label', label], ['date', displayDate, date],
      ['sats', movementSats(quantity, entry.event?.direction)], ['eur', estimate],
    ]) {
      const cell = element('td', value, 'col-' + column)
      cell.title = fullValue ?? value
      tr.append(cell)
    }

    const needsCorrection = entry.operation && blockedRows.has(entry.id)
    const proposal = entry.operation ? null : suggestedQualification(entry)
    const state = needsCorrection ? 'À corriger' : entry.operation ? labels[entry.operation.type] : 'À qualifier'
    tr.className = entry.operation && !needsCorrection ? 'operation-qualified' : 'operation-pending'
    const control = button(state, () => editOperation(entry))
    control.className = 'operation-status'
    control.title = proposal ? 'Suggestion : ' + labels[proposal] : state
    control.setAttribute('aria-label', (entry.operation ? 'Modifier la qualification' : 'Qualifier l’opération') +
      ' · ' + (label === '—' ? source : label) + ' · ' + control.title)
    const qualification = element('td', undefined, 'col-status')
    qualification.append(control)
    tr.append(qualification)
    tr.addEventListener('click', event => {
      if (control.contains(event.target)) return
      control.focus({ preventScroll: true })
      editOperation(entry)
    })
    operationsTable.append(tr)
  }
  $('operation-list').replaceChildren(operationsTable)
  $('account-list').replaceChildren(...project.accounts.map((account, index) => {
    const item = element('li')
    const foreign = account.relevant && account.country !== 'FR'
    item.append(element('span', account.entity + ' · ' + account.country + ' · ' + account.reference +
      (foreign ? ' · À renseigner au 3916-bis' : '')),
    button('Retirer', () => {
      project.accounts.splice(index, 1)
      project.accountsReviewed = false
      changed('Compte retiré du dossier ouvert.')
    }))
    return item
  }))
  $('complete').checked = project.complete
  $('accounts-reviewed').checked = project.accountsReviewed
  for (const node of document.querySelectorAll('[data-format]')) node.disabled = !ready
}

function renderOpening() {
  const fields = $('opening-form').elements
  fields.sats.value = project.opening.sats
  fields.acquisitions.value = (project.opening.acquisitions / 100).toFixed(2)
  fields.used.value = (project.opening.used / 100).toFixed(2)
  fields.reference.value = project.opening.reference
}

function parseEuros(value) {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim())
  if (!match) throw new Error('Saisissez les montants en euros avec au plus deux décimales.')
  const cents = Number(match[1] + (match[2] ?? '').padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_000_000) throw new Error('Montant trop grand.')
  return cents
}

function parseSats(value) {
  const sats = Number(value)
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(sats) || sats > 2_100_000_000_000_000) {
    throw new Error('Saisissez un nombre entier de satoshis.')
  }
  return sats
}

function editOperation(entry = null) {
  selection = entry
  const fields = operationForm.elements
  const values = entry?.operation ?? {}
  const raw = entry?.row?.rawPayload ?? {}
  operationForm.reset()
  appliedPortfolioEstimate = ''
  appliedDisposalEstimate = ''
  const allowed = entry?.row ? Object.keys(labels).filter(type =>
    !entry.date || type === values.type || !['historique', 'post_cloture'].includes(type)
  ) : ['achat', 'vente', 'paiement', 'hors_perimetre']
  fields.type.replaceChildren(...allowed.map(type => new Option(labels[type], type)))
  if (entry?.row) fields.type.prepend(new Option('Choisir une qualification', ''))
  const proposal = raw.type === 'depot' || raw.type === 'retrait' ? 'transfert' : raw.type
  fields.type.value = values.type ?? (allowed.includes(proposal) ? proposal : entry?.row ? '' : 'achat')
  const sourceDate = entry?.date ?? ''
  fields.date.value = (values.date ?? sourceDate ?? '').slice(0, 19)
  fields.sats.value = values.sats ?? entry?.event?.quantitySats ?? ''
  priceDrafts = {}
  priceKind = null
  importedAcquisitionPrice = ''
  const cents = indicativeCents(entry?.event)
  if (entry?.event?.direction === 'in' && cents !== null) {
    importedAcquisitionPrice = (cents / 100).toFixed(2).replace('.', ',')
    priceDrafts.achat = importedAcquisitionPrice
  }
  const importedKind = grossKind(proposal)
  if (importedKind && raw.prix_eur) priceDrafts[importedKind] = raw.prix_eur
  const savedKind = grossKind(values.type)
  if (savedKind && values.gross !== undefined) priceDrafts[savedKind] = String(values.gross / 100)
  fields.fee.value = values.fee === undefined ? raw.frais_eur ?? '' : values.fee / 100
  fields.portfolio.value = values.portfolio === undefined ? raw.portefeuille_eur ?? '' : values.portfolio / 100
  fields.reference.value = values.reference ??
    (raw.justificatif || importedLabel(entry)).slice(0, fields.reference.maxLength)
  fields.valuationReference.value = values.valuationReference ?? raw.valorisation ?? ''
  $('row-source').hidden = !entry?.row
  $('row-source').textContent = entry?.bundle?.source.name ?? ''
  $('row-summary').hidden = !entry?.row
  if (entry?.row) {
    $('row-line').textContent = entry.row.rowNumber
    $('row-label').textContent = importedLabel(entry) || '—'
    $('row-sats').textContent = movementSats(entry.event?.quantitySats, entry.event?.direction)
    $('row-eur-estimate').textContent = estimatedEuros(entry.event) ?? '—'
  }
  const diagnostics = entry?.row?.parseErrors ?? []
  $('row-diagnostics').hidden = diagnostics.length === 0
  $('row-diagnostics').replaceChildren(...diagnostics.map(message => element('li', message)))
  const suggestion = entry?.row && !entry.operation ? suggestedQualification(entry) : null
  $('apply-label-suggestion').hidden = !suggestion
  $('apply-label-suggestion').textContent = suggestion ? 'Utiliser la suggestion : ' + labels[suggestion] : ''
  $('operation-error').textContent = ''
  $('clear-operation').hidden = !entry?.operation
  updateOperationFields(values.peer)
  dialog.showModal()
}

function grossKind(type) {
  if (type === 'achat') return 'achat'
  return type === 'vente' || type === 'paiement' ? 'cession' : null
}

function updateOperationFields(selectedPeer) {
  const fields = operationForm.elements
  const type = fields.type.value
  const disposal = type === 'vente' || type === 'paiement'
  const nextPriceKind = grossKind(type)
  if (priceKind !== nextPriceKind) {
    if (priceKind) priceDrafts[priceKind] = fields.gross.value
    fields.gross.value = nextPriceKind ? priceDrafts[nextPriceKind] ?? '' : ''
    priceKind = nextPriceKind
  }
  $('acquisition-estimate-note').hidden = type !== 'achat' || !importedAcquisitionPrice ||
    selection?.operation?.type === 'achat'
  const visible = {
    date: !['doublon', 'hors_perimetre'].includes(type),
    sats: !['doublon', 'historique', 'post_cloture', 'hors_perimetre'].includes(type),
    gross: type === 'achat' || disposal,
    fee: disposal,
    portfolio: disposal,
    valuationReference: disposal,
    peer: ['doublon', 'transfert', 'paiement'].includes(type),
  }
  for (const [field, show] of Object.entries(visible)) {
    fields[field].closest(field === 'gross' ? '#gross-field' : 'label').hidden = !show
    fields[field].disabled = !show
    fields[field].required = show && (field !== 'peer' || type !== 'paiement')
  }
  const { start, end } = fiscalPeriod(project.year)
  fields.date.min = type === 'historique' || type === 'post_cloture' ? '' : start.slice(0, 19)
  fields.date.max = type === 'historique' || type === 'post_cloture' ? '' :
    new Date(Date.parse(end) - 1000).toISOString().slice(0, 19)
  fields.reference.required = type !== 'hors_perimetre'
  $('gross-label').querySelector('span').textContent = type === 'achat' ? 'Prix d’acquisition justifié en €' : 'Prix de cession avant frais en €'
  $('peer-label').textContent = type === 'paiement' ? 'Transfert lié si paiement de frais réseau' : 'Autre ligne du transfert ou original du doublon'
  const txid = selection?.event?.txid ?? selection?.row?.rawPayload.Txid
  const candidates = rows().filter(item => !item.outsidePeriod && item.id !== selection?.id)
  const linked = item => txid && item.event?.txid?.toLowerCase() === txid.toLowerCase()
  candidates.sort((a, b) => Number(Boolean(linked(b))) - Number(Boolean(linked(a))))
  fields.peer.replaceChildren(new Option('Choisir une ligne', ''),
    ...candidates.map(item => {
      const quantity = item.event?.quantitySats
      const sats = quantity === undefined ? 'Sats indisponibles' : movementSats(quantity, item.event.direction) + ' sats'
      const parts = ['Ligne ' + item.row.rowNumber, item.bundle.source.name, importedLabel(item) || 'Sans label', sats]
      if (linked(item)) parts.push('même txid')
      return new Option(parts.join(' · '), item.id)
    }))
  fields.peer.value = selectedPeer ?? ''
  updateDisposalEstimate()
  updatePortfolioEstimate()
}

$('opening-form').addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(event.currentTarget)
  try {
    const acquisitions = parseEuros(data.get('acquisitions'))
    const used = parseEuros(data.get('used'))
    if (used > acquisitions) throw new Error('Le capital consommé doit rester inférieur ou égal aux acquisitions.')
    const sats = parseSats(data.get('sats'))
    if (!sats && acquisitions !== used) throw new Error('Un solde nul doit avoir un capital restant nul.')
    const reference = data.get('reference').trim()
    if (!reference) throw new Error('Ajoutez un justificatif.')
    project.opening = { sats, acquisitions, used, reference }
    changed('État d’ouverture validé.')
  } catch (error) {
    status(error.message, true)
  }
})

$('import-form').addEventListener('submit', event => {
  event.preventDefault()
  const form = event.currentTarget
  const data = new FormData(form)
  const file = form.elements.file.files[0]
  const pasted = data.get('content')
  const hasPaste = pasted.trim().length > 0
  status('', false, 'import-status')
  void task(async () => {
    if (!file && !hasPaste) throw new Error('Choisissez un fichier ou collez son contenu.')
    const format = data.get('format')
    const content = hasPaste ? pasted : await readImportFile(file)
    if (!content.trim()) throw new Error('Le fichier sélectionné est vide.')
    const response = await request('import', {
      project, format, source: data.get('source').trim(),
      name: hasPaste ? (format === 'bundle' ? 'import-collé.json' : 'import-collé.csv') : file.name,
      content,
    })
    if (response.duplicate) {
      status('Ce fichier figure déjà dans le dossier.', false, 'import-status')
      return
    }
    project = response.project
    project.complete = false
    project.accountsReviewed = false
    form.reset()
    form.querySelector('details').open = false
    changed(response.status === 'imported' ? 'Import ajouté. Vérifiez les opérations.' : 'Import conservé. Vérifiez les anomalies.', 'import-status')
  }, 'import-status')
})

$('template').addEventListener('click', () => download(new Blob([
  'date_utc,type,sats,prix_eur,frais_eur,portefeuille_eur,justificatif,valorisation,txid\r\n',
], { type: 'text/csv' }), 'fiscalutxo-modele.csv'))

$('add-operation').addEventListener('click', () => editOperation())
$('cancel-operation').addEventListener('click', () => dialog.close())
$('apply-label-suggestion').addEventListener('click', () => {
  const proposal = selection && suggestedQualification(selection)
  if (!proposal) return
  operationForm.elements.type.value = proposal
  updateOperationFields(operationForm.elements.peer.value)
})
operationForm.elements.type.addEventListener('change', () => updateOperationFields(operationForm.elements.peer.value))
$('other-holdings').addEventListener('input', updatePortfolioEstimate)
operationForm.elements.sats.addEventListener('input', updateDisposalEstimate)
$('apply-disposal-estimate').addEventListener('click', () => {
  const estimate = updateDisposalEstimate()
  if (!estimate) return
  appliedDisposalEstimate = estimate
  operationForm.elements.gross.value = estimate
  operationForm.elements.gross.focus()
})
operationForm.elements.date.addEventListener('input', () => {
  const fields = operationForm.elements
  if (appliedPortfolioEstimate && fields.portfolio.value === appliedPortfolioEstimate &&
      Date.parse(fields.date.value + 'Z') !== Date.parse(selection?.event?.occurredAt)) {
    fields.portfolio.value = ''
    appliedPortfolioEstimate = ''
  }
  updateDisposalEstimate()
  updatePortfolioEstimate()
})
$('apply-portfolio-estimate').addEventListener('click', () => {
  const estimate = updatePortfolioEstimate()
  if (estimate === null) return
  appliedPortfolioEstimate = (estimate / 100).toFixed(2).replace('.', ',')
  operationForm.elements.portfolio.value = appliedPortfolioEstimate
  operationForm.elements.portfolio.focus()
})
$('clear-operation').addEventListener('click', () => {
  delete project.operations[selection.id]
  dialog.close()
  changed('Qualification retirée.')
})
operationForm.addEventListener('submit', event => {
  event.preventDefault()
  const data = new FormData(operationForm)
  try {
    const op = { type: data.get('type') }
    if (selection?.row) op.rowId = selection.id
    if (data.get('date')) {
      const timestamp = data.get('date')
      op.date = new Date(timestamp + 'Z').toISOString()
    }
    if (data.get('sats')) op.sats = parseSats(data.get('sats'))
    for (const field of ['gross', 'fee', 'portfolio']) {
      const value = data.get(field)
      if (value) op[field] = parseEuros(value)
    }
    for (const field of ['reference', 'valuationReference', 'peer']) {
      const value = data.get(field)?.trim()
      if (value) op[field] = value
      else if (operationForm.elements[field].required) throw new Error('Complétez tous les justificatifs et liens requis.')
    }
    project.operations[selection?.id ?? 'manual:' + crypto.randomUUID()] = op
    dialog.close()
    changed('Qualification enregistrée dans le dossier ouvert.')
  } catch (error) {
    $('operation-error').textContent = error.message
  }
})

$('account-form').addEventListener('submit', event => {
  event.preventDefault()
  const form = event.currentTarget
  const data = new FormData(form)
  const entity = data.get('entity').trim()
  const reference = data.get('reference').trim()
  const country = data.get('country').trim().toUpperCase()
  if (!entity || !reference) {
    status('Renseignez l’entité et la référence du compte.', true)
    return
  }
  if (project.accounts.some(account => account.entity === entity && account.country === country && account.reference === reference)) {
    status('Ce compte est déjà renseigné.')
    return
  }
  project.accounts.push({ entity, country, reference, relevant: true })
  project.accountsReviewed = false
  form.reset()
  changed('Compte ajouté.')
})
$('accounts-reviewed').addEventListener('change', event => {
  project.accountsReviewed = event.target.checked
  changed('Revue des comptes mise à jour.')
})
$('complete').addEventListener('change', event => {
  project.complete = event.target.checked
  changed('Périmètre du dossier mis à jour.')
})

$('calculate').addEventListener('click', () => void task(async () => {
  const checked = await request('check', project)
  project = checked.project
  const result = checked.result
  ready = result.ready
  render(new Set(result.blockers.map(blocker => blocker.id)))
  const panel = $('result')
  panel.replaceChildren(element('h3', ready ? 'Dossier contrôlé' : 'Dossier à compléter'))
  panel.classList.toggle('pending', !ready)
  if (!ready) {
    const list = element('ul')
    for (const blocker of result.blockers) {
      const entry = rows().find(row => row.id === blocker.id)
      list.append(element('li', blocker.message + (entry ? ' · ' + entry.title : '')))
    }
    panel.append(list)
  } else {
    panel.append(element('p', 'Total des prix de cession nets : ' + money(result.proceeds)))
    if (result.exempt) panel.append(element('p', result.disposals.length ?
      'Cessions exonérées. Renseignez leurs prix dans la 2086.' : 'Aucune cession à reporter.'))
    else {
      for (const [field, label] of [['3AN', 'Plus-value nette'], ['3BN', 'Moins-value nette']]) {
        if (result.report[field] !== null) panel.append(element('p', field + ' · ' + label + ' : ' + money(result.report[field])))
      }
      if (!result.totalGain) panel.append(element('p', 'Solde annuel : 0,00 €'))
      panel.append(element('p', '3CN · Option au barème à choisir lors de la déclaration.'))
    }
    panel.append(element('p', '3916-bis · ' + result.foreignAccounts.length + ' compte(s) à déclarer.'))
    if (result.disposals.length) {
      const detail = element('details')
      detail.append(element('summary', 'Voir les cessions'))
      const list = element('ul')
      for (const row of result.disposals) {
        list.append(element('li', row.date + ' · ' + labels[row.type] + ' · ' + money(row.net) +
          (result.exempt ? '' : ' · Résultat : ' + money(row.gain)) + ' · ' + row.reference))
      }
      detail.append(list)
      panel.append(detail)
    }
  }
  status(ready ? 'Contrôle terminé. Les exports sont disponibles.' : 'Contrôle terminé. Consultez les points à compléter.')
}))
for (const node of document.querySelectorAll('[data-format]')) {
  node.addEventListener('click', () => void task(async () => {
    const format = node.dataset.format
    const filename = format === 'pdf' ? 'fiscalutxo-aide-2086-' + (project.year + 1) + '.pdf' : 'fiscalutxo-' + project.year + '.' + format
    download(await request('export', { project, format }, true), filename)
    status('Rapport ' + format.toUpperCase() + ' téléchargé.')
  }))
}

$('fiscal-year').addEventListener('change', event => {
  const year = Number(event.target.value)
  event.target.value = project.year
  if (year === project.year) return
  if (dirty && !confirm('Ouvrir un nouveau dossier pour cette campagne ? Les modifications non enregistrées seront perdues.')) return
  void task(async () => {
    project = await request('new', year)
    dirty = false
    ready = false
    $('result').replaceChildren()
    status('')
    status('', false, 'import-status')
    renderOpening()
    render()
  })
})

$('load-demo').addEventListener('click', () => {
  if (dirty && !confirm('Remplacer le dossier ouvert et ses modifications non enregistrées ?')) return
  void task(async () => {
    project = await request('demo', project.year)
    dirty = false
    ready = false
    $('result').replaceChildren()
    renderOpening()
    render()
    status('Dossier fictif chargé. Ouvrez les résultats et lancez le contrôle.')
  })
})

$('open-button').addEventListener('click', () => {
  if (!busy && (!dirty || confirm('Remplacer le dossier ouvert et ses modifications non enregistrées ?'))) $('open-file').click()
})
$('open-file').addEventListener('change', event => {
  const file = event.target.files[0]
  event.target.value = ''
  if (!file) return
  void task(async () => {
    const saved = JSON.parse(await file.text())
    const checked = await request('check', saved)
    project = checked.project
    dirty = false
    ready = false
    $('result').replaceChildren()
    renderOpening()
    render()
    status('Dossier local ouvert.')
  })
})
$('save-button').addEventListener('click', () => {
  if (busy || !project) return
  download(new Blob([JSON.stringify(project, null, 2) + '\n'], { type: 'application/json' }), 'fiscalutxo-dossier-' + project.year + '.json')
  dirty = false
  status('Dossier téléchargé. Conservez ce fichier hors du dépôt.')
})
window.addEventListener('beforeunload', event => {
  if (!dirty) return
  event.preventDefault()
  event.returnValue = true
})
void task(async () => {
  project = await request('new')
  renderOpening()
  render()
})

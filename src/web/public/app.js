import { request } from './transport.js'

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
    return bundle.rawRows.map(row => ({
      id: row.id, row, event: events.get(row.id), bundle, operation: project.operations[row.id],
      title: bundle.source.name + ' · ' + bundle.import.fileName + ' · ligne ' + row.rowNumber,
    }))
  })
}

function estimatedEuros(event) {
  const fiat = event?.fiat
  if (fiat?.currency !== 'EUR' || fiat.priceSource !== 'market_price' || !Number.isFinite(fiat.grossAmountCents)) {
    return null
  }
  const cents = fiat.grossAmountCents
  return money(event.direction === 'out' && cents > 0 ? -cents : cents)
}

function importedLabel(entry) {
  return entry.event?.label || entry.row?.rawPayload.Label?.trim() || ''
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

function render() {
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
  const operations = [
    ...rows(),
    ...Object.entries(project.operations).filter(([, op]) => !op.rowId)
      .map(([id, operation]) => ({ id, operation, title: 'Saisie manuelle' })),
  ]
  $('operations-empty').hidden = operations.length > 0
  $('table-scroll').hidden = operations.length === 0
  const operationsTable = document.createDocumentFragment()
  for (const entry of operations) {
    const tr = element('tr')
    tr.dataset.id = entry.id
    const reference = entry.row?.rawPayload.justificatif
    tr.append(element('td', entry.title + (reference ? ' · ' + reference : '')))
    tr.append(element('td', importedLabel(entry) || '—'))
    tr.append(element('td', entry.operation?.date ?? entry.event?.occurredAt ?? 'À confirmer'))
    const quantity = entry.operation?.sats ?? entry.event?.quantitySats
    tr.append(element('td', movementSats(quantity, entry.event?.direction)))
    tr.append(element('td', estimatedEuros(entry.event) ?? '—'))
    const proposal = entry.operation ? null : suggestedQualification(entry)
    tr.append(element('td', entry.operation ? labels[entry.operation.type] :
      proposal ? 'Suggestion : ' + labels[proposal] : 'À revoir'))
    const action = element('td')
    action.append(button(entry.operation ? 'Modifier' : 'Qualifier', () => editOperation(entry)))
    tr.append(action)
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
  const allowed = entry?.row ? Object.keys(labels) : ['achat', 'vente', 'paiement', 'hors_perimetre']
  fields.type.replaceChildren(...allowed.map(type => new Option(labels[type], type)))
  if (entry?.row) fields.type.prepend(new Option('Choisir une qualification', ''))
  const proposal = raw.type === 'depot' || raw.type === 'retrait' ? 'transfert' : raw.type
  fields.type.value = values.type ?? (allowed.includes(proposal) ? proposal : entry?.row ? '' : 'achat')
  const sourceDate = entry?.event?.occurredAt ?? raw.date_utc ?? ''
  fields.date.value = (values.date ?? sourceDate ?? '').slice(0, 19)
  fields.sats.value = values.sats ?? entry?.event?.quantitySats ?? ''
  fields.gross.value = values.gross === undefined ? raw.prix_eur ?? '' : values.gross / 100
  fields.fee.value = values.fee === undefined ? raw.frais_eur ?? '' : values.fee / 100
  fields.portfolio.value = values.portfolio === undefined ? raw.portefeuille_eur ?? '' : values.portfolio / 100
  fields.reference.value = values.reference ?? raw.justificatif ?? ''
  fields.valuationReference.value = values.valuationReference ?? raw.valorisation ?? ''
  $('row-summary').hidden = !entry?.row
  if (entry?.row) {
    $('row-line').textContent = entry.row.rowNumber
    $('row-date').textContent = raw['Date (UTC)'] || raw.date_utc || entry.event?.occurredAt || '—'
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

function updateOperationFields(selectedPeer) {
  const fields = operationForm.elements
  const type = fields.type.value
  const disposal = type === 'vente' || type === 'paiement'
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
    fields[field].closest('label').hidden = !show
    fields[field].disabled = !show
    fields[field].required = show && (field !== 'peer' || type !== 'paiement')
  }
  fields.reference.required = type !== 'hors_perimetre'
  $('gross-label').querySelector('span').textContent = type === 'achat' ? 'Prix d’acquisition justifié en €' : 'Prix de cession avant frais en €'
  $('peer-label').textContent = type === 'paiement' ? 'Transfert lié si paiement de frais réseau' : 'Autre ligne du transfert ou original du doublon'
  const txid = selection?.event?.txid ?? selection?.row?.rawPayload.Txid
  const candidates = rows().filter(item => item.id !== selection?.id)
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
  render()
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
    const filename = format === 'pdf' ? 'fiscalutxo-aide-2086-2026.pdf' : 'fiscalutxo-2026.' + format
    download(await request('export', { project, format }, true), filename)
    status('Rapport ' + format.toUpperCase() + ' téléchargé.')
  }))
}

$('load-demo').addEventListener('click', () => {
  if (dirty && !confirm('Remplacer le dossier ouvert et ses modifications non enregistrées ?')) return
  void task(async () => {
    project = await request('demo')
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
  download(new Blob([JSON.stringify(project, null, 2) + '\n'], { type: 'application/json' }), 'fiscalutxo-dossier-2026.json')
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

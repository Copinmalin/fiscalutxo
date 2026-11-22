import { request } from './transport.js'
import { importedBalanceAfter, walletBalances } from './balances.js'
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
let activeImportId = ''
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
  const balanceAfter = importedBalanceAfter(entry.row.rawPayload)
  if (balanceAfter === null) return null
  const balanceBefore = balanceAfter + BigInt(entry.event.quantitySats)
  return balanceBefore <= 2_100_000_000_000_000n ? balanceBefore : null
}

function updatePortfolioEstimate() {
  const fields = operationForm.elements
  const isDisposal = fields.type.value === 'vente' || fields.type.value === 'paiement'
  const isSparrow = selection?.bundle?.import.parserName === 'sparrow-transactions-csv'
  const inventory = project.sources.length > 0
  const panel = $('portfolio-estimate')
  panel.hidden = !isDisposal || (!isSparrow && !inventory)
  if (panel.hidden) return null

  const estimate = importedDisposalRate(selection, fields.date.value)
  if (inventory) return updateInventoryEstimate(estimate)
  $('portfolio-balances').hidden = true
  $('market-price-label').hidden = true
  $('other-holdings-label').hidden = false
  $('portfolio-estimate-help').textContent = 'Vérifiez que le total couvre tous les wallets et plateformes du foyer. Renseignez le justificatif de la valorisation séparément.'
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

function updateInventoryEstimate(importedRate) {
  const fields = operationForm.elements
  const message = $('portfolio-estimate-message')
  const balances = $('portfolio-balances')
  const controls = $('portfolio-estimate-controls')
  const apply = $('apply-portfolio-estimate')
  const date = fields.date.value + 'Z'
  const result = walletBalances(project, date, selection?.id, !selection)
  balances.hidden = false
  balances.replaceChildren(...result.accounts.map(source => element('li', source.name + ' · ' +
    (source.sats === null ? source.reason : source.sats.toLocaleString('fr-FR') + ' sats'))))
  $('other-holdings-label').hidden = true
  $('market-price-label').hidden = result.sats === null
  controls.hidden = true
  apply.disabled = true
  if (result.sats === null) {
    message.textContent = result.unassigned ? 'Rattachez les imports et les saisies manuelles aux sources déclarées.' :
      'Valeur globale indisponible. Vérifiez les soldes ci-dessous.'
    return null
  }

  const marketPrice = $('market-price').value.trim()
  let rate = importedRate
  if (marketPrice) {
    try {
      const centsPerBitcoin = BigInt(parseEuros(marketPrice))
      rate = centsPerBitcoin ? sats => (sats * centsPerBitcoin + 50_000_000n) / 100_000_000n : null
    } catch {
      rate = null
    }
  }
  message.textContent = 'Solde global avant cession : ' + result.sats.toLocaleString('fr-FR') + ' sats.'
  if (!rate) {
    message.textContent += ' Saisissez le cours BTC/EUR applicable.'
    return null
  }
  const total = rate(BigInt(result.sats))
  if (total <= 0n || total > 100_000_000_000_000n) {
    message.textContent += ' Vérifiez le cours et le montant proposé.'
    return null
  }
  message.textContent += ' Cours : ' + money(Number(rate(100_000_000n))) + ' par BTC' +
    (marketPrice ? ' (saisie manuelle).' : ' (moyenne journalière Sparrow, indicative).')
  controls.hidden = false
  $('portfolio-estimate-help').textContent = 'Conservez le justificatif des soldes et du cours utilisé.'
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

function sourceOptions(sources = project.sources) {
  return [new Option('Choisir une source', ''), ...sources.map(source => new Option(source.name, source.id))]
}

function importSources() {
  if (project.sources.length) return project.sources
  return [...new Map(project.imports.map(bundle => [bundle.source.id, bundle.source])).values()]
}

function renderSources() {
  const sources = project.sources
  const start = fiscalPeriod(project.year).start
  const opening = sources.length ? walletBalances(project, start) : null
  const panel = $('import-panel')
  $('import-home').prepend(panel)
  const destinations = importSources()
  if (!sources.some(source => source.id === activeImportId)) activeImportId = ''
  const importSelection = $('registered-import')
  const selected = activeImportId || importSelection.value
  importSelection.replaceChildren(...sourceOptions(destinations))
  importSelection.value = destinations.some(source => source.id === selected) ? selected :
    destinations.length === 1 ? destinations[0].id : ''
  importSelection.disabled = !destinations.length
  importSelection.required = !!destinations.length
  $('registered-import-label').hidden = !!sources.length || !destinations.length
  $('import-submit').disabled = !destinations.length
  panel.hidden = !!sources.length || !destinations.length
  const expanded = new Set(Array.from(document.querySelectorAll('.source-card[open]'), item => item.dataset.source))
  const cards = sources.map((source, index) => {
    const group = element('details', undefined, 'source-card')
    group.dataset.source = source.id
    group.open = expanded.has(source.id)
    const balance = opening.accounts[index]
    const count = project.imports.filter(bundle => bundle.source.id === source.id).length
    const label = source.kind === 'wallet' ? 'Wallet' : 'Plateforme'
    group.append(element('summary', source.name + ' · ' + label + ' · ' + count + ' fichier(s) · ' +
      (balance.sats === null ? balance.reason : 'Ouverture : ' + balance.sats.toLocaleString('fr-FR') + ' sats' +
        (balance.automatic ? ' (reconstituée)' : ''))))
    const panelHost = element('div')
    const importButton = button('Importer un fichier pour cette source', () => {
      if (activeImportId !== source.id) {
        $('import-form').reset()
        $('import-form').elements.format.value = source.kind === 'platform' ? 'generique' : 'sparrow'
        status('', false, 'import-status')
      }
      activeImportId = source.id
      importSelection.value = source.id
      panelHost.append(panel)
      panel.hidden = false
      $('import-form').elements.file.focus()
    })
    importButton.classList.add('source-import-button')
    group.append(importButton, panelHost)
    if (activeImportId === source.id) {
      panelHost.append(panel)
      panel.hidden = false
    }
    const form = element('form', undefined, 'source-card-form')
    const addField = (name, title, type, value) => {
      const input = element('input')
      input.name = name
      input.type = type
      input.value = value
      const label = element('label', title)
      label.append(input)
      form.append(label)
      return input
    }
    form.append(element('h4', 'Solde de référence'))
    addField('anchorDate', 'Date et heure UTC du solde de référence', 'datetime-local',
      (source.anchor?.date ?? start).slice(0, 19)).step = '1'
    const sats = addField('anchorSats', 'Solde en sats au début de cet instant', 'number', source.anchor?.sats ?? '')
    sats.min = '0'
    sats.step = '1'
    addField('anchorReference', 'Justificatif du solde de référence', 'text', source.anchor?.reference ?? '').maxLength = 500
    form.append(element('small', 'Laissez le solde vide si Sparrow fournit un solde cumulé exploitable. ' +
      'Sans fichier, indiquez le solde au 1er janvier et saisissez les mouvements un par un.'))
    const coverage = element('input')
    coverage.type = 'checkbox'
    coverage.checked = source.coverage
    const confirmation = element('label', undefined, 'check')
    confirmation.append(coverage, element('span', 'J’ai recensé tous les mouvements de cette source entre le solde de référence, le début de l’année et la dernière cession à traiter.'))
    form.append(confirmation)
    const currentAccount = project.accounts.find(account => account.sourceId === source.id)
    const oldAccounts = project.accounts.filter(account => !account.sourceId)
    let legacyAccount
    if (source.kind === 'platform') {
      const section = element('h4', 'Compte de la plateforme')
      form.append(section)
      if (oldAccounts.length && !currentAccount) {
        legacyAccount = element('select')
        const label = element('label', 'Compte déjà saisi dans ce dossier')
        legacyAccount.append(new Option('Choisir si applicable', ''), ...oldAccounts.map((account, index) =>
          new Option([account.entity, account.country, account.reference].filter(Boolean).join(' · '), String(index))))
        label.append(legacyAccount)
        form.append(label)
      }
      const entity = addField('entity', 'Entité qui tient le compte', 'text', currentAccount?.entity ?? source.name)
      entity.maxLength = 500
      const country = addField('country', 'Pays de l’entité (FR, DE…)', 'text', currentAccount?.country ?? '')
      country.maxLength = 2
      country.pattern = '[A-Za-z]{2}'
      addField('accountReference', 'Référence du compte étranger', 'text', currentAccount?.reference ?? '').maxLength = 200
      if (legacyAccount) legacyAccount.addEventListener('change', () => {
        const account = legacyAccount.value === '' ? undefined : oldAccounts[Number(legacyAccount.value)]
        entity.value = account?.entity ?? source.name
        country.value = account?.country ?? ''
        form.elements.accountReference.value = account?.reference ?? ''
      })
    }
    const save = element('button', 'Valider cette source')
    form.append(save)
    const linked = count || Object.values(project.operations).some(operation => operation.sourceId === source.id)
    if (!linked) form.append(button('Retirer cette source', () => {
      project.sources = project.sources.filter(item => item.id !== source.id)
      if (currentAccount) {
        // A platform can have a reporting obligation even when it has no imported transactions.
        delete currentAccount.sourceId
      }
      project.accountsReviewed = false
      project.complete = false
      changed('Source retirée.')
    }))
    form.addEventListener('submit', event => {
      event.preventDefault()
      const fields = form.elements
      try {
        let anchor
        if (sats.value !== '') {
          const reference = fields.anchorReference.value.trim()
          if (!reference || !fields.anchorDate.value) throw new Error('Indiquez la date et le justificatif du solde.')
          anchor = { date: new Date(fields.anchorDate.value + 'Z').toISOString(), sats: parseSats(sats.value), reference }
        }
        if (source.kind === 'platform') {
          const country = fields.country.value.trim().toUpperCase()
          const entity = fields.entity.value.trim() || source.name
          const accountReference = fields.accountReference.value.trim()
          if (!country && (accountReference || legacyAccount?.value)) throw new Error('Renseignez le pays de l’entité.')
          const previous = currentAccount ?? (legacyAccount?.value ? oldAccounts[Number(legacyAccount.value)] :
            oldAccounts.find(account => account.entity === entity && account.country === country &&
              account.reference === accountReference))
          if (country && !/^[A-Z]{2}$/.test(country)) throw new Error('Utilisez un code pays de deux lettres.')
          if (country) {
            const next = { sourceId: source.id, entity, country, reference: accountReference, relevant: previous?.relevant ?? true }
            const updated = !previous || Object.keys(next).some(key => next[key] !== previous[key])
            if (previous) Object.assign(previous, next)
            else project.accounts.push(next)
            if (updated) project.accountsReviewed = false
          } else if (currentAccount) {
            project.accounts = project.accounts.filter(account => account !== currentAccount)
            project.accountsReviewed = false
          }
        }
        if (anchor) source.anchor = anchor
        else delete source.anchor
        source.coverage = coverage.checked
        changed('Source mise à jour.')
      } catch (error) {
        status(error.message, true)
      }
    })
    group.append(form)
    return { group, kind: source.kind }
  })
  $('platform-list').replaceChildren(...cards.filter(card => card.kind === 'platform').map(card => card.group))
  $('wallet-list').replaceChildren(...cards.filter(card => card.kind === 'wallet').map(card => card.group))
  const fields = $('opening-form').elements
  fields.sats.readOnly = !!opening
  if (opening) fields.sats.value = opening.sats ?? ''
  const breakdown = $('opening-breakdown')
  breakdown.hidden = !opening
  if (opening) breakdown.textContent = opening.sats === null
    ? 'Confirmez les sources et les soldes de référence pour obtenir le total d’ouverture.'
    : 'Total reconstitué : ' + opening.sats.toLocaleString('fr-FR') + ' sats. Renseignez séparément le capital d’acquisition.'
}

function render(blockedRows = new Set()) {
  $('fiscal-year').value = project.year
  $('opening-title').textContent = '3. Situation au 1er janvier ' + project.year
  renderSources()
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
      const source = project.sources.find(item => item.id === bundle.source.id)
      if (source) source.coverage = false
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
      .map(([id, operation]) => ({ id, operation, title: project.sources.find(source => source.id === operation.sourceId)?.name ?? 'Saisie manuelle' })),
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
  const foreignAccounts = project.accounts.filter(account => account.relevant && account.country !== 'FR')
  const missingPlatforms = project.sources.filter(source => source.kind === 'platform' &&
    !project.accounts.some(account => account.sourceId === source.id))
  $('account-empty').hidden = !!(foreignAccounts.length || missingPlatforms.length)
  $('account-list').replaceChildren(
    ...missingPlatforms.map(source => element('li', source.name + ' · Pays du compte à renseigner dans la fiche de la plateforme')),
    ...foreignAccounts.map(account => {
      const item = element('li', account.entity + ' · ' + account.country + ' · ' + (account.reference || 'Référence à préciser'))
      if (!account.sourceId) item.append(button('Retirer', () => {
        project.accounts = project.accounts.filter(value => value !== account)
        project.accountsReviewed = false
        changed('Compte retiré du dossier ouvert.')
      }))
      return item
    }),
  )
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
  fields.sourceId.replaceChildren(...sourceOptions())
  fields.sourceId.value = values.sourceId ?? (project.sources.length === 1 ? project.sources[0].id : '')
  const manualSource = !entry?.row && project.sources.length > 0
  $('manual-source-label').hidden = !manualSource
  fields.sourceId.disabled = !manualSource
  fields.sourceId.required = manualSource
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

for (const sourceForm of document.querySelectorAll('.source-form')) sourceForm.addEventListener('submit', event => {
  event.preventDefault()
  const form = event.currentTarget
  const name = form.elements.name.value.trim()
  const kind = form.dataset.kind
  if (!name || project.sources.some(source => source.kind === kind && source.name.toLowerCase() === name.toLowerCase())) {
    status('Renseignez un nom de source distinct.', true)
    return
  }
  const existing = project.imports.find(bundle => bundle.source.sourceType === kind &&
    bundle.source.name.toLowerCase() === name.toLowerCase())
  const source = { id: existing?.source.id ?? 'source:' + crypto.randomUUID(), name, kind, coverage: false }
  project.sources.push(source)
  if (kind === 'platform') project.accountsReviewed = false
  project.complete = false
  form.reset()
  changed('Source ajoutée. Importez son historique ou renseignez son solde.')
  document.querySelector('.source-card[data-source="' + CSS.escape(source.id) + '"]').open = true
})

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
    project.opening = { sats, acquisitions, used, reference, confirmed: true }
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
    const destination = importSources().find(source => source.id === (activeImportId || data.get('sourceId')))
    if (!destination) throw new Error('Déclarez et sélectionnez une source.')
    const response = await request('import', {
      project, format, source: destination.name, sourceId: destination.id,
      name: hasPaste ? (format === 'bundle' ? 'import-collé.json' : 'import-collé.csv') : file.name,
      content,
    })
    if (response.duplicate) {
      status('Ce fichier figure déjà dans le dossier.', false, 'import-status')
      return
    }
    project = response.project
    const importedSource = project.sources.find(source => source.id === destination.id)
    if (importedSource) importedSource.coverage = false
    project.complete = false
    project.accountsReviewed = false
    const selectedFormat = form.elements.format.value
    form.reset()
    form.elements.format.value = selectedFormat
    form.querySelector('details').open = false
    changed(response.status === 'imported' ? 'Import ajouté. Vérifiez les opérations.' : 'Import conservé. Vérifiez les anomalies.', 'import-status')
  }, 'import-status')
})

$('template').addEventListener('click', () => download(new Blob([
  'date_utc,type,sats,prix_eur,frais_eur,portefeuille_eur,justificatif,valorisation,txid\r\n',
], { type: 'text/csv' }), 'fiscalutxo-modele.csv'))

$('add-operation').addEventListener('click', () => {
  if (!project.sources.length && !project.imports.length && !Object.keys(project.operations).length) {
    status('Ajoutez d’abord le wallet ou la plateforme de cette opération.', true)
    $('source-form').elements.name.focus()
    return
  }
  editOperation()
})
$('cancel-operation').addEventListener('click', () => dialog.close())
$('apply-label-suggestion').addEventListener('click', () => {
  const proposal = selection && suggestedQualification(selection)
  if (!proposal) return
  operationForm.elements.type.value = proposal
  updateOperationFields(operationForm.elements.peer.value)
})
operationForm.elements.type.addEventListener('change', () => updateOperationFields(operationForm.elements.peer.value))
$('other-holdings').addEventListener('input', updatePortfolioEstimate)
$('market-price').addEventListener('input', () => {
  if (appliedPortfolioEstimate && operationForm.elements.portfolio.value === appliedPortfolioEstimate) {
    operationForm.elements.portfolio.value = ''
    appliedPortfolioEstimate = ''
  }
  updatePortfolioEstimate()
})
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
      (project.sources.length || Date.parse(fields.date.value + 'Z') !== Date.parse(selection?.event?.occurredAt))) {
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
    else if (data.get('sourceId')) op.sourceId = data.get('sourceId')
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
    status('Dossier fictif chargé. Ouvrez les deux lignes à qualifier : l’achat initial et la vente.')
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

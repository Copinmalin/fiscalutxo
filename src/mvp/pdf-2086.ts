import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Calculation } from './tax.js'

type Disposal = Calculation['disposals'][number]
type Line = [code: string, label: string, value: (item: Disposal) => string]

const amount = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric',
})

function euro(cents: number) {
  return amount.format(cents / 100).replace(/[\u00a0\u202f]/g, ' ')
}

const acquisitionLines: Line[] = [
  ['220', 'Prix total d’acquisition', row => euro(row.acquisitions)],
  ['221', 'Fractions de capital déjà consommées', row => euro(row.used)],
  ['223', 'Prix total d’acquisition net', row => euro(row.basis)],
  ['', 'Plus-value ou moins-value de la cession', row => (row.gain > 0 ? '+' : '') + euro(row.gain)],
]

function disposalLines(exempt: boolean): Line[] {
  const lines: Line[] = [['211', 'Date de la cession', row => date.format(new Date(row.date))]]
  if (!exempt) lines.push(['212', 'Valeur globale du portefeuille', row => euro(row.portfolio)])
  lines.push(
    ['213', 'Prix de cession', row => euro(row.gross)],
    ['214', 'Frais de cession', row => euro(row.fee)],
    ['215', 'Prix de cession net des frais', row => euro(row.net)],
    ['218', 'Prix net des frais et soultes', row => euro(row.net)],
  )
  if (!exempt) {
    lines.splice(-1, 0, ['217', 'Prix net des soultes', row => euro(row.gross)])
    lines.push(...acquisitionLines)
  }
  return lines
}

export async function export2086Pdf(result: Calculation): Promise<Uint8Array> {
  if (!result.ready) throw new Error('Dossier à compléter')

  const pdf = await PDFDocument.create()
  pdf.setTitle('FiscalUTXO - Aide à la saisie 2086 - Opérations ' + result.year)
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const green = rgb(0.10, 0.29, 0.24)
  const ink = rgb(0.12, 0.19, 0.17)
  const muted = rgb(0.27, 0.36, 0.33)
  const pale = rgb(0.92, 0.95, 0.93)
  const lines = disposalLines(Boolean(result.exempt))
  const { disposals } = result
  const perPage = 3
  const count = Math.max(1, Math.ceil(disposals.length / perPage))

  for (let index = 0; index < count; index++) {
    const page = pdf.addPage([595.28, 841.89])
    const text = (value: string, x: number, y: number, size = 10, strong = false, color = ink) =>
      page.drawText(value, { x, y, size, font: strong ? bold : font, color })
    const right = (value: string, edge: number, y: number, size = 10, strong = false) =>
      text(value, edge - (strong ? bold : font).widthOfTextAtSize(value, size), y, size, strong)
    const strip = (y: number, height: number, color = pale) =>
      page.drawRectangle({ x: 38, y, width: 519, height, color })
    const line = (y: number) => page.drawLine({
      start: { x: 38, y }, end: { x: 557, y }, thickness: 0.5, color: rgb(0.75, 0.82, 0.79),
    })

    text('FISCALUTXO', 38, 803, 11, true, green)
    text('Aide à la saisie 2086', 38, 765, 29, true, green)
    text('Opérations ' + result.year + ' • Repères du formulaire 2086 millésime 2026', 38, 738, 12)
    const campaignNote = result.year === 2025 ? 'Campagne déclarative 2026 · revenus 2025' :
      'Campagne déclarative 2027 · revenus 2026. Vérifier les cases du millésime 2027.'
    text(campaignNote, 38, 717, 9, false, muted)

    strip(659, 37)
    text('51   Total net des prix de cession', 50, 674, 12, true)
    right(euro(result.proceeds) + ' €', 545, 674, 13, true)

    if (disposals.length === 0) {
      text('Aucune cession recensée dans le dossier.', 38, 628, 12)
    } else if (result.exempt) {
      text('Cessions exonérées au seuil de 305 €. Les prix de cession restent à renseigner.', 38, 628, 10, true)
    } else if (result.totalGain !== null) {
      text('52   Résultat annuel des cessions', 50, 626, 11, true)
      right(euro(result.totalGain) + ' €', 545, 626, 12, true)
      const gain = result.report['3AN']
      const loss = result.report['3BN']
      if (gain !== null || loss !== null) {
        const field = gain !== null ? '3AN' : '3BN'
        text('2042 C   ' + field + ' - ' + (gain !== null ? 'Plus-value' : 'Moins-value'), 50, 603, 10)
        right(euro((gain ?? loss)!) + ' €', 545, 603)
      } else {
        text('2042 C   Résultat nul', 50, 603)
      }
    }

    if (disposals.length) {
      text('Cessions directes', 38, 558, 15, true, green)
      text('Repères « Déclarant 1 ». Attribuer chaque cession au déclarant concerné.', 38, 539, 9, false, muted)
      text('Montants en euros. Les rubriques de soultes sont hors du périmètre de cet export.', 38, 524, 9, false, muted)

      const pageRows = disposals.slice(index * perPage, (index + 1) * perPage)
      const edge = (column: number) => 354 + column * 96
      strip(474, 29)
      text('Ligne', 49, 485, 9, true)
      text('Rubrique', 93, 485, 9, true)
      pageRows.forEach((_, column) =>
        right('Cession ' + (index * perPage + column + 1), edge(column), 485, 9, true))
      lines.forEach(([code, label, value], rowIndex) => {
        const y = 454 - rowIndex * 23
        text(code, 49, y, 9, true, muted)
        text(label, 93, y, 9)
        pageRows.forEach((row, column) => right(value(row), edge(column), y, 9))
        line(y - 9)
      })
    }

    line(75)
    text('Document de travail pour le report dans l’annexe 2086 en ligne.', 38, 58, 9, true)
    text('Référence : formulaire 2086 (CERFA 16043*07), impots.gouv.fr', 38, 43, 8, false, muted)
    right((index + 1) + ' / ' + count, 557, 43, 8)
  }
  return pdf.save()
}

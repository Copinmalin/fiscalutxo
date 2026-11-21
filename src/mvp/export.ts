import { strToU8, zipSync } from 'fflate'
import type { Calculation } from './tax.js'

type Cell = string | number | null

type Sheet = [string, Cell[][]]

function tables(result: Calculation): Sheet[] {
  const eur = (value: number | null) => value === null ? null : value / 100
  const summary: Cell[][] = [
    ['Rubrique', 'Valeur'],
    ['Année', result.year],
    ['Total des prix de cession nets (€)', eur(result.proceeds)],
    ['Cessions exonérées au seuil de 305 €', result.exempt ? 'Oui' : 'Non'],
    ['3AN — Plus-value nette (€)', eur(result.report['3AN'])],
    ['3BN — Moins-value nette (€)', eur(result.report['3BN'])],
    ['3CN — Barème progressif', result.report['3CN']],
    ['Capital restant (€)', eur(result.capitalRemaining)],
    ['Solde final (sats)', result.remainingSats],
  ]
  const columns: Cell[] = ['Date UTC', 'Type', 'Prix avant frais (€)', 'Frais (€)', 'Prix net (€)']
  if (!result.exempt) columns.push('Portefeuille avant (€)', 'Acquisitions cumulées (€)', 'Capital déjà consommé (€)',
    'Fraction consommée (€)', 'Plus ou moins-value (€)', 'Valorisation')
  columns.push('Sats cédés', 'Source', 'Fichier', 'Ligne', 'Justificatif')
  const detail = result.disposals.map(item => {
    const row: Cell[] = [item.date, item.type, eur(item.gross), eur(item.fee), eur(item.net)]
    if (!result.exempt) row.push(eur(item.portfolio), eur(item.acquisitions), eur(item.used),
      eur(item.fraction), eur(item.gain), item.valuationReference)
    row.push(item.sats, item.source, item.file, item.row, item.reference)
    return row
  })
  return [
    ['2042 C', summary],
    ['2086', [columns, ...detail]],
    ['3916-bis', [['Entité', 'Pays', 'Référence'], ...result.foreignAccounts.map(account =>
      [account.entity, account.country, account.reference])]],
  ]
}

export function exportReport(result: Calculation, format: 'json' | 'csv' | 'xlsx') {
  if (!result.ready) throw new Error('Dossier à compléter')
  if (format === 'json') {
    const { disposals, ...report } = result
    const detail = result.exempt ? disposals.map(({ date, type, gross, fee, net, sats, source, file, row, reference }) =>
      ({ date, type, gross, fee, net, sats, source, file, row, reference })) : disposals
    return JSON.stringify({ ...report, currencyUnit: 'EUR cents', disposals: detail }, null, 2) + '\n'
  }
  const sheets = tables(result)
  if (format === 'xlsx') return workbook(sheets)

  function csvCell(value: Cell) {
    let text = value === null ? '' : String(value)
    if (typeof value === 'string' && /^(?:[\t\r\n]|\s*[=+\-@＝＋－＠])/u.test(text)) text = "'" + text
    if (typeof value === 'number') text = text.replace('.', ',')
    return '"' + text.replace(/"/g, '""') + '"'
  }
  const width = Math.max(...sheets.map(([, lines]) => lines[0]?.length ?? 0))
  const heading = ['Section', ...Array.from({ length: width }, (_, index) => 'Champ ' + (index + 1))]
  const rows: Cell[][] = [heading, ...sheets.flatMap(([sheet, lines]) =>
    lines.map(line => [sheet, ...line, ...Array<Cell>(width - line.length).fill(null)]))]
  return '\uFEFF' + rows.map(line => line.map(csvCell).join(';')).join('\r\n') + '\r\n'
}

function xml(value: string) {
  return value.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!)
}

function workbook(sheets: Sheet[]) {
  const namespace = 'http://schemas.openxmlformats.org'
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  const spreadsheet = namespace + '/spreadsheetml/2006/main'
  const relation = namespace + '/officeDocument/2006/relationships'
  const types = namespace + '/package/2006/content-types'
  const relations = namespace + '/package/2006/relationships'
  const addType = (path: string, type: string) =>
    '<Override PartName="/' + path + '" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.' + type + '+xml"/>'
  const addRel = (id: string, type: string, target: string) =>
    '<Relationship Id="' + id + '" Type="' + relation + '/' + type + '" Target="' + target + '"/>'

  const files: Record<string, Uint8Array> = {}
  const store = (path: string, body: string) => { files[path] = strToU8(declaration + body) }
  store('[Content_Types].xml', '<Types xmlns="' + types + '">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    addType('xl/workbook.xml', 'sheet.main') + addType('xl/styles.xml', 'styles') +
    sheets.map((_, i) => addType('xl/worksheets/sheet' + (i + 1) + '.xml', 'worksheet')).join('') + '</Types>')
  store('_rels/.rels', '<Relationships xmlns="' + relations + '">' +
    addRel('rId1', 'officeDocument', 'xl/workbook.xml') + '</Relationships>')
  store('xl/_rels/workbook.xml.rels', '<Relationships xmlns="' + relations + '">' +
    sheets.map((_, i) => addRel('rId' + (i + 1), 'worksheet', 'worksheets/sheet' + (i + 1) + '.xml')).join('') +
    addRel('rIdStyles', 'styles', 'styles.xml') + '</Relationships>')
  store('xl/workbook.xml', '<workbook xmlns="' + spreadsheet + '" xmlns:r="' + relation + '"><bookViews><workbookView/></bookViews><sheets>' +
    sheets.map(([title], i) => '<sheet name="' + xml(title) + '" sheetId="' + (i + 1) +
      '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>')
  store('xl/styles.xml', '<styleSheet xmlns="' + spreadsheet + '">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF204F46"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>')
  sheets.forEach(([, rows], index) => {
    const header = rows[0] ?? []
    const columns = header.map((cell, col) => {
      const width = rows.reduce((max, row) => Math.max(max, String(row[col] ?? '').length + 3), 14)
      return '<col min="' + (col + 1) + '" max="' + (col + 1) + '" width="' +
        Math.min(61, Math.max(width, String(cell).length + 3)) + '" customWidth="1"/>'
    })
    const data = rows.map((row, rowIndex) => '<row r="' + (rowIndex + 1) + '">' +
      row.map((value, col) => {
        const coordinate = String.fromCharCode(65 + col) + (rowIndex + 1)
        if (value === null) return '<c r="' + coordinate + '"/>'
        if (typeof value === 'number') {
          const money = String(header[col]).includes('(€)') || String(row[0]).includes('(€)')
          return '<c r="' + coordinate + '"' + (money ? ' s="2"' : '') + '><v>' + value + '</v></c>'
        }
        return '<c r="' + coordinate + '" t="inlineStr"' + (rowIndex ? '' : ' s="1"') +
          '><is><t xml:space="preserve">' + xml(value) + '</t></is></c>'
      }).join('') + '</row>').join('')
    store('xl/worksheets/sheet' + (index + 1) + '.xml', '<worksheet xmlns="' + spreadsheet + '">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + columns.join('') + '</cols><sheetData>' + data + '</sheetData></worksheet>')
  })
  return zipSync(files)
}

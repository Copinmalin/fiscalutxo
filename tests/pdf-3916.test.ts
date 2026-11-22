import { readFile } from 'node:fs/promises'
import { PDFDocument, PDFName } from 'pdf-lib'
import { expect, test } from 'vitest'
import { export3916 } from '../src/mvp/pdf-3916.js'

const template = await readFile(new URL('../src/web/public/3916-2026.pdf', import.meta.url))
const sample = {
  year: 2025, country: 'DE', entity: 'Organisme fictif', provider: 'other', providerAddress: '1 rue Exemple',
  name: 'Camille Exemple', birth: '1980-01-02', birthplace: 'Lyon', address: 'Lyon, France',
  reference: 'COMPTE-FICTIF', opened: '2021-12-03', closed: '2025-02-08', usage: 'mixed',
  business: 'Entreprise fictive', office: 'Lyon, France', legalForm: '01', siret: '00000000000000',
  role: 'proxy-person', holder: 'Exemple', holderFirst: 'Dominique', holderBirth: '1970-03-04',
  holderBirthplace: 'Paris', holderAddress: 'Paris, France',
}

test('remplit le formulaire officiel et sélectionne uniquement les widgets applicables', async () => {
  const doc = await PDFDocument.load(await export3916(template, sample))
  expect(doc.getPageCount()).toBe(7)
  const form = doc.getForm()
  expect(form.getTextField('a24').getText()).toBe(sample.reference)
  expect(form.getTextField('a30').getText()).toBe('2025')
  expect(form.getTextField('a32').getText()).toBe(sample.entity)
  expect(form.getTextField('a44').getText()).toBe(sample.holderFirst)
  for (const [field, choice] of [['CAC2', 'b'], ['CAC5', 'b'], ['CAC6', 'c']] as const) {
    const box = form.getCheckBox(field).acroField
    expect(box.dict.get(PDFName.of('V'))).toBe(PDFName.of(choice))
    expect(box.getWidgets().filter(w => w.getAppearanceState() !== PDFName.of('Off'))).toHaveLength(1)
  }
})

test('refuse les comptes français, un autre millésime et les procurations incomplètes', async () => {
  for (const change of [{country:'FR'}, {year:2026}, {holderBirth:''}]) {
    await expect(export3916(template, {...sample, ...change})).rejects.toThrow()
  }
})

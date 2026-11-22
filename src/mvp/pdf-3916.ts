import { PDFDocument, PDFName } from 'pdf-lib'
import { z } from 'zod'

const text = z.string().trim().min(1).max(200)
const optional = z.string().trim().max(200).default('')
const inputSchema = z.object({
  year: z.literal(2025), country: z.string().regex(/^[A-Z]{2}$/).refine(v => v !== 'FR'),
  name: text, birth: z.iso.date(), birthplace: text, address: text, reference: text,
  opened: z.iso.date().max(10), closed: z.union([z.iso.date(), z.literal('')]).default(''),
  provider: z.string().regex(/^(other|00[1-9]|0[12][0-9]|030)$/), entity: text,
  providerAddress: optional, url: optional, role: z.enum(['owner', 'proxy-person', 'proxy-company']),
  usage: z.enum(['personal', 'professional', 'mixed']), business: optional, legalForm: optional,
  siret: optional, office: optional, holder: optional, holderFirst: optional, holderBirth: optional,
  holderBirthplace: optional, holderAddress: optional, holderForm: optional, holderSiret: optional,
}).superRefine((v, ctx) => {
  const required = (value: string) => { if (!value) ctx.addIssue({ code: 'custom', message: 'Complétez les rubriques applicables.' }) }
  if (v.provider === 'other') required(v.providerAddress)
  if (v.usage !== 'personal') [v.business, v.legalForm, v.siret, v.office].forEach(required)
  if (v.role !== 'owner') [v.holder, v.holderAddress].forEach(required)
  if (v.role === 'proxy-company') required(v.holderForm)
  if (v.role === 'proxy-person') {
    required(v.holderFirst)
    required(v.holderBirthplace)
    if (!z.iso.date().safeParse(v.holderBirth).success) ctx.addIssue({code:'custom', message:'Date de naissance du titulaire invalide.'})
  }
  if (v.opened > '2025-12-31' || (v.closed && (v.closed < v.opened || v.closed < '2025-01-01' || v.closed > '2025-12-31'))) {
    ctx.addIssue({code:'custom', message:'Vérifiez les dates du compte pour l’année 2025.'})
  }
})

export async function export3916(template: Uint8Array, input: unknown) {
  const v = inputSchema.parse(input)
  const pdf = await PDFDocument.load(template)
  const form = pdf.getForm()
  const fill = (id: number, value: string) => form.getTextField('a' + id).setText(value)
  const date = (id: number, value: string) => {
    if (value) value.split('-').reverse().forEach((part, i) => fill(id + i, part))
  }
  // DGFiP models each exclusive choice as one checkbox with several widget export values.
  const choose = (field: string, choice: string) => {
    const box = form.getCheckBox(field).acroField
    const selected = PDFName.of(choice)
    box.dict.set(PDFName.of('V'), selected)
    for (const widget of box.getWidgets()) widget.setAppearanceState(widget.getOnValue() === selected ? selected : PDFName.of('Off'))
  }
  const birth = v.birth.split('-').reverse().join('/') + ' · ' + v.birthplace
  if (v.usage === 'personal') {
    fill(1, v.name); fill(2, birth); fill(4, v.address)
  } else {
    choose('CAC1', 'a')
    fill(6, v.legalForm); fill(7, v.name); fill(8, birth); fill(9, v.business); fill(10, v.siret); fill(11, v.office)
    fill(37, v.business); fill(38, v.legalForm); fill(39, v.siret); fill(40, v.office)
  }
  choose('CAC2', 'b')
  fill(24, v.reference); date(25, v.opened); date(28, v.closed)
  if (v.provider === 'other') {
    fill(32, v.entity); fill(34, v.providerAddress + ' · ' + v.country); fill(35, v.url)
  } else fill(31, v.provider)
  choose('CAC5', v.role === 'owner' ? 'a' : 'b')
  choose('CAC6', {personal:'a', professional:'b', mixed:'c'}[v.usage])
  if (v.role === 'proxy-person') {
    fill(42, v.holder); fill(44, v.holderFirst); date(45, v.holderBirth); fill(48, v.holderBirthplace); fill(49, v.holderAddress)
  } else if (v.role === 'proxy-company') {
    fill(50, v.holder); fill(51, v.holderForm); fill(52, v.holderSiret); fill(53, v.holderAddress)
  }
  // Recalculate checked text sizes for the actual printable field widths.
  for (const field of form.getFields()) {
    if (form.fieldIsDirty(field.ref) && 'setFontSize' in field && typeof field.setFontSize === 'function') field.setFontSize(0)
  }
  return pdf.save()
}

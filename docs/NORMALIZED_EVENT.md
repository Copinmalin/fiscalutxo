# NormalizedEvent V0

## 1. Objectif

`NormalizedEvent` est le format canonique minimal utilisé par FiscalUTXO pour représenter une opération Bitcoin normalisée après import.

Il sert de pont entre :

```text
CSV brut
→ ligne brute conservée
→ transaction importée
→ événement normalisé
→ qualification fiscale
→ export déclaratif
```

Le format V0 est volontairement limité au MVP :

- France ;
- particulier résident fiscal français ;
- Bitcoin uniquement ;
- usage patrimonial privé ;
- imports CSV ;
- préparation déclarative ;
- opérations ambiguës marquées `needs_review`.

Il ne traite pas les altcoins, la DeFi, le minage, le trading professionnel ou la comptabilité d’entreprise.

---

## 2. Principes de conception

### 2.1 Bitcoin-only

Le champ `asset` vaut toujours `BTC` dans le MVP.

Aucun autre actif n’est accepté en V0.

### 2.2 Montants Bitcoin en satoshis

Les montants Bitcoin sont stockés en satoshis entiers, jamais en nombre décimal BTC.

Objectif : éviter les erreurs d’arrondi.

```text
1 BTC = 100_000_000 sats
```

### 2.3 Montants euros en centimes

Les montants en euros sont stockés en centimes entiers.

```text
1 EUR = 100 cents
```

### 2.4 Traçabilité obligatoire

Chaque événement normalisé doit pouvoir être rattaché :

- à une source ;
- à un import ;
- à une ligne brute ;
- à une version de parseur.

### 2.5 Prudence fiscale

Une sortie Bitcoin n’est jamais automatiquement une cession imposable.

Si le contexte est insuffisant, l’événement doit être marqué :

```text
needs_review
```

---

## 3. Définition TypeScript

```ts
export type NormalizedEventSchemaVersion = 'normalized-event.v0'

export type BitcoinAsset = 'BTC'

export type FiatCurrency = 'EUR'

export type EventDirection =
  | 'in'
  | 'out'
  | 'internal'
  | 'fee'

export type EventType =
  | 'acquisition'
  | 'disposal_sale'
  | 'disposal_spend'
  | 'self_transfer'
  | 'fee'
  | 'reward'
  | 'donation'
  | 'pro_income'
  | 'manual_review'

export type TaxableStatus =
  | 'taxable'
  | 'non_taxable'
  | 'needs_review'
  | 'out_of_scope'

export type PriceSource =
  | 'platform_csv'
  | 'invoice'
  | 'manual'
  | 'market_price'
  | 'unknown'

export type SourceRef = {
  sourceId: string
  importId: string
  rawRowId: string
  parserVersion: string
}

export type FiatValue = {
  currency: FiatCurrency
  grossAmountCents?: number
  feeCents?: number
  netAmountCents?: number
  priceSource: PriceSource
  priceSourceLabel?: string
}

export type BitcoinFee = {
  asset: BitcoinAsset
  amountSats: number
}

export type NormalizedEvent = {
  id: string
  schemaVersion: NormalizedEventSchemaVersion

  sourceRef: SourceRef

  occurredAt: string
  timezone?: string

  asset: BitcoinAsset
  quantitySats: number
  direction: EventDirection

  eventType: EventType
  taxableStatus: TaxableStatus

  fiat?: FiatValue
  fee?: BitcoinFee

  txid?: string
  label?: string
  counterparty?: string

  relatedEventIds?: string[]
  reviewReasons?: string[]
  userNotes?: string
}
```

---

## 4. Champs obligatoires

| Champ | Type | Rôle |
|---|---|---|
| `id` | `string` | Identifiant interne stable de l’événement normalisé. |
| `schemaVersion` | `'normalized-event.v0'` | Version du schéma. |
| `sourceRef` | `SourceRef` | Lien vers la source, l’import, la ligne brute et le parseur. |
| `occurredAt` | `string` | Date ISO 8601, idéalement en UTC. |
| `asset` | `'BTC'` | Actif concerné. Toujours BTC en V0. |
| `quantitySats` | `number` | Quantité en satoshis entiers. |
| `direction` | `EventDirection` | Sens économique ou technique de l’événement. |
| `eventType` | `EventType` | Qualification fonctionnelle de l’événement. |
| `taxableStatus` | `TaxableStatus` | Statut fiscal préparatoire. |

---

## 5. Champs optionnels

| Champ | Type | Usage |
|---|---|---|
| `timezone` | `string` | Fuseau horaire d’origine si connu. |
| `fiat` | `FiatValue` | Valeur EUR connue ou estimée. |
| `fee` | `BitcoinFee` | Frais réseau ou frais Bitcoin rattachés. |
| `txid` | `string` | Identifiant de transaction si disponible. Utiliser uniquement des données fictives dans les exemples. |
| `label` | `string` | Libellé importé ou saisi par l’utilisateur. |
| `counterparty` | `string` | Plateforme, wallet ou contrepartie si connue. |
| `relatedEventIds` | `string[]` | Événements liés, par exemple retrait plateforme et réception wallet. |
| `reviewReasons` | `string[]` | Raisons de revue manuelle. |
| `userNotes` | `string` | Note utilisateur locale. |

---

## 6. Valeurs autorisées

### 6.1 `direction`

| Valeur | Usage |
|---|---|
| `in` | Entrée de BTC dans une source suivie. |
| `out` | Sortie de BTC depuis une source suivie. |
| `internal` | Transfert personnel identifié ou rapprochement interne. |
| `fee` | Frais isolé ou ligne de frais. |

### 6.2 `eventType`

| Valeur | Usage | Statut fiscal par défaut |
|---|---|---|
| `acquisition` | Achat de BTC contre EUR. | `non_taxable` |
| `disposal_sale` | Vente BTC contre EUR. | `taxable` |
| `disposal_spend` | Paiement d’un bien ou service en BTC. | `taxable` |
| `self_transfer` | Transfert entre wallets ou comptes personnels. | `non_taxable` |
| `fee` | Frais réseau ou frais plateforme. | `needs_review` |
| `reward` | Cashback, parrainage ou bonus. | `needs_review` |
| `donation` | Don ou contribution. | `needs_review` |
| `pro_income` | Paiement reçu dans un cadre professionnel. | `out_of_scope` |
| `manual_review` | Cas indéterminé. | `needs_review` |

### 6.3 `taxableStatus`

| Valeur | Usage |
|---|---|
| `taxable` | Cession imposable probable dans le cadre privé. |
| `non_taxable` | Opération non imposable dans le cadre privé. |
| `needs_review` | Qualification fiscale insuffisante ou ambiguë. |
| `out_of_scope` | Hors périmètre MVP, par exemple activité professionnelle. |

---

## 7. Règles de validation V0

### 7.1 Règles obligatoires

```text
[ ] schemaVersion vaut normalized-event.v0.
[ ] asset vaut BTC.
[ ] quantitySats est un entier positif ou nul.
[ ] occurredAt est une date ISO 8601 valide.
[ ] sourceRef.sourceId est renseigné.
[ ] sourceRef.importId est renseigné.
[ ] sourceRef.rawRowId est renseigné.
[ ] sourceRef.parserVersion est renseigné.
[ ] direction appartient aux valeurs autorisées.
[ ] eventType appartient aux valeurs autorisées.
[ ] taxableStatus appartient aux valeurs autorisées.
```

### 7.2 Règles de prudence fiscale

```text
[ ] eventType = manual_review implique taxableStatus = needs_review.
[ ] eventType = pro_income implique taxableStatus = out_of_scope.
[ ] eventType = self_transfer implique taxableStatus = non_taxable.
[ ] Une sortie non qualifiée doit rester needs_review.
[ ] Une dépense BTC identifiée doit être disposal_spend + taxable.
[ ] Une vente BTC contre EUR identifiée doit être disposal_sale + taxable.
```

### 7.3 Règles de valeurs fiat

```text
[ ] Les montants EUR sont en centimes.
[ ] fiat.currency vaut EUR si fiat est renseigné.
[ ] fiat.priceSource est renseigné si fiat est renseigné.
[ ] Une valeur EUR inconnue ne doit pas être inventée.
```

---

## 8. Exemples

Les exemples ci-dessous utilisent des identifiants fictifs.

### 8.1 Acquisition BTC

```ts
const acquisition: NormalizedEvent = {
  id: 'evt_demo_acquisition_001',
  schemaVersion: 'normalized-event.v0',
  sourceRef: {
    sourceId: 'src_paymium_demo',
    importId: 'imp_paymium_2025_demo',
    rawRowId: 'raw_001',
    parserVersion: 'paymium.v0',
  },
  occurredAt: '2025-02-12T10:15:00Z',
  asset: 'BTC',
  quantitySats: 500000,
  direction: 'in',
  eventType: 'acquisition',
  taxableStatus: 'non_taxable',
  fiat: {
    currency: 'EUR',
    grossAmountCents: 30000,
    feeCents: 150,
    netAmountCents: 30150,
    priceSource: 'platform_csv',
    priceSourceLabel: 'Paymium CSV demo',
  },
  label: 'Achat BTC demo',
  counterparty: 'Paymium',
}
```

### 8.2 Vente BTC contre EUR

```ts
const sale: NormalizedEvent = {
  id: 'evt_demo_sale_001',
  schemaVersion: 'normalized-event.v0',
  sourceRef: {
    sourceId: 'src_platform_demo',
    importId: 'imp_platform_2025_demo',
    rawRowId: 'raw_042',
    parserVersion: 'generic-platform.v0',
  },
  occurredAt: '2025-06-01T09:00:00Z',
  asset: 'BTC',
  quantitySats: 250000,
  direction: 'out',
  eventType: 'disposal_sale',
  taxableStatus: 'taxable',
  fiat: {
    currency: 'EUR',
    grossAmountCents: 18000,
    feeCents: 90,
    netAmountCents: 17910,
    priceSource: 'platform_csv',
  },
  label: 'Vente BTC demo',
  counterparty: 'Plateforme demo',
}
```

### 8.3 Paiement d’un bien ou service en BTC

```ts
const spend: NormalizedEvent = {
  id: 'evt_demo_spend_001',
  schemaVersion: 'normalized-event.v0',
  sourceRef: {
    sourceId: 'src_sparrow_demo',
    importId: 'imp_sparrow_2025_demo',
    rawRowId: 'raw_017',
    parserVersion: 'sparrow.v0',
  },
  occurredAt: '2025-05-21T18:30:00Z',
  asset: 'BTC',
  quantitySats: 70000,
  direction: 'out',
  eventType: 'disposal_spend',
  taxableStatus: 'taxable',
  fiat: {
    currency: 'EUR',
    grossAmountCents: 4200,
    priceSource: 'invoice',
    priceSourceLabel: 'Ticket commerçant demo',
  },
  fee: {
    asset: 'BTC',
    amountSats: 120,
  },
  txid: 'tx_demo_spend_001',
  label: 'Paiement commerçant demo',
}
```

### 8.4 Transfert personnel

```ts
const selfTransfer: NormalizedEvent = {
  id: 'evt_demo_self_transfer_001',
  schemaVersion: 'normalized-event.v0',
  sourceRef: {
    sourceId: 'src_sparrow_demo',
    importId: 'imp_sparrow_2025_demo',
    rawRowId: 'raw_023',
    parserVersion: 'sparrow.v0',
  },
  occurredAt: '2025-07-04T12:00:00Z',
  asset: 'BTC',
  quantitySats: 1000000,
  direction: 'internal',
  eventType: 'self_transfer',
  taxableStatus: 'non_taxable',
  fee: {
    asset: 'BTC',
    amountSats: 210,
  },
  txid: 'tx_demo_self_transfer_001',
  label: 'Transfert personnel demo',
  relatedEventIds: ['evt_demo_platform_withdrawal_001'],
}
```

### 8.5 Opération à revoir

```ts
const manualReview: NormalizedEvent = {
  id: 'evt_demo_review_001',
  schemaVersion: 'normalized-event.v0',
  sourceRef: {
    sourceId: 'src_sparrow_demo',
    importId: 'imp_sparrow_2025_demo',
    rawRowId: 'raw_031',
    parserVersion: 'sparrow.v0',
  },
  occurredAt: '2025-09-10T08:45:00Z',
  asset: 'BTC',
  quantitySats: 150000,
  direction: 'out',
  eventType: 'manual_review',
  taxableStatus: 'needs_review',
  txid: 'tx_demo_review_001',
  label: 'Sortie non qualifiée demo',
  reviewReasons: [
    'Sortie BTC détectée sans contrepartie identifiée',
    'Impossible de déterminer si transfert personnel, dépense ou vente',
  ],
}
```

---

## 9. Cas de test attendus

Les tests V0 devront vérifier au minimum :

```text
[ ] Accepter un événement acquisition valide.
[ ] Accepter un événement vente valide.
[ ] Accepter un événement dépense valide.
[ ] Accepter un transfert personnel valide.
[ ] Accepter une opération à revoir valide.
[ ] Refuser un asset différent de BTC.
[ ] Refuser une date invalide.
[ ] Refuser un quantitySats négatif.
[ ] Refuser un eventType inconnu.
[ ] Refuser un taxableStatus inconnu.
[ ] Refuser un événement sans sourceRef complet.
[ ] Vérifier que manual_review implique needs_review.
[ ] Vérifier que pro_income implique out_of_scope.
```

---

## 10. Décisions V0

| Sujet | Décision |
|---|---|
| Unité BTC | Satoshis entiers. |
| Unité EUR | Centimes entiers. |
| Multi-actifs | Exclu. BTC uniquement. |
| Fiscalité professionnelle | Hors périmètre, `out_of_scope`. |
| Sortie non qualifiée | `manual_review` + `needs_review`. |
| Lien ligne brute | Obligatoire via `sourceRef.rawRowId`. |
| Calcul 2086 | Non inclus dans ce format. Traité par le moteur fiscal. |
| Base SQLite | Non incluse dans cette issue. Traité par l’issue #3. |

---

## 11. Hors périmètre de ce document

Ce document ne définit pas :

- la base SQLite ;
- les parseurs CSV réels ;
- l’interface utilisateur ;
- le moteur fiscal complet ;
- l’export XLSX ;
- la checklist 3916-bis ;
- les règles de rapprochement avancé entre plateformes et wallets.
# Schéma base locale V0 — FiscalUTXO

## 1. Objectif

Définir le schéma minimal de base locale pour FiscalUTXO.

Le schéma V0 doit permettre de conserver :

- les sources d’import ;
- les fichiers importés ;
- les lignes brutes ;
- les événements normalisés ;
- les corrections utilisateur ;
- les éléments préparatoires à la déclaration ;
- un journal d’audit minimal.

Ce document est une spécification. Il ne crée pas encore de migration exécutable.

---

## 2. Périmètre V0

### Inclus

- Bitcoin uniquement.
- Imports CSV.
- Stockage local.
- Traçabilité des lignes brutes.
- Rattachement à `NormalizedEvent V0`.
- Qualification fiscale préparatoire.
- Audit des corrections utilisateur.
- Exports futurs.

### Exclu

- Multi-utilisateur.
- Synchronisation cloud.
- Optimisation performance avancée.
- Chiffrement applicatif avancé.
- API plateformes.
- Altcoins.
- Comptabilité professionnelle complète.

---

## 3. Principes de conception

### 3.1 Local-first

La base est locale à l’utilisateur.

Aucune table ne doit supposer :

- compte distant ;
- synchronisation cloud ;
- authentification serveur ;
- multi-utilisateur.

### 3.2 Données brutes conservées

Une ligne importée ne doit jamais être supprimée ou écrasée silencieusement.

La normalisation doit toujours pouvoir être retracée vers :

- source ;
- import ;
- ligne brute ;
- version de parseur.

### 3.3 Bitcoin-only

Le schéma prévoit un champ `asset`, mais V0 doit valider uniquement :

```text
BTC
```

Le champ existe pour rendre le modèle lisible, pas pour ouvrir le scope aux altcoins.

### 3.4 Entiers uniquement pour les montants

- Montants Bitcoin : satoshis entiers.
- Montants EUR : centimes entiers.

Aucun montant fiscal ou Bitcoin critique ne doit être stocké en flottant.

### 3.5 Prudence fiscale

Une opération ambiguë doit rester revue manuellement :

```text
needs_review
```

---

## 4. Vue d’ensemble

```text
sources
  ↓
imports
  ↓
raw_rows
  ↓
normalized_events
  ↓
fiscal_classifications
  ↓
disposal_preparations

user_corrections
  ↘ audit_log
```

---

## 5. Tables V0

## 5.1 `sources`

Représente une origine de données : wallet, plateforme ou saisie manuelle.

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  country TEXT,
  is_french_platform INTEGER NOT NULL DEFAULT 0,
  requires_3916_review INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (source_type IN ('wallet', 'platform', 'manual'))
);
```

### Champs obligatoires

| Champ | Rôle |
|---|---|
| `id` | Identifiant interne stable. |
| `name` | Nom lisible : Sparrow, Paymium, Bitstack, etc. |
| `source_type` | `wallet`, `platform` ou `manual`. |
| `is_french_platform` | Indication documentaire. Ne remplace pas une vérification fiscale. |
| `requires_3916_review` | Déclenche une revue 3916-bis. |
| `created_at` | Date de création. |
| `updated_at` | Date de mise à jour. |

---

## 5.2 `imports`

Représente un fichier ou lot importé.

```sql
CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  parser_name TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  import_status TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id),
  CHECK (import_status IN ('imported', 'partial', 'failed'))
);
```

### Contraintes

- `file_hash` permet d’identifier les imports en double.
- `parser_version` est obligatoire pour audit.
- Un import `partial` doit conserver les lignes brutes lisibles.

---

## 5.3 `raw_rows`

Conserve chaque ligne brute importée.

```sql
CREATE TABLE raw_rows (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  raw_payload TEXT NOT NULL,
  row_hash TEXT NOT NULL,
  parse_status TEXT NOT NULL,
  parse_error TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (import_id) REFERENCES imports(id),
  CHECK (parse_status IN ('parsed', 'needs_review', 'error')),
  UNIQUE (import_id, row_number)
);
```

### Règles

- `raw_payload` contient la ligne sous forme JSON texte ou représentation structurée.
- `row_hash` aide à détecter les doublons.
- Une ligne en erreur reste conservée.

---

## 5.4 `normalized_events`

Stocke les événements normalisés conformes à `docs/NORMALIZED_EVENT.md`.

```sql
CREATE TABLE normalized_events (
  id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  source_id TEXT NOT NULL,
  import_id TEXT NOT NULL,
  raw_row_id TEXT NOT NULL,
  parser_version TEXT NOT NULL,

  occurred_at TEXT NOT NULL,
  timezone TEXT,

  asset TEXT NOT NULL,
  quantity_sats INTEGER NOT NULL,
  direction TEXT NOT NULL,
  event_type TEXT NOT NULL,
  taxable_status TEXT NOT NULL,

  fiat_currency TEXT,
  fiat_gross_amount_cents INTEGER,
  fiat_fee_cents INTEGER,
  fiat_net_amount_cents INTEGER,
  fiat_price_source TEXT,
  fiat_price_source_label TEXT,

  fee_asset TEXT,
  fee_amount_sats INTEGER,

  txid TEXT,
  label TEXT,
  counterparty TEXT,
  review_reasons TEXT,
  user_notes TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (source_id) REFERENCES sources(id),
  FOREIGN KEY (import_id) REFERENCES imports(id),
  FOREIGN KEY (raw_row_id) REFERENCES raw_rows(id),

  CHECK (schema_version = 'normalized-event.v0'),
  CHECK (asset = 'BTC'),
  CHECK (quantity_sats >= 0),
  CHECK (direction IN ('in', 'out', 'internal', 'fee')),
  CHECK (event_type IN (
    'acquisition',
    'disposal_sale',
    'disposal_spend',
    'self_transfer',
    'fee',
    'reward',
    'donation',
    'pro_income',
    'manual_review'
  )),
  CHECK (taxable_status IN (
    'taxable',
    'non_taxable',
    'needs_review',
    'out_of_scope'
  )),
  CHECK (fiat_currency IS NULL OR fiat_currency = 'EUR'),
  CHECK (fee_asset IS NULL OR fee_asset = 'BTC')
);
```

### Notes

- `review_reasons` est stocké en JSON texte.
- `user_notes` reste local.
- `txid` doit être traité comme donnée sensible dans les exports et exemples.

---

## 5.5 `event_links`

Relie plusieurs événements entre eux.

Exemples :

- retrait plateforme ↔ réception wallet ;
- frais ↔ transaction principale ;
- correction ↔ événement d’origine.

```sql
CREATE TABLE event_links (
  id TEXT PRIMARY KEY,
  from_event_id TEXT NOT NULL,
  to_event_id TEXT NOT NULL,
  link_type TEXT NOT NULL,
  confidence TEXT NOT NULL,
  created_at TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY (from_event_id) REFERENCES normalized_events(id),
  FOREIGN KEY (to_event_id) REFERENCES normalized_events(id),
  CHECK (link_type IN ('possible_self_transfer', 'confirmed_self_transfer', 'fee_for_event', 'correction_of')),
  CHECK (confidence IN ('low', 'medium', 'high', 'user_confirmed')),
  UNIQUE (from_event_id, to_event_id, link_type)
);
```

---

## 5.6 `fiscal_classifications`

Stocke la qualification fiscale préparatoire validée ou modifiée par l’utilisateur.

```sql
CREATE TABLE fiscal_classifications (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  taxable_status TEXT NOT NULL,
  event_type TEXT NOT NULL,
  classification_source TEXT NOT NULL,
  confidence TEXT NOT NULL,
  reason TEXT,
  user_validated INTEGER NOT NULL DEFAULT 0,
  validated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES normalized_events(id),
  CHECK (taxable_status IN ('taxable', 'non_taxable', 'needs_review', 'out_of_scope')),
  CHECK (classification_source IN ('parser', 'rule', 'user', 'import', 'manual')),
  CHECK (confidence IN ('low', 'medium', 'high', 'user_confirmed'))
);
```

### Rôle

Cette table permet de séparer :

- l’événement normalisé ;
- la qualification fiscale préparatoire ;
- la validation utilisateur.

---

## 5.7 `disposal_preparations`

Prépare les données utiles pour les futures lignes déclaratives.

Cette table ne calcule pas encore automatiquement toute la déclaration 2086. Elle stocke les valeurs nécessaires ou à compléter.

```sql
CREATE TABLE disposal_preparations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,

  disposal_date TEXT NOT NULL,
  sale_price_cents INTEGER,
  disposal_fee_cents INTEGER,
  net_sale_price_cents INTEGER,

  global_portfolio_value_cents INTEGER,
  total_acquisition_price_cents INTEGER,
  prior_deducted_capital_fraction_cents INTEGER,
  prior_soultes_cents INTEGER,

  capital_gain_cents INTEGER,
  calculation_status TEXT NOT NULL,
  missing_fields TEXT,
  user_validated INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (event_id) REFERENCES normalized_events(id),
  CHECK (calculation_status IN ('complete', 'incomplete', 'needs_review'))
);
```

### Règles

- Si une donnée fiscale manque, `calculation_status = 'incomplete'` ou `needs_review`.
- `missing_fields` est stocké en JSON texte.
- Aucun montant ne doit être inventé pour compléter un calcul.

---

## 5.8 `user_corrections`

Journalise les corrections utilisateur sur les événements ou classifications.

```sql
CREATE TABLE user_corrections (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TEXT NOT NULL,
  CHECK (entity_type IN ('normalized_event', 'fiscal_classification', 'disposal_preparation'))
);
```

---

## 5.9 `audit_log`

Journal d’audit minimal.

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL,
  notes TEXT
);
```

### Actions possibles V0

```text
import_created
event_normalized
classification_created
classification_updated
correction_created
disposal_preparation_created
export_created
```

---

## 5.10 `exports`

Trace les exports générés localement.

```sql
CREATE TABLE exports (
  id TEXT PRIMARY KEY,
  export_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  generated_at TEXT NOT NULL,
  parameters_json TEXT,
  notes TEXT,
  CHECK (export_type IN ('json', 'csv', 'xlsx', 'pdf'))
);
```

---

## 6. Relations principales

```text
sources.id
  → imports.source_id

imports.id
  → raw_rows.import_id
  → normalized_events.import_id

raw_rows.id
  → normalized_events.raw_row_id

normalized_events.id
  → fiscal_classifications.event_id
  → disposal_preparations.event_id
  → event_links.from_event_id
  → event_links.to_event_id
```

---

## 7. Index recommandés V0

```sql
CREATE INDEX idx_imports_source_id ON imports(source_id);
CREATE INDEX idx_raw_rows_import_id ON raw_rows(import_id);
CREATE INDEX idx_normalized_events_source_id ON normalized_events(source_id);
CREATE INDEX idx_normalized_events_import_id ON normalized_events(import_id);
CREATE INDEX idx_normalized_events_raw_row_id ON normalized_events(raw_row_id);
CREATE INDEX idx_normalized_events_occurred_at ON normalized_events(occurred_at);
CREATE INDEX idx_normalized_events_taxable_status ON normalized_events(taxable_status);
CREATE INDEX idx_fiscal_classifications_event_id ON fiscal_classifications(event_id);
CREATE INDEX idx_disposal_preparations_event_id ON disposal_preparations(event_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

Ces index restent simples. L’optimisation avancée est hors périmètre V0.

---

## 8. Contraintes de traçabilité

Chaque événement normalisé doit permettre de répondre à ces questions :

```text
De quel fichier vient-il ?
De quelle ligne brute vient-il ?
Quel parseur l’a produit ?
Quelle qualification fiscale lui a été appliquée ?
Qui ou quoi a modifié cette qualification ?
Quelles données restent manquantes ?
```

---

## 9. Tests attendus

Les tests du futur schéma devront vérifier :

```text
[ ] Créer une source wallet valide.
[ ] Créer une source plateforme valide.
[ ] Refuser un source_type inconnu.
[ ] Créer un import lié à une source.
[ ] Refuser un import sans source.
[ ] Conserver une ligne brute valide.
[ ] Refuser deux raw_rows avec même import_id + row_number.
[ ] Créer un normalized_event lié à source, import et raw_row.
[ ] Refuser un asset différent de BTC.
[ ] Refuser un quantity_sats négatif.
[ ] Refuser un taxable_status inconnu.
[ ] Créer une fiscal_classification liée à un événement.
[ ] Créer une correction utilisateur.
[ ] Créer une entrée audit_log.
[ ] Créer une disposal_preparation incomplète sans inventer de données.
```

---

## 10. Sécurité et vie privée

Le schéma ne doit pas encourager la collecte de données sensibles.

Interdits V0 :

- seed ;
- clé privée ;
- xpriv ;
- xpub ;
- mot de passe plateforme ;
- token API réel ;
- données fiscales réelles dans les fixtures.

Données à traiter avec prudence :

- txid ;
- labels utilisateur ;
- contreparties ;
- notes utilisateur ;
- exports.

---

## 11. Décisions V0

| Sujet | Décision |
|---|---|
| Base locale | SQLite ou compatible local. |
| Multi-utilisateur | Exclu. |
| Cloud | Exclu. |
| Montants BTC | Satoshis entiers. |
| Montants EUR | Centimes entiers. |
| Données brutes | Toujours conservées. |
| Corrections utilisateur | Journalisées. |
| Fiscalité automatique complète | Exclue de cette issue. |
| Opérations ambiguës | `needs_review`. |
| Altcoins | Exclus. |

---

## 12. Hors périmètre de cette issue

Ce document ne définit pas :

- les migrations applicatives ;
- les parseurs CSV ;
- l’interface utilisateur ;
- le moteur de calcul 2086 complet ;
- le chiffrement local ;
- la stratégie de sauvegarde ;
- la synchronisation ;
- les optimisations de performance.
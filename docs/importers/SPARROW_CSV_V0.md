# Import CSV Sparrow V0

## 1. Objectif

Définir l’import CSV Sparrow V0 pour FiscalUTXO.

Cet import vise à convertir un export transaction Sparrow Wallet en :

```text
raw_rows
→ normalized_events
→ fiscal_classifications
```

Le V0 reste volontairement défensif : Sparrow donne une vue wallet, pas une vérité fiscale complète.

---

## 2. Source de référence

Le contrat CSV V0 est fondé sur le code officiel Sparrow Wallet.

Dans `WalletTransactions.java`, Sparrow écrit les colonnes suivantes lors de l’export transaction :

```text
Date (UTC)
Label
Value
Balance
Fee
Value (<FIAT>)   optionnel
Txid
```

La colonne fiat n’est présente que si une devise fiat est configurée et disponible.

Le même fichier indique que les valeurs fiat historiques sont basées sur des taux journaliers et doivent être considérées comme approximatives.

---

## 3. Recommandation d’export Sparrow

Pour un test propre avec FiscalUTXO, il est recommandé d’exporter Sparrow **sans source de taux FIAT configurée**.

Dans Sparrow Wallet :

```text
File
→ Preferences
→ Exchange rate source
→ None
```

Objectif : produire un export wallet Bitcoin le plus neutre possible, sans mélanger le flux d’import avec une valeur fiat indicative.

Cette recommandation n’empêche pas FiscalUTXO de lire `Value (EUR)` si la colonne existe déjà. La colonne reste supportée en V0 pour compatibilité, mais elle n’est pas recommandée comme base fiscale.

La valeur fiscale devra être traitée plus tard par une source de prix contrôlée, une facture, un justificatif ou une qualification utilisateur.

---

## 4. Périmètre V0

### Inclus

- Export CSV transaction Sparrow.
- Bitcoin uniquement.
- Dates UTC.
- Valeurs BTC ou sats selon configuration Sparrow.
- Valeur fiat optionnelle, supportée mais non recommandée.
- Conservation des lignes brutes.
- Conversion défensive vers `NormalizedEvent`.
- Classement fiscal prudent.

### Exclu

- Import d’autres exports Sparrow, par exemple UTXO ou adresses.
- Import wallet chiffré Sparrow.
- Lecture directe du fichier wallet Sparrow.
- Détection automatique complète des transferts personnels.
- Déduction fiscale automatique des sorties.
- Fixtures CSV fictives.
- Implémentation TypeScript complète.

---

## 5. Colonnes attendues

## 5.1 Colonnes obligatoires

| Colonne Sparrow | Obligatoire | Usage FiscalUTXO |
|---|---:|---|
| `Date (UTC)` | Oui | `occurredAt` ou revue si `Unconfirmed`. |
| `Label` | Oui | `label`. Peut aider à préqualifier. |
| `Value` | Oui | `quantitySats` avec signe. |
| `Balance` | Oui | Conservé dans raw row ; non utilisé directement en V0. |
| `Fee` | Oui | `fee.amountSats` si renseigné. |
| `Txid` | Oui | `txid`. Donnée sensible à traiter avec prudence. |

## 5.2 Colonne fiat optionnelle

| Colonne Sparrow | Obligatoire | Usage FiscalUTXO |
|---|---:|---|
| `Value (<FIAT>)` | Non | `fiat.grossAmountCents` uniquement si `<FIAT> = EUR`. |

Règle : si la colonne fiat existe mais n’est pas `Value (EUR)`, elle est conservée dans la ligne brute mais non convertie en montant EUR V0.

Règle de préférence : pour les tests FiscalUTXO, exporter Sparrow avec `Exchange rate source = None` afin de ne pas générer cette colonne.

---

## 6. Détection du format

Un fichier est candidat Sparrow Transactions CSV si :

```text
[ ] Il contient Date (UTC).
[ ] Il contient Label.
[ ] Il contient Value.
[ ] Il contient Balance.
[ ] Il contient Fee.
[ ] Il contient Txid.
```

La présence de `Value (EUR)` est optionnelle et non recommandée pour les tests propres.

Si les colonnes obligatoires ne sont pas présentes, l’import doit être refusé ou classé `failed` avec un message lisible.

---

## 7. Parsing des champs

## 7.1 Date

Sparrow exporte les dates confirmées au format :

```text
yyyy-MM-dd HH:mm:ss
```

La timezone est UTC.

Conversion attendue :

```text
2025-05-21 18:30:00
→ 2025-05-21T18:30:00Z
```

Cas particulier :

```text
Unconfirmed
```

Règle V0 :

- conserver la ligne brute ;
- créer un événement si possible avec `needs_review` ;
- ne pas inventer de date confirmée ;
- utiliser une date technique d’import uniquement dans les métadonnées, pas comme date fiscale.

## 7.2 Value

`Value` représente la variation nette du wallet pour cette transaction.

Dans le code Sparrow, cette valeur provient de `TransactionEntry.getValue()`, qui additionne les sorties appartenant au wallet et soustrait les entrées dépensées depuis le wallet.

Conséquences :

- valeur positive : entrée nette dans le wallet ;
- valeur négative : sortie nette du wallet ;
- valeur nulle : cas possible à revoir.

La valeur peut être exportée :

- en BTC décimal si l’unité Sparrow est BTC ;
- en sats entier si l’unité Sparrow est sats.

Règle V0 : l’importeur doit accepter les deux formes, mais convertir en `quantitySats` entier.

## 7.3 Balance

`Balance` est le solde wallet après transaction selon Sparrow.

Règle V0 :

- conserver dans `raw_rows` ;
- ne pas l’utiliser pour calcul fiscal ;
- ne pas l’utiliser comme portefeuille fiscal global.

Important : le portefeuille fiscal français peut inclure d’autres wallets ou plateformes. Le solde Sparrow n’est donc pas la valeur globale du portefeuille fiscal.

## 7.4 Fee

`Fee` représente les frais réseau calculés par Sparrow si disponibles.

Règles :

- champ vide : pas de frais exploitable ;
- valeur présente : convertir en sats ;
- frais non disponible : ne pas inventer ;
- frais coinbase éventuels : à revoir si rencontré.

## 7.5 Value (EUR)

Si la colonne `Value (EUR)` existe, Sparrow la calcule à partir de taux historiques journaliers.

Règles V0 :

- convertir en centimes si présent et parseable ;
- définir `fiat.priceSource = 'market_price'` ;
- définir `fiat.priceSourceLabel = 'Sparrow historical daily rate'` ;
- marquer comme valeur indicative ;
- ne jamais traiter cette valeur comme preuve fiscale suffisante pour un paiement commerçant ou une vente plateforme.

Position produit : cette colonne reste supportée, mais elle n’est pas recommandée pour le test propre de l’import Sparrow. L’export cible doit plutôt être produit avec `Exchange rate source = None`.

Pour une dépense réelle, la valeur de référence doit plutôt venir d’une facture, d’un ticket, d’une source de prix contrôlée ou d’une saisie utilisateur qualifiée.

## 7.6 Txid

`Txid` est conservé dans `txid`.

Règles sécurité :

- ne pas publier de txid réels dans les fixtures ;
- ne pas exposer inutilement les txid dans les exports publics ;
- traiter comme donnée patrimoniale sensible.

---

## 8. Conversion vers NormalizedEvent

## 8.1 Entrée nette positive

Condition :

```text
Value > 0
```

Événement V0 par défaut :

```ts
eventType: 'manual_review'
taxableStatus: 'needs_review'
direction: 'in'
```

Pourquoi pas `acquisition` automatiquement ?

Parce qu’une entrée Sparrow peut être :

- un retrait depuis une plateforme ;
- un transfert personnel ;
- un paiement reçu ;
- un remboursement ;
- une acquisition ;
- une autre opération.

Sparrow seul ne suffit pas à trancher.

## 8.2 Sortie nette négative

Condition :

```text
Value < 0
```

Événement V0 par défaut :

```ts
eventType: 'manual_review'
taxableStatus: 'needs_review'
direction: 'out'
```

Pourquoi pas `disposal_spend` ou `disposal_sale` automatiquement ?

Parce qu’une sortie Sparrow peut être :

- un transfert personnel ;
- une dépense ;
- un dépôt sur plateforme avant vente ;
- une donation ;
- une erreur ou consolidation UTXO.

Règle absolue : une sortie Sparrow n’est jamais automatiquement une cession imposable.

## 8.3 Valeur nulle

Condition :

```text
Value = 0
```

Événement V0 par défaut :

```ts
eventType: 'manual_review'
taxableStatus: 'needs_review'
direction: 'internal'
```

Ajouter une raison :

```text
Valeur nette nulle détectée dans l’export Sparrow.
```

## 8.4 Frais seuls

Si une ligne permet d’identifier uniquement des frais, l’événement doit rester prudent :

```ts
eventType: 'fee'
taxableStatus: 'needs_review'
direction: 'fee'
```

Le rattachement des frais à une cession imposable est hors V0.

---

## 9. Préqualification par label

Le label Sparrow peut aider, mais ne doit pas forcer une qualification fiscale sans validation utilisateur.

Préfixes optionnels reconnus plus tard :

```text
ACQ:
SELF:
SPEND:
SALE:
DON:
PRO:
```

Règle V0 :

- si un préfixe reconnu existe, proposer une classification avec `confidence = medium` ;
- ne pas marquer `user_confirmed` sans action utilisateur ;
- si le label contient `PRO:`, classer `out_of_scope` pour le régime privé.

---

## 10. Mapping vers les tables V0

## 10.1 `sources`

Créer ou réutiliser une source :

```text
name = Sparrow Wallet
source_type = wallet
country = null
is_french_platform = 0
requires_3916_review = 0
```

## 10.2 `imports`

Créer un import avec :

```text
parser_name = sparrow-transactions-csv
parser_version = sparrow-transactions-csv.v0
file_name
file_hash
row_count
error_count
```

## 10.3 `raw_rows`

Chaque ligne CSV doit être conservée sous forme structurée.

Exemple logique avec colonne FIAT optionnelle :

```json
{
  "Date (UTC)": "2025-05-21 18:30:00",
  "Label": "Paiement exemple",
  "Value": "-0.00070000",
  "Balance": "0.12345678",
  "Fee": "0.00000120",
  "Value (EUR)": "42.00",
  "Txid": "..."
}
```

Pour un test propre, l’export cible ne devrait normalement pas contenir `Value (EUR)`.

Pas de fixture réelle dans le dépôt.

## 10.4 `normalized_events`

Créer un événement par ligne parsée exploitable.

Champs principaux :

```text
schema_version = normalized-event.v0
asset = BTC
quantity_sats = abs(Value)
direction = in | out | internal | fee
event_type = manual_review par défaut
taxable_status = needs_review par défaut
source_id / import_id / raw_row_id obligatoires
```

## 10.5 `fiscal_classifications`

Créer une classification initiale :

```text
classification_source = parser
confidence = low
user_validated = 0
```

Sauf label explicite reconnu :

```text
classification_source = rule
confidence = medium
user_validated = 0
```

---

## 11. Erreurs et anomalies

## 11.1 Colonnes manquantes

Si une colonne obligatoire manque :

```text
import_status = failed
raw_rows = conservées si possible
message = colonne obligatoire manquante
```

## 11.2 Date invalide

```text
parse_status = needs_review ou error
normalized_event non créé si aucune date exploitable
```

Exception : `Unconfirmed`, traité séparément.

## 11.3 Montant invalide

```text
parse_status = error
event non créé
```

## 11.4 Txid manquant

Si colonne présente mais valeur vide :

```text
parse_status = needs_review
normalized_event possible
txid absent
reviewReasons inclut Txid manquant
```

## 11.5 Devise fiat non EUR

Si une colonne `Value (USD)` ou autre existe :

```text
conserver dans raw_rows
ne pas remplir fiat.currency
reviewReasons inclut Devise fiat non EUR ignorée en V0
```

---

## 12. Tests attendus sans fixture ajoutée

Aucune fixture CSV ne doit être ajoutée dans cette issue.

Les tests futurs devront couvrir :

```text
[ ] Détecter un export Sparrow avec colonnes obligatoires.
[ ] Refuser un CSV sans Date (UTC).
[ ] Refuser un CSV sans Value.
[ ] Refuser un CSV sans Txid.
[ ] Parser une valeur BTC décimale en sats.
[ ] Parser une valeur sats entière en sats.
[ ] Parser une valeur négative en direction out.
[ ] Parser une valeur positive en direction in.
[ ] Classer une sortie en manual_review + needs_review.
[ ] Classer une entrée en manual_review + needs_review.
[ ] Conserver Balance sans l’utiliser comme portefeuille fiscal global.
[ ] Conserver Fee si parseable.
[ ] Ignorer Value (USD) comme fiat EUR.
[ ] Traiter Value (EUR) comme valeur indicative si elle existe.
[ ] Recommander un export Sparrow sans colonne FIAT pour les tests réels.
[ ] Conserver chaque ligne brute.
```

---

## 13. Décisions V0

| Sujet | Décision |
|---|---|
| Format cible | Export Transactions Sparrow CSV. |
| Source de vérité colonnes | Code officiel `WalletTransactions.java`. |
| Export recommandé | `Exchange rate source = None`. |
| Fixtures | Aucune fixture dans cette issue. |
| Sortie BTC | `manual_review` + `needs_review` par défaut. |
| Entrée BTC | `manual_review` + `needs_review` par défaut. |
| Fiat Sparrow | Supporté si présent, indicatif, non recommandé. |
| Valeur fiscale | À traiter plus tard via source contrôlée ou qualification utilisateur. |
| Balance Sparrow | Conservée, non utilisée fiscalement. |
| Txid | Conservé, sensible. |
| Devise non EUR | Conservée en brut, ignorée dans `fiat`. |

---

## 14. Limites assumées

Sparrow ne connaît pas :

- le prix d’acquisition exact si achat fait ailleurs ;
- la nature fiscale d’une sortie ;
- le portefeuille fiscal global ;
- les comptes plateformes ;
- les factures ou tickets commerçants ;
- les ventes réalisées après dépôt sur plateforme.

Donc l’import Sparrow V0 doit rester un import wallet, pas un calculateur fiscal autonome.
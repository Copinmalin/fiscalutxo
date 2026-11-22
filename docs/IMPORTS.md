# Imports CSV — FiscalUTXO

## Objet

Décrire les formats CSV supportés par l’application et leur transformation vers le format interne canonique.

Les imports doivent rester :

- Bitcoin-only ;
- local-first ;
- défensifs ;
- traçables ;
- prudents fiscalement.

## Sources prioritaires

| Source | Statut | Document |
|---|---|---|
| Sparrow Wallet | Implémenté, V0 historique et export 2.5.6 | [`docs/importers/SPARROW_CSV_V0.md`](importers/SPARROW_CSV_V0.md) |
| Paymium | À documenter | À créer |
| Bitstack | À documenter | À créer |
| StackinSat | À documenter | À créer |
| Bull Bitcoin | À vérifier après export réel | À créer |
| CSV générique et saisie manuelle | Implémentés | Voir ci-dessous |

Pour une sortie Sparrow confirmée, la fiche de qualification peut estimer le solde avant la cession en ajoutant la quantité sortie au solde indiqué dans `Balance (sats)` ou `Balance (BTC)`. Elle applique le cours journalier estimé d’après `Value (EUR)`. L’utilisateur ajoute les avoirs Bitcoin du foyer détenus ailleurs et choisit de reprendre le montant proposé. Un bouton distinct convertit la quantité saisie en sats au même cours pour proposer un prix de cession avant frais. Celui-ci reste modifiable et doit être rapproché du prix réel de la vente ou de la valeur du bien ou service obtenu.

## Solde d’ouverture et valorisation par source

Ajouter les plateformes, puis les wallets personnels. L’import se fait depuis la fiche de chaque source. Le pays de l’entité et la référence du compte étranger se renseignent dans la fiche de la plateforme et alimentent le récapitulatif 3916-bis. L’import générique ne contient pas de solde cumulé. Renseigner un solde de référence daté et documenté, ou confirmer un solde nul au 1er janvier lorsque la source était vide. En l’absence de fichier, saisir les opérations BTC en les rattachant à la source. Pour Sparrow, une ligne datée avec un solde cumulé peut servir de référence. La reconstruction suppose que l’utilisateur confirme que l’historique couvre l’intervalle concerné.

La fiche de cession additionne les soldes en sats avant la cession et les valorise au cours journalier Sparrow disponible sur la ligne, ou à un cours BTC/EUR saisi. Les mouvements antérieurs doivent être qualifiés et les deux lignes des transferts rapprochées pour proposer le montant. L’état du capital d’acquisition à l’ouverture se saisit séparément. Les dossiers existants sans inventaire conservent leur parcours de valorisation précédent.

## Exigences communes

Chaque import doit conserver :

- le fichier source ;
- le hash du fichier ;
- les lignes brutes ;
- la version du parseur ;
- les erreurs de parsing ;
- les opérations normalisées ;
- les opérations à revoir.

## Règles communes de sécurité

Un import CSV doit traiter les données comme non fiables.

Règles :

- ne jamais exécuter de contenu CSV ;
- ne jamais supprimer silencieusement une ligne brute ;
- ne jamais inventer une date, un montant ou une classification fiscale ;
- ne jamais considérer une sortie Bitcoin comme automatiquement imposable ;
- marquer les ambiguïtés `needs_review` ;
- conserver les données sensibles localement.

## Règles communes de normalisation

Tout import doit produire ou préparer :

- une entrée `sources` ;
- une entrée `imports` ;
- une entrée `raw_rows` par ligne ;
- un ou plusieurs `normalized_events` si les données sont exploitables ;
- une classification fiscale initiale prudente.

## Principe

Un import ne doit jamais remplacer la qualification utilisateur.

Il doit seulement transformer une source brute en données structurées, traçables et révisables.

## CSV générique

Le modèle est téléchargeable depuis l’application. Le fichier est en UTF-8, séparé par des virgules, avec les en-têtes ci-dessous dans cet ordre. Entourer de guillemets les valeurs contenant une virgule, y compris les montants à virgule décimale.

```csv
date_utc,type,sats,prix_eur,frais_eur,portefeuille_eur,justificatif,valorisation,txid
2026-01-12T12:00:00Z,achat,1000000,1000,,,Avis fictif,,
2026-03-12T12:00:00Z,vente,375000,450,0,1200,Avis fictif,Cours fictif,
```

Les types proposés sont `achat`, `vente`, `paiement`, `depot` et `retrait`. Ces deux derniers proposent une revue en tant que transfert. Confirmer chaque ligne dans l’application et relier les deux côtés d’un transfert. Ajouter les montants et justificatifs manquants via l’interface. Les numéros de ligne indiquent la dernière ligne physique d’un enregistrement, y compris en présence d’un champ multiligne.

Le dossier bloque la qualification double d’un même identifiant de transaction sur une source. Pour des imports successifs, garder le même nom de source. Rapprocher les doublons éventuels et vérifier les saisies manuelles, qui reposent sur l’attestation de complétude du dossier.

Le CSV générique accepte une dernière colonne facultative `solde_sats` : solde de la source après le mouvement, en satoshis entiers. Elle permet de reconstituer automatiquement le solde d’ouverture.

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

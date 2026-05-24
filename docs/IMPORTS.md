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
| Sparrow Wallet | Spécifié V0 | [`docs/importers/SPARROW_CSV_V0.md`](importers/SPARROW_CSV_V0.md) |
| Paymium | À documenter | À créer |
| Bitstack | À documenter | À créer |
| StackinSat | À documenter | À créer |
| Bull Bitcoin | À vérifier après export réel | À créer |
| Import manuel générique | À documenter | À créer |

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
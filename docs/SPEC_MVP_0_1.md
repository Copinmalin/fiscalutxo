# Spécification MVP 0.1 — FiscalUTXO

## Objectif

Définir précisément la première version utilisable de FiscalUTXO avant d’élargir le périmètre.

Le MVP 0.1 doit d’abord prouver le flux local :

```text
CSV Sparrow local
→ parseur Sparrow V0
→ NormalizedEvent
→ bundle local d’import
→ JSON exploitable
```

## Périmètre fonctionnel MVP 0.1

Le MVP 0.1 doit permettre :

1. Importer un CSV Bitcoin local.
2. Normaliser les lignes importées.
3. Conserver les lignes brutes dans une structure locale exploitable.
4. Identifier les opérations à revoir.
5. Produire un JSON intermédiaire exploitable.
6. Préparer la future qualification fiscale.
7. Préparer les futurs exports déclaratifs.

## Hors périmètre

- Interface utilisateur complète.
- Multi-utilisateur.
- Cloud.
- API plateformes.
- Altcoins.
- Fiscalité professionnelle.
- Automatisation complète de la déclaration.
- Base SQLite exécutable dans l’immédiat.
- Export XLSX dans l’immédiat.

## Cas d’usage minimal actuel

Utilisateur : particulier français Bitcoin-only.

Scénario :

1. L’utilisateur exporte les transactions depuis Sparrow Wallet.
2. L’utilisateur garde ce fichier localement.
3. L’utilisateur lance la CLI FiscalUTXO.
4. La CLI lit le CSV local.
5. L’application conserve les lignes brutes dans un bundle local.
6. L’application convertit les opérations vers `NormalizedEvent`.
7. Les opérations ambiguës restent `manual_review` + `needs_review`.
8. L’application produit un JSON intermédiaire.
9. L’utilisateur ne committe jamais son CSV ou son JSON réel.

## Contrats de données

Le format canonique minimal du MVP est défini dans :

- [`docs/NORMALIZED_EVENT.md`](NORMALIZED_EVENT.md)

Le schéma local V0 est défini dans :

- [`docs/SQLITE_SCHEMA_V0.md`](SQLITE_SCHEMA_V0.md)

L’import Sparrow V0 est défini dans :

- [`docs/importers/SPARROW_CSV_V0.md`](importers/SPARROW_CSV_V0.md)

La CLI locale est documentée dans :

- [`docs/CLI.md`](CLI.md)

Ces documents servent de contrat entre les imports CSV, la normalisation, le bundle local, la future qualification fiscale et les futurs exports.

## Critères d’acceptation actuels

Le socle MVP 0.1 est acceptable si :

- un CSV Sparrow local peut être lu par la CLI ;
- les lignes brutes sont conservées dans le bundle ;
- les opérations sont converties vers `NormalizedEvent` ;
- les événements normalisés sont rattachables à leur source, import et ligne brute ;
- les opérations ambiguës sont marquées `needs_review` ;
- aucune donnée sensible de wallet n’est demandée ;
- aucun accès réseau n’est nécessaire ;
- un JSON lisible est produit ;
- la CI passe : `npm run lint`, `npm run test`, `npm run build`.

## Prochaine étape

Documenter un scénario de test manuel réel sans committer de données personnelles.
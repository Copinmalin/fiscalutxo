# Spécification MVP 0.1 — FiscalUTXO

Statut : brouillon initial.

## Objectif

Définir précisément la première version utilisable avant tout développement applicatif.

## Périmètre fonctionnel MVP 0.1

Le MVP 0.1 doit permettre :

1. Importer un CSV Bitcoin.
2. Normaliser les lignes importées.
3. Stocker les données localement.
4. Qualifier manuellement les opérations.
5. Identifier les opérations à revoir.
6. Préparer les champs utiles au formulaire 2086 dans un cas simple.
7. Exporter les données préparatoires.

## Hors périmètre

- Interface parfaite.
- Multi-utilisateur.
- Cloud.
- API plateformes.
- Altcoins.
- Fiscalité professionnelle.
- Automatisation complète de la déclaration.

## Cas d’usage minimal

Utilisateur : particulier français Bitcoin-only.

Scénario :

1. L’utilisateur importe un CSV.
2. L’application conserve les lignes brutes.
3. L’application convertit les opérations vers `NormalizedEvent`.
4. L’utilisateur qualifie chaque opération ambiguë.
5. L’application produit un tableau préparatoire.
6. L’utilisateur exporte les résultats.

## Format canonique

Le format canonique minimal du MVP est défini dans :

- [`docs/NORMALIZED_EVENT.md`](NORMALIZED_EVENT.md)

Ce format sert de contrat entre les imports CSV, le stockage local, la qualification fiscale et les futurs exports.

## Critères d’acceptation

Le MVP 0.1 est acceptable si :

- un CSV exemple peut être importé ;
- les lignes brutes sont conservées ;
- les opérations sont converties vers `NormalizedEvent` ;
- les opérations ambiguës sont marquées `needs_review` ;
- aucune donnée sensible de wallet n’est demandée ;
- un export lisible est produit ;
- les limites fiscales sont clairement affichées.

## Prochaine étape

Définir le schéma SQLite V0 en cohérence avec `NormalizedEvent`.
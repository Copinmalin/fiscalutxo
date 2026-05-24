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
2. L’application affiche les opérations détectées.
3. L’utilisateur qualifie chaque opération ambiguë.
4. L’application produit un tableau préparatoire.
5. L’utilisateur exporte les résultats.

## Critères d’acceptation

Le MVP 0.1 est acceptable si :

- un CSV exemple peut être importé ;
- les lignes brutes sont conservées ;
- les opérations sont converties vers un format normalisé ;
- les opérations ambiguës sont marquées `needs_review` ;
- aucune donnée sensible de wallet n’est demandée ;
- un export lisible est produit ;
- les limites fiscales sont clairement affichées.

## Prochaine étape

Définir le format `NormalizedEvent` V0.
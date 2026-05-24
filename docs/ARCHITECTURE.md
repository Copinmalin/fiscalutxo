# Architecture — FiscalUTXO

## Objectif

Construire une application locale simple, évolutive et testable.

La priorité actuelle est de valider le moteur local avant d’ajouter une interface ou une base SQLite exécutable.

## Architecture cible

```text
CSV imports
→ parsing
→ normalisation
→ bundle local ou stockage local
→ qualification utilisateur
→ moteur fiscal France
→ exports
```

## Architecture actuelle

```text
CSV Sparrow local
→ CLI locale
→ parseur Sparrow V0
→ NormalizedEvent
→ bundle local d’import
→ JSON stdout ou fichier
```

## Contraintes

- Local-first.
- CSV-first.
- Bitcoin-only.
- Pas de cloud dans le MVP.
- Pas de seed, clé privée, mot de passe ou xpub.
- Pas d’accès réseau nécessaire.
- Moteur isolé et testable.
- Base locale évolutive plus tard.

## Stack actuelle

- TypeScript.
- Node.js pour la CLI locale.
- Vitest pour les tests.
- GitHub Actions pour la CI.

## Stack cible future

- Web app locale.
- SQLite ou stockage local équivalent.
- Tauri plus tard si besoin desktop.
- Exports XLSX / CSV / JSON / PDF.

## Contrats de données

- [`docs/NORMALIZED_EVENT.md`](NORMALIZED_EVENT.md) : format canonique des événements normalisés.
- [`docs/SQLITE_SCHEMA_V0.md`](SQLITE_SCHEMA_V0.md) : schéma local V0 pour sources, imports, lignes brutes, événements normalisés, classifications, préparations fiscales et audit.
- [`docs/importers/SPARROW_CSV_V0.md`](importers/SPARROW_CSV_V0.md) : contrat d’import CSV Sparrow.
- [`docs/CLI.md`](CLI.md) : usage de la CLI locale.

## Frontières actuelles

Ce qui existe :

- types `NormalizedEvent` ;
- validation minimale ;
- parseur CSV Sparrow V0 ;
- bundle JSON local ;
- CLI locale ;
- tests unitaires et CI.

Ce qui n’existe pas encore :

- SQLite exécutable ;
- interface utilisateur ;
- moteur fiscal 2086 ;
- export XLSX ;
- imports plateformes ;
- qualification utilisateur persistée.

## À décider plus tard

- Framework UI.
- Solution exacte de base locale.
- Stratégie de migrations exécutables.
- Librairie d’export XLSX.
- Format de sauvegarde JSON définitif.
- Stratégie d’anonymisation pour jeux de démo.
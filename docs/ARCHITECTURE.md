# Architecture — FiscalUTXO

Statut : à préciser pendant la spécification MVP 0.1.

## Objectif

Construire une application locale simple, évolutive et testable.

## Architecture cible

```text
CSV imports
→ parsing
→ normalisation
→ stockage local
→ qualification utilisateur
→ moteur fiscal France
→ exports
```

## Contraintes

- Local-first.
- CSV-first.
- Bitcoin-only.
- Pas de cloud dans le MVP.
- Pas de seed, clé privée, mot de passe ou xpub.
- Base locale évolutive.
- Moteur fiscal isolé et testable.

## Stack pressentie

- TypeScript.
- Web app locale.
- SQLite ou stockage local équivalent.
- Tauri plus tard si besoin desktop.

## À décider

- Framework UI.
- Solution de base locale exacte.
- Structure monorepo ou app simple.
- Librairie d’export XLSX.
- Format de sauvegarde JSON.
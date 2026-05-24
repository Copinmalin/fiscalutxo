# FiscalUTXO

FiscalUTXO est une application locale Bitcoin-only destinée à aider un particulier résident fiscal français à préparer sa déclaration fiscale liée aux transactions Bitcoin.

Objectif : importer des historiques CSV, qualifier les opérations, appliquer les règles françaises utiles au formulaire 2086, puis produire des exports exploitables.

## Positionnement

FiscalUTXO n’est pas un fiscaliseur crypto généraliste.

Le projet vise un périmètre volontairement strict :

- France ;
- particulier résident fiscal français ;
- Bitcoin uniquement ;
- usage patrimonial privé ;
- imports CSV ;
- fonctionnement local-first ;
- préparation déclarative, pas déclaration automatique.

## Principes

- Les données restent locales.
- Aucun seed, aucune clé privée, aucun mot de passe plateforme.
- CSV d’abord, API plus tard seulement si nécessaire.
- Excel est une sortie, pas le moteur.
- Les opérations ambiguës doivent être marquées `needs_review`.
- Toute nouvelle fonctionnalité passe par une issue GitHub.

## Documents clés

- [`AGENTS.md`](AGENTS.md) : règles opérationnelles pour Codex et agents IA.
- [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) : source de vérité courte du projet.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) : suivi des phases et prochaine étape.
- [`docs/SPEC_MVP_0_1.md`](docs/SPEC_MVP_0_1.md) : spécification du MVP.
- [`docs/TAX_FR.md`](docs/TAX_FR.md) : règles fiscales françaises à documenter.
- [`docs/IMPORTS.md`](docs/IMPORTS.md) : formats CSV supportés.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture technique.

## État du projet

Phase actuelle : **Phase 0 — Cadrage GitHub**.

Prochaine étape : définir la spécification MVP 0.1 avant de coder l’application.

## Avertissement

FiscalUTXO est un outil d’aide à la préparation. Il ne remplace pas un conseil fiscal, un expert-comptable ou l’administration fiscale.
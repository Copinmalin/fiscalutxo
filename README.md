# FiscalUTXO

FiscalUTXO est un dépôt de travail pour concevoir et développer une application locale Bitcoin-only destinée à aider un particulier résident fiscal français à préparer sa déclaration fiscale liée à ses transactions Bitcoin.

Le dépôt sert à centraliser :

- le cadrage produit ;
- les règles de scope ;
- la documentation fiscale et technique ;
- les spécifications fonctionnelles ;
- les instructions de travail pour Codex et les agents IA ;
- les règles de tests et de sécurité ;
- le socle TypeScript du moteur d’import ;
- les futurs fichiers source de l’application.

## Objectif du projet

FiscalUTXO vise à fournir un outil local-first capable de :

- importer des historiques CSV issus de plateformes ou wallets Bitcoin ;
- conserver les données brutes importées ;
- normaliser les opérations dans un format interne commun ;
- accompagner la qualification fiscale des transactions ;
- préparer les éléments utiles aux déclarations françaises liées aux actifs numériques ;
- produire des exports exploitables par l’utilisateur.

Le projet est volontairement limité au périmètre suivant :

- France ;
- particulier résident fiscal français ;
- Bitcoin uniquement ;
- usage patrimonial privé ;
- imports CSV ;
- fonctionnement local-first ;
- préparation déclarative, sans déclaration automatique.

## État technique actuel

Le dépôt contient déjà un flux local minimal :

```text
CSV Sparrow local
→ CLI locale
→ parseur Sparrow V0
→ NormalizedEvent
→ bundle local d’import
→ JSON stdout ou fichier
```

La CLI est documentée dans [`docs/CLI.md`](docs/CLI.md).

## Structure du dépôt

```text
fiscalutxo/
├── README.md
├── AGENTS.md
├── package.json
├── tsconfig.json
├── src/
│   ├── cli/
│   ├── domain/
│   ├── importers/
│   ├── imports/
│   └── index.ts
├── tests/
├── docs/
│   ├── SOURCE_OF_TRUTH.md
│   ├── ROADMAP.md
│   ├── AI_RULES.md
│   ├── TEST_SECURITY_CHECKLIST.md
│   ├── SPEC_MVP_0_1.md
│   ├── TAX_FR.md
│   ├── IMPORTS.md
│   ├── ARCHITECTURE.md
│   ├── CLI.md
│   ├── NORMALIZED_EVENT.md
│   ├── SQLITE_SCHEMA_V0.md
│   └── importers/
│       └── SPARROW_CSV_V0.md
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
│       ├── 00-agent-task.yml
│       ├── feature.yml
│       ├── bug.yml
│       ├── research.yml
│       └── scope_change.yml
└── samples/
    └── README.md
```

## Documents principaux

- [`AGENTS.md`](AGENTS.md) : instructions opérationnelles pour Codex et les agents IA.
- [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) : source de vérité courte du projet.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) : plan de pilotage et suivi des phases.
- [`docs/AI_RULES.md`](docs/AI_RULES.md) : règles détaillées pour les interventions IA.
- [`docs/TEST_SECURITY_CHECKLIST.md`](docs/TEST_SECURITY_CHECKLIST.md) : checklist de tests, sécurité et vie privée.
- [`docs/SPEC_MVP_0_1.md`](docs/SPEC_MVP_0_1.md) : spécification fonctionnelle du MVP.
- [`docs/TAX_FR.md`](docs/TAX_FR.md) : notes fiscales françaises utiles au projet.
- [`docs/IMPORTS.md`](docs/IMPORTS.md) : formats CSV et règles d’import.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture technique cible.
- [`docs/CLI.md`](docs/CLI.md) : usage de la CLI locale.
- [`docs/NORMALIZED_EVENT.md`](docs/NORMALIZED_EVENT.md) : format canonique des événements normalisés.
- [`docs/SQLITE_SCHEMA_V0.md`](docs/SQLITE_SCHEMA_V0.md) : schéma local V0 documenté.
- [`docs/importers/SPARROW_CSV_V0.md`](docs/importers/SPARROW_CSV_V0.md) : contrat d’import CSV Sparrow.
- [`samples/README.md`](samples/README.md) : règles relatives aux jeux de données d’exemple.

## Commandes techniques

```bash
npm install
npm run lint
npm run test
npm run build
```

Utiliser la CLI après compilation :

```bash
npm run build
npm run cli -- sparrow ./transactions.csv
```

## Avertissement

FiscalUTXO est un outil d’aide à la préparation. Il ne remplace pas un conseil fiscal, un expert-comptable ou l’administration fiscale.

Les CSV et JSON produits peuvent contenir des données patrimoniales sensibles. Ils ne doivent pas être committés dans le dépôt.
# FiscalUTXO

FiscalUTXO est un dépôt de travail pour concevoir et développer une application locale Bitcoin-only destinée à aider un particulier résident fiscal français à préparer sa déclaration fiscale liée à ses transactions Bitcoin.

Le dépôt sert à centraliser :

- le cadrage produit ;
- les règles de scope ;
- la documentation fiscale et technique ;
- les spécifications fonctionnelles ;
- les instructions de travail pour Codex et les agents IA ;
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

## Structure du dépôt

```text
fiscalutxo/
├── README.md
├── AGENTS.md
├── docs/
│   ├── SOURCE_OF_TRUTH.md
│   ├── ROADMAP.md
│   ├── AI_RULES.md
│   ├── SPEC_MVP_0_1.md
│   ├── TAX_FR.md
│   ├── IMPORTS.md
│   └── ARCHITECTURE.md
├── .github/
│   └── ISSUE_TEMPLATE/
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
- [`docs/SPEC_MVP_0_1.md`](docs/SPEC_MVP_0_1.md) : spécification fonctionnelle du MVP.
- [`docs/TAX_FR.md`](docs/TAX_FR.md) : notes fiscales françaises utiles au projet.
- [`docs/IMPORTS.md`](docs/IMPORTS.md) : formats CSV et règles d’import.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : architecture technique cible.
- [`samples/README.md`](samples/README.md) : règles relatives aux jeux de données d’exemple.

## Avertissement

FiscalUTXO est un outil d’aide à la préparation. Il ne remplace pas un conseil fiscal, un expert-comptable ou l’administration fiscale.

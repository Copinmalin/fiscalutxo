# FiscalUTXO

FiscalUTXO est une application web locale qui aide un foyer fiscal français à préparer les cessions Bitcoin réalisées en 2026 dans le cadre de la gestion de son patrimoine privé.

## Essai dans le navigateur

L’édition statique se construit avec `npm run build:pages`. Elle réutilise le moteur local dans le navigateur. Le bouton **Essayer avec un exemple** charge un dossier fictif et permet de vérifier les résultats et les exports. Les dossiers personnels restent sur l’appareil et peuvent être sauvegardés en JSON.

## Démarrer en local

Avec Node.js 22.12 ou plus récent dans une branche LTS prise en charge :

```bash
npm ci
npm run build
npm start
```

Ouvrir dans le navigateur l’adresse `http://127.0.0.1:…` affichée dans le terminal. Une fois les dépendances installées, l’application fonctionne hors ligne.

1. Importer un CSV Sparrow, un CSV générique ou un bundle de la CLI. Utiliser un nom stable par wallet ou plateforme pour rapprocher les imports successifs.
2. Confirmer l’état du portefeuille au 1er janvier 2026, puis qualifier les achats, ventes, paiements et transferts. Les montants EUR indicatifs de Sparrow servent à la revue. Les montants fiscaux proviennent de justificatifs renseignés par l’utilisateur.
3. Renseigner les comptes concernés, confirmer la couverture du dossier et lancer le contrôle. Corriger les écarts affichés avant d’exporter le détail 2086, le résumé 2042 C et la checklist 3916-bis.
4. Cliquer sur **Enregistrer le dossier** pour télécharger le JSON rechargeable. Le conserver dans un dossier privé hors du dépôt. Le bouton **Ouvrir** restaure les imports et les qualifications.

La préparation cible les revenus 2026. Les exports restent des supports de travail jusqu’à vérification des formulaires officiels de la campagne 2027. L’application calcule la plus ou moins-value patrimoniale. Elle laisse le choix du barème au déclarant.

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
│   ├── mvp/
│   ├── web/
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
│   ├── MANUAL_REAL_TEST.md
│   ├── REMOTE_REAL_TEST.md
│   ├── NORMALIZED_EVENT.md
│   ├── SQLITE_SCHEMA_V0.md
│   └── importers/
│       └── SPARROW_CSV_V0.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── remote-real-sparrow-test.yml
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
- [`docs/MANUAL_REAL_TEST.md`](docs/MANUAL_REAL_TEST.md) : scénario de test manuel réel.
- [`docs/REMOTE_REAL_TEST.md`](docs/REMOTE_REAL_TEST.md) : scénario de test distant sécurisé.
- [`docs/NORMALIZED_EVENT.md`](docs/NORMALIZED_EVENT.md) : format canonique des événements normalisés.
- [`docs/SQLITE_SCHEMA_V0.md`](docs/SQLITE_SCHEMA_V0.md) : schéma local V0 documenté.
- [`docs/importers/SPARROW_CSV_V0.md`](docs/importers/SPARROW_CSV_V0.md) : contrat d’import CSV Sparrow.
- [`samples/README.md`](samples/README.md) : règles relatives aux jeux de données d’exemple.

## Commandes techniques

```bash
npm ci
npm run lint
npm run test
npm run build
```

Utiliser la CLI après compilation :

```bash
npm run build
npm run cli -- sparrow ~/dossier-prive/transactions.csv
```

## Avertissement

FiscalUTXO est un outil d’aide à la préparation. Il ne remplace pas un conseil fiscal, un expert-comptable ou l’administration fiscale.

Les CSV, JSON et XLSX produits peuvent contenir des données patrimoniales sensibles. Ils ne doivent pas être committés dans le dépôt.
# FiscalUTXO

FiscalUTXO est une application web locale qui aide un foyer fiscal français à préparer les cessions Bitcoin réalisées en 2025 ou 2026 dans le cadre de la gestion de son patrimoine privé.

## Essai dans le navigateur

1. Ouvrir [la démo FiscalUTXO](https://copinmalin.github.io/fiscalutxo/) sur ordinateur ou mobile.
2. Cliquer sur **Essayer avec un exemple**, puis sur **Contrôler le dossier** dans la section **Résultats**. Le dossier fictif affiche une plus-value de 750 €.
3. Essayer les exports CSV, JSON, XLSX ou **PDF 2086**. Pour reprendre ensuite un dossier, utiliser **Enregistrer le dossier**, puis **Ouvrir** pour recharger le fichier JSON produit.

La démo fonctionne sans installation ni compte. Les fichiers et les calculs restent dans le navigateur. Si le sélecteur de fichiers bloque sur mobile, utiliser **Coller le contenu à la place** dans le formulaire d’import.

## Démarrer en local

Depuis le dépôt, avec Node.js 22.12 ou plus récent dans une branche LTS prise en charge :

```bash
npm ci
npm run build
npm start
```

Ouvrir dans le navigateur l’adresse `http://127.0.0.1:…` affichée dans le terminal. Une fois les dépendances installées, l’application fonctionne hors ligne.

1. Choisir **Campagne déclarative** (2026 pour les opérations 2025, 2027 pour celles de 2026). Importer un CSV Sparrow, un CSV générique ou un bundle de la CLI. Utiliser un nom stable par wallet ou plateforme pour rapprocher les imports successifs.
2. Confirmer l’état du portefeuille au 1er janvier de l’année des opérations, puis qualifier les achats, ventes, paiements et transferts. Si l’export Sparrow contient `Value (EUR)`, elle s’affiche dans **Estimation EUR** et propose un prix modifiable pour un achat. Le label préremplit le champ **Justificatif ou référence**. Vérifier ces deux propositions avant de confirmer.
   Les lignes datées hors période restent dans les imports du dossier. Les lignes dont la date est inconnue restent à vérifier. Un changement de campagne ouvre un nouveau dossier.

   La colonne **Label** reprend le libellé Sparrow. Un libellé explicite comme `Vente : plateforme` peut proposer une qualification cohérente avec le sens du mouvement. L’utilisateur la confirme dans la fiche. Cliquer sur une ligne du tableau ouvre sa qualification. Sur mobile, la fiche donne accès au détail de l’opération. Pour une vente ou un paiement Sparrow, la fiche estime le solde du wallet avant cession au cours journalier du CSV. Renseigner les autres avoirs Bitcoin du foyer en sats (0 si aucun) pour reprendre l’estimation globale et documenter sa valorisation.
3. Renseigner les comptes concernés, confirmer la couverture du dossier et lancer le contrôle. Corriger les écarts affichés avant d’exporter le détail 2086, le résumé 2042 C et la checklist 3916-bis.
4. Cliquer sur **Enregistrer le dossier** pour télécharger le JSON rechargeable. Le conserver dans un dossier privé hors du dépôt. Le bouton **Ouvrir** restaure les imports et les qualifications.

Le PDF 2086 est une aide à la saisie basée sur les numéros de lignes du millésime 2026. Il correspond aux revenus 2025. Le dossier des revenus 2026 réutilise cette structure en attendant la vérification du formulaire officiel de la campagne 2027. L’application calcule la plus ou moins-value patrimoniale. Elle laisse le choix du barème au déclarant.

## Structure du dépôt

```text
fiscalutxo/
├── README.md
├── AGENTS.md
├── package.json
├── tsconfig.json
├── scripts/
│   └── build-pages.mjs
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
│   ├── COMPARATIF_CFF.md
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
- [`docs/COMPARATIF_CFF.md`](docs/COMPARATIF_CFF.md) : comparaison avec CryptoFiscaFacile et décisions retenues pour le MVP.
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
npm run build:pages
```

`npm run build:pages` génère l’édition statique dans `dist/pages/`. La branche `gh-pages` sert la démo publique.

Utiliser la CLI après compilation :

```bash
npm run build
npm run cli -- sparrow ~/dossier-prive/transactions.csv
```

## Avertissement

FiscalUTXO est un outil d’aide à la préparation. Il ne remplace pas un conseil fiscal, un expert-comptable ou l’administration fiscale.

Les CSV, JSON et XLSX produits peuvent contenir des données patrimoniales sensibles. Ils ne doivent pas être committés dans le dépôt.

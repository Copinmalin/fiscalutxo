# FiscalUTXO

FiscalUTXO est une application web locale qui aide un foyer fiscal français à préparer les cessions Bitcoin réalisées en 2025 ou 2026 dans le cadre de la gestion de son patrimoine privé.

## Essayer FiscalUTXO-multi

Ouvrez [FiscalUTXO-multi dans votre navigateur](https://copinmalin.github.io/fiscalutxo/multisource/) et sélectionnez **Campagne 2026 · opérations 2025**. Créez les trois sources puis importez un fichier fictif dans chaque fiche.

| Source | Fichier | Solde au 1er janvier | Solde final |
|---|---|---:|---:|
| Plateforme française | [CSV générique](samples/plateforme-multisource.csv) | 1 200 000 sats | 700 000 sats |
| Plateforme allemande | [CSV générique](samples/plateforme-etrangere-audit.csv) | 0 sat | 500 000 sats |
| Wallet personnel | [CSV Sparrow](samples/sparrow-multisource.csv) | 300 000 sats | 400 000 sats |

Le foyer commence avec **1 500 000 sats** et **900 € de capital d’acquisition**. Après qualification de l’achat, des deux côtés du transfert et de la vente, le contrôle donne **140 € en 3AN**. Le compte allemand apparaît dans **Comptes à déclarer**. Son CERFA 3916-bis est disponible indépendamment de l’aide PDF 2086. Retrouvez les valeurs à saisir et les résultats de chaque étape dans le [compte rendu de l’audit](docs/AUDIT-TROIS-SOURCES.md).

Le cours historique de mempool.space a été testé séparément. Le MVP utilise les montants importés ou confirmés par l’utilisateur et fonctionne sans connexion à ce service.

## Essayer la démo initiale à une source

1. Ouvrir [la démo FiscalUTXO](https://copinmalin.github.io/fiscalutxo/) sur ordinateur ou mobile.
2. Choisir **Campagne 2026 · opérations 2025**, puis cliquer sur **Essayer avec un exemple**. Le tableau contient six lignes fictives, dont l’achat initial et la vente à qualifier.
3. Ouvrir la ligne « Achat : acquisition fictive », utiliser la suggestion **Achat**, vérifier le prix de **1 000 €** et confirmer.
4. Ouvrir la ligne de vente et utiliser la suggestion **Vente**. Reprendre le prix de cession de **1 500 €** et saisir **0 €** de frais. Renseigner **0** dans les autres avoirs en sats, reprendre la valeur globale de **2 000 €** et saisir « Cours fictif Sparrow » comme justificatif de valorisation. Confirmer.
5. Cliquer sur **Contrôler le dossier** dans **Contrôle et exports**. Le résultat attendu est une plus-value de **750 €**, à reporter en **3AN**. Le dossier fictif a déjà ses deux contrôles de périmètre et de comptes cochés. Essayer ensuite le PDF 2086, les exports ou la sauvegarde JSON.

Pour tester l’import lui-même, télécharger [le CSV Sparrow fictif](samples/sparrow-demo.csv) et l’importer dans un dossier vierge de la campagne 2026. Un import CSV vierge présente les six lignes à qualifier. Pour ce scénario fictif, le solde d’ouverture est nul et aucun compte étranger n’est à déclarer.

La démo fonctionne sans installation ni compte. Les fichiers et les calculs restent dans le navigateur. Si le sélecteur de fichiers bloque sur mobile, utiliser **Coller le contenu à la place** dans le formulaire d’import.

Le [scénario plateforme + Sparrow](samples/README.md#essai-avec-une-plateforme-et-un-wallet) teste la reconstitution des soldes au 1er janvier, le rapprochement d’un transfert et l’estimation de la valeur globale d’une cession.

## Démarrer en local

Depuis le dépôt, avec Node.js 22.12 ou plus récent dans une branche LTS prise en charge :

```bash
npm ci
npm run build
npm start
```

Ouvrir dans le navigateur l’adresse `http://127.0.0.1:…` affichée dans le terminal. Une fois les dépendances installées, l’application fonctionne hors ligne.

1. Choisir **Campagne déclarative**, puis ajouter les plateformes du foyer, suivies des wallets personnels. Dans chaque fiche, importer un CSV Sparrow, un CSV générique ou un bundle de la CLI, ou saisir les mouvements manuellement. Confirmer la couverture de l’historique. Si le fichier ne donne aucun solde cumulé exploitable, renseigner un solde de référence daté.
2. Confirmer l’état du portefeuille au 1er janvier de l’année des opérations, puis qualifier les achats, ventes, paiements et transferts. Si l’export Sparrow contient `Value (EUR)`, elle s’affiche dans **Estimation EUR** et propose un prix modifiable pour un achat. Le label préremplit le champ **Justificatif ou référence**. Vérifier ces deux propositions avant de confirmer.
   Les lignes datées hors période restent dans les imports du dossier. Les lignes dont la date est inconnue restent à vérifier. Un changement de campagne ouvre un nouveau dossier.

   La colonne **Label** reprend le libellé Sparrow. Un libellé explicite comme `Vente : plateforme` peut proposer une qualification cohérente avec le sens du mouvement. L’utilisateur la confirme dans la fiche. Cliquer sur une ligne du tableau ouvre sa qualification. Sur mobile, la fiche donne accès au détail de l’opération. Pour une vente ou un paiement Sparrow, la fiche estime le solde du wallet avant cession au cours journalier du CSV. Avec des sources déclarées, la fiche détaille le solde de chacune avant la cession, et propose la valeur globale au cours Sparrow ou au cours BTC/EUR saisi. Dans un ancien dossier sans sources déclarées, compléter l’estimation du wallet Sparrow avec les autres avoirs du foyer.
3. Renseigner dans chaque fiche plateforme les informations du compte, vérifier le récapitulatif 3916-bis qui liste les comptes étrangers et les plateformes dont le pays reste à préciser, confirmer la couverture du dossier et lancer le contrôle. Corriger les écarts affichés avant d’exporter le détail 2086, le résumé 2042 C et la checklist 3916-bis.
4. Cliquer sur **Enregistrer le dossier** pour télécharger le JSON rechargeable. Le conserver dans un dossier privé hors du dépôt. Le bouton **Ouvrir** restaure les imports et les qualifications.

Dans le parcours multi-source, **Préparer le 3916-bis** ouvre une fiche pour chaque compte étranger concerné (revenus 2025). Confirmez le gestionnaire, les dates, la détention et l’usage, puis téléchargez le formulaire officiel 2026 prérempli. Le PDF est imprimable et modifiable. Les renseignements complémentaires sont conservés en mémoire dans l’onglet pour préparer les autres comptes du dossier. Le téléchargement est indépendant du contrôle des opérations. [Formulaire DGFiP utilisé](https://www.impots.gouv.fr/sites/default/files/formulaires/3916/2026/3916_5454.pdf).

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
    ├── README.md
    ├── plateforme-multisource.csv
    ├── sparrow-demo.csv
    └── sparrow-multisource.csv
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

Les CSV, JSON, XLSX et PDF produits peuvent contenir des données patrimoniales sensibles. Ils ne doivent pas être committés dans le dépôt.

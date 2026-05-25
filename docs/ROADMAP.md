# Roadmap — FiscalUTXO / SatDéclare

## 1. Rôle de ce document

Ce document garde le plan d’origine, suit l’avancement étape par étape et indique toujours la prochaine action à traiter.

La source de vérité reste courte. Le présent document sert de tableau de bord opérationnel.

## 2. Objectif de sortie

Sortir rapidement une première application locale utilisable pour préparer une déclaration fiscale Bitcoin française dans le cas simple : particulier, Bitcoin-only, imports CSV, export 2086 préparatoire.

Priorité absolue : application fonctionnelle avant ajout de confort.

## 3. Plan d’origine

### Phase 0 — Cadrage GitHub

Objectif : créer le cadre de travail.

Statut : **terminé**.

Livrables validés :

- dépôt GitHub créé ;
- README initial ;
- source de vérité courte ;
- roadmap ;
- règles IA / Codex ;
- checklist tests et sécurité ;
- templates d’issues ;
- template Pull Request ;
- premières issues MVP ;
- placeholders de documentation.

### Phase 1 — Spécification MVP 0.1

Objectif : verrouiller les contrats de données et le flux minimal.

Statut : **terminé pour le socle d’import Sparrow**.

Livrables validés :

- format `NormalizedEvent` V0 ;
- schéma local V0 documenté ;
- spécification import CSV Sparrow V0 ;
- TypeScript minimal ;
- CI GitHub ;
- parseur Sparrow V0 ;
- bundle local d’import JSON ;
- CLI locale Sparrow vers JSON.

Reste à faire plus tard dans cette phase :

- spécification export 2086 ;
- critères complets d’acceptation fiscale ;
- éventuels imports Paymium / Bitstack / StackinSat.

### Phase 2 — Test réel contrôlé

Objectif : tester le flux CLI avec un vrai export Sparrow utilisateur sans committer de données personnelles.

Statut : **en cours**.

Livrables validés ou en cours :

- procédure de test manuel local ;
- procédure de test distant sécurisé ;
- workflow manuel GitHub Actions de secours ;
- recommandation d’export Sparrow sans source de taux FIAT ;
- règles d’anonymisation et non-commit ;
- checklist de vérification du JSON produit ;
- consignes de suppression locale ou distante des fichiers sensibles.

### Phase 3 — Prototype moteur élargi

Objectif : améliorer le moteur après retour du test réel.

Statut : **à faire**.

Pistes :

- durcir le parseur CSV si nécessaire ;
- améliorer les erreurs utilisateur ;
- introduire un import manuel générique ;
- préparer le stockage local ;
- préparer l’export déclaratif.

### Phase 4 — Moteur fiscal France

Objectif : calculer les éléments 2086 dans les cas simples.

Statut : **à faire**.

Livrables attendus :

- détection des cessions imposables validées utilisateur ;
- calcul selon la formule 150 VH bis ;
- seuil de 305 € ;
- résumé 3AN / 3BN ;
- checklist 3916-bis.

### Phase 5 — Web app locale MVP

Objectif : rendre l’outil utilisable par un non-développeur.

Statut : **à faire**.

Livrables attendus :

- écran d’accueil ;
- import fichier ;
- revue des transactions ;
- qualification ;
- résultats ;
- export.

### Phase 6 — Stabilisation

Objectif : rendre le MVP publiable.

Statut : **à faire**.

Livrables attendus :

- tests ;
- documentation utilisateur ;
- avertissement fiscal ;
- jeu de démo fictif ou procédure de test sans données ;
- version taguée.

## 4. Règles de conduite projet

### 4.1 Priorisation

Toute tâche doit être classée :

- `mvp` : nécessaire à la première sortie ;
- `later` : utile mais non bloquant ;
- `research` : à étudier ;
- `blocked` : dépend d’une donnée manquante ;
- `wontfix` : hors scope.

### 4.2 Définition d’une bonne tâche

Une tâche est acceptable si elle contient :

- un objectif clair ;
- une entrée ;
- une sortie ;
- un critère de succès ;
- une limite de périmètre.

### 4.3 Règle anti-dérive

Si une idée ne contribue pas directement à sortir le MVP, elle va dans `later`.

Exception uniquement si elle corrige un risque fiscal, sécurité ou architecture critique.

## 5. Issues validées

- #1 Initialiser le dépôt et la documentation projet.
- #2 Définir le format `NormalizedEvent` V0.
- #3 Définir le schéma SQLite V0.
- #4 Renforcer les règles agents, tests et sécurité.
- #7 Créer l’import CSV Sparrow V0.
- #9 Initialiser le projet TypeScript minimal.
- #11 Implémenter le parseur CSV Sparrow V0.
- #13 Créer une sortie d’import JSON alignée raw_rows et normalized_events.
- #15 Créer une première commande CLI locale pour convertir un CSV Sparrow en JSON.
- #17 Synchroniser la documentation après la CLI Sparrow V0.
- #19 Documenter un scénario de test manuel réel sans données personnelles committées.
- #21 Préparer un test distant sécurisé pour export Sparrow réel.

## 6. Issues en cours

- #23 Intégrer la recommandation Sparrow sans FIAT.
- #24 Étudier CryptoFiscaFacile comme référence externe.

## 7. Issues à créer ensuite

Après retour du test réel :

- Corriger le parseur Sparrow si le format réel diffère.
- Améliorer les messages d’erreur utilisateur si nécessaire.
- Documenter les colonnes réellement observées si besoin.

Plus tard :

- Créer l’import CSV générique.
- Créer l’import manuel générique.
- Créer la qualification fiscale manuelle.
- Implémenter le calcul 2086 cas simple.
- Générer l’export XLSX préparatoire.
- Générer le résumé 2042 C.
- Créer la checklist 3916-bis.
- Ajouter les avertissements fiscaux applicatifs.

## 8. Structure actuelle du dépôt

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
│   ├── MANUAL_REAL_TEST.md
│   ├── REMOTE_REAL_TEST.md
│   ├── NORMALIZED_EVENT.md
│   ├── SQLITE_SCHEMA_V0.md
│   └── importers/
│       └── SPARROW_CSV_V0.md
├── .github/
└── samples/
```

## 9. Étape en cours

**Étape actuelle : Phase 2 — Test réel contrôlé.**

## 10. Prochaine action unique

Faire tourner la procédure `docs/REMOTE_REAL_TEST.md` avec un export Sparrow configuré avec `Exchange rate source = None`.

Objectif : obtenir un retour réel sur le parseur avant de créer une nouvelle fonctionnalité.
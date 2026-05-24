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

Livrables :

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

Statut : **terminé**.

### Phase 1 — Spécification MVP 0.1

Objectif : verrouiller ce qui sera réellement construit.

Livrables :

- parcours utilisateur minimal ;
- liste des écrans ;
- format `NormalizedEvent` ;
- schéma de base locale V0 ;
- format d’export 2086 ;
- critères d’acceptation MVP.

Statut : **en cours**.

### Phase 2 — Collecte des CSV exemples

Objectif : travailler sur des formats réels, anonymisés.

Sources à collecter :

- Sparrow ;
- Paymium ;
- Bitstack ;
- StackinSat ;
- Bull Bitcoin si disponible ;
- import manuel fictif.

Statut : **à faire**.

### Phase 3 — Prototype moteur

Objectif : prouver l’import, la normalisation et l’export.

Livrables :

- import CSV Sparrow ;
- import CSV générique ;
- stockage local ;
- normalisation ;
- qualification manuelle simple ;
- export JSON ;
- export XLSX préparatoire.

Statut : **à faire**.

### Phase 4 — Moteur fiscal France

Objectif : calculer les éléments 2086 dans les cas simples.

Livrables :

- détection des cessions imposables ;
- calcul selon la formule 150 VH bis ;
- seuil de 305 € ;
- résumé 3AN / 3BN ;
- checklist 3916-bis.

Statut : **à faire**.

### Phase 5 — Web app locale MVP

Objectif : rendre l’outil utilisable par un non-développeur.

Livrables :

- écran d’accueil ;
- import fichier ;
- revue des transactions ;
- qualification ;
- résultats ;
- export.

Statut : **à faire**.

### Phase 6 — Stabilisation

Objectif : rendre le MVP publiable.

Livrables :

- tests ;
- documentation utilisateur ;
- avertissement fiscal ;
- jeu de démo ;
- version taguée.

Statut : **à faire**.

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

## 5. Backlog initial GitHub

### Issues créées

1. Initialiser le dépôt et la documentation projet.
2. Définir le format `NormalizedEvent` V0.
3. Définir le schéma SQLite V0.
4. Renforcer les règles agents, tests et sécurité.

### Issues à créer ensuite

- Créer l’import CSV Sparrow.
- Créer l’import CSV générique.
- Créer l’écran de revue des transactions.
- Créer la qualification fiscale manuelle.
- Implémenter le calcul 2086 cas simple.
- Générer l’export XLSX préparatoire.
- Générer le résumé 2042 C.
- Créer la checklist 3916-bis.
- Ajouter les avertissements fiscaux.

## 6. Labels GitHub recommandés

- `mvp`
- `later`
- `research`
- `tax-fr`
- `importer`
- `wallet`
- `platform`
- `ui`
- `database`
- `export`
- `security`
- `documentation`
- `blocked`
- `wontfix`

## 7. Structure GitHub initiale

```text
fiscalutxo/
├── README.md
├── AGENTS.md
├── docs/
│   ├── SOURCE_OF_TRUTH.md
│   ├── ROADMAP.md
│   ├── AI_RULES.md
│   ├── TEST_SECURITY_CHECKLIST.md
│   ├── SPEC_MVP_0_1.md
│   ├── TAX_FR.md
│   ├── IMPORTS.md
│   └── ARCHITECTURE.md
├── .github/
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

## 8. Décision actuelle

Le projet est créé sous le compte GitHub : **Copinmalin**.

Dépôt :

```text
Copinmalin/fiscalutxo
```

## 9. Étape en cours

**Étape actuelle : Phase 1 — Spécification MVP 0.1.**

## 10. Prochaine action unique

Traiter l’issue #2 : **Définir le format `NormalizedEvent` V0**.

Instruction Codex recommandée :

```text
Lis AGENTS.md, docs/SOURCE_OF_TRUTH.md, docs/ROADMAP.md et docs/SPEC_MVP_0_1.md.
Traite uniquement l’issue #2 : Définir le format NormalizedEvent V0.
Ne crée pas d’interface.
Ne crée pas encore la base SQLite.
Produis une spécification TypeScript simple, documentée et testable.
```
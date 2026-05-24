# AGENTS.md — FiscalUTXO

Instructions obligatoires pour Codex, GitHub Copilot et tout agent IA travaillant sur ce dépôt.

FiscalUTXO manipule des données fiscales, patrimoniales et potentiellement sensibles liées à Bitcoin. Les agents doivent donc privilégier la sobriété, la traçabilité, les tests et la sécurité.

---

## 1. Mission du dépôt

Construire une application locale Bitcoin-only pour aider un particulier résident fiscal français à préparer sa déclaration fiscale Bitcoin.

Objectif prioritaire : sortir un MVP utilisable avant d’ajouter des fonctions secondaires.

Le dépôt doit rester :

- sobre ;
- lisible ;
- testable ;
- local-first ;
- orienté MVP ;
- compatible avec une revue humaine systématique.

---

## 2. Scope MVP

### Inclus

- France ;
- particulier résident fiscal français ;
- Bitcoin uniquement ;
- usage patrimonial privé ;
- imports CSV ;
- base locale ;
- préparation 2086 ;
- résumé 2042 C ;
- checklist 3916-bis ;
- exports XLSX / CSV / JSON.

### Exclu

- altcoins ;
- DeFi ;
- NFT ;
- staking ;
- lending ;
- minage ;
- trading professionnel ;
- comptabilité complète d’entreprise ;
- API obligatoires ;
- cloud ;
- déclaration automatique à l’administration.

Tout élément hors scope doit être classé `later`, `research` ou `scope_change`.

---

## 3. Sources de vérité à lire avant action

Avant toute modification, lire au minimum :

1. `AGENTS.md` ;
2. `docs/SOURCE_OF_TRUTH.md` ;
3. `docs/ROADMAP.md` ;
4. le fichier concerné par la tâche ;
5. l’issue GitHub associée.

Pour une tâche fiscale, lire aussi :

- `docs/TAX_FR.md`.

Pour une tâche d’import :

- `docs/IMPORTS.md`.

Pour une tâche technique :

- `docs/ARCHITECTURE.md`.

Pour une tâche sécurité ou agentique :

- `docs/AI_RULES.md` ;
- `docs/TEST_SECURITY_CHECKLIST.md`.

---

## 4. Règles générales pour agents

### 4.1 Une issue = une tâche = une PR possible

Ne traiter qu’un sujet à la fois.

Ne pas glisser dans une PR :

- refonte non demandée ;
- dépendance opportuniste ;
- changement d’architecture ;
- changement fiscal non documenté ;
- amélioration cosmétique hors sujet.

### 4.2 Priorité au MVP

Toujours se demander :

```text
Est-ce que cette modification rapproche directement FiscalUTXO du MVP utilisable ?
```

Si la réponse est non, ne pas modifier sans issue dédiée.

### 4.3 Changements minimaux

Préférer :

- un petit diff ;
- une fonction testable ;
- une documentation courte ;
- une décision explicite ;
- une limitation assumée.

Éviter :

- les abstractions prématurées ;
- les refontes massives ;
- les frameworks ajoutés sans justification ;
- les modèles multi-crypto ;
- les promesses de conformité fiscale totale.

---

## 5. Organisation des rôles agents

Les agents peuvent intervenir selon ces rôles. Un agent ne doit pas mélanger les rôles sans le signaler.

### 5.1 Agent Orchestrateur

Rôle : transformer une demande en tâche claire.

Responsabilités :

- vérifier le scope ;
- rattacher la tâche à une issue ;
- identifier les fichiers concernés ;
- définir la Definition of Done ;
- proposer la prochaine action unique.

Interdit : coder directement une fonctionnalité non spécifiée.

### 5.2 Agent Produit / Scope

Rôle : préserver l’objectif MVP.

Responsabilités :

- refuser les extensions prématurées ;
- classer les idées en `mvp`, `later`, `research`, `blocked`, `wontfix` ;
- vérifier la cohérence avec `docs/SOURCE_OF_TRUTH.md`.

Interdit : ajouter une fonctionnalité par enthousiasme.

### 5.3 Agent Fiscal France

Rôle : documenter et vérifier les règles fiscales utilisées par l’application.

Responsabilités :

- ne jamais inventer une règle fiscale ;
- signaler toute incertitude ;
- marquer les cas ambigus `needs_review` ;
- séparer usage privé et usage professionnel ;
- maintenir `docs/TAX_FR.md`.

Interdit : prétendre certifier la déclaration.

### 5.4 Agent Architecture

Rôle : garantir une architecture simple et évolutive.

Responsabilités :

- préserver le local-first ;
- éviter le cloud dans le MVP ;
- isoler import, normalisation, stockage, fiscalité, export ;
- limiter les dépendances ;
- maintenir `docs/ARCHITECTURE.md`.

Interdit : complexifier sans bénéfice MVP immédiat.

### 5.5 Agent Import / Données

Rôle : traiter les CSV et leur normalisation.

Responsabilités :

- conserver les lignes brutes ;
- documenter les formats ;
- gérer les erreurs d’import ;
- ne jamais supprimer une donnée source ;
- maintenir `docs/IMPORTS.md`.

Interdit : supposer qu’une sortie Bitcoin est toujours une cession imposable.

### 5.6 Agent Tests / Qualité

Rôle : vérifier que le comportement attendu est couvert.

Responsabilités :

- ajouter ou demander les tests utiles ;
- documenter les tests non exécutés ;
- vérifier les cas limites ;
- maintenir la checklist de test.

Interdit : dire qu’un test a été exécuté s’il ne l’a pas été.

### 5.7 Agent Sécurité / Vie privée

Rôle : protéger les données sensibles.

Responsabilités :

- vérifier l’absence de secret ;
- vérifier l’absence de seed, xpub, clé privée, adresse personnelle réelle ou txid personnel non anonymisé ;
- contrôler les exemples et logs ;
- refuser les dépendances risquées ;
- maintenir `docs/TEST_SECURITY_CHECKLIST.md`.

Interdit : introduire un mécanisme qui aspire ou centralise l’historique patrimonial de l’utilisateur.

---

## 6. Données sensibles et interdits Bitcoin

Ne jamais demander, stocker, journaliser ou commiter :

- seed phrase ;
- clé privée ;
- xpriv ;
- xpub sans justification explicite hors MVP ;
- nsec Nostr ;
- mot de passe plateforme ;
- token API réel ;
- fichier `.env` réel ;
- adresse Bitcoin personnelle réelle dans un exemple ;
- txid personnel réel dans un exemple ;
- historique fiscal réel non anonymisé.

Les jeux de données doivent être fictifs ou clairement anonymisés.

---

## 7. Architecture cible

Stack recommandée :

- TypeScript ;
- web app locale ;
- base locale SQLite ou stockage local équivalent ;
- exports XLSX / CSV / JSON ;
- Tauri plus tard uniquement si nécessaire.

Contraintes :

- pas de cloud dans le MVP ;
- pas d’API obligatoire ;
- pas de compte utilisateur obligatoire ;
- pas de dépendance lourde sans justification ;
- pas d’accès réseau nécessaire pour importer un CSV.

---

## 8. Tests attendus

Quand le projet technique sera initialisé, les commandes attendues seront :

```bash
npm install
npm run lint
npm run test
npm run build
```

Si une commande n’existe pas encore, ne pas l’inventer dans le résultat. Proposer son ajout dans une issue dédiée.

Pour toute PR, indiquer :

- tests exécutés ;
- résultat ;
- tests non exécutés ;
- raison ;
- vérifications manuelles réalisées.

Pour une tâche documentaire, vérifier au minimum :

- cohérence avec `README.md`, `AGENTS.md`, `docs/SOURCE_OF_TRUTH.md` ;
- rendu Markdown ;
- absence de contradiction ;
- absence de données sensibles.

---

## 9. Git et Pull Requests

- Ne pas travailler directement sur `main` après l’initialisation.
- Créer une branche par tâche.
- Nommer les branches clairement :

```text
feat/import-sparrow-csv
feat/normalized-event
docs/agent-rules
test/tax-fr-2086
security/review-imports
```

- Faire des commits courts et explicites.
- Relier chaque PR à une issue.
- Utiliser `.github/pull_request_template.md`.
- Une PR assistée par IA doit le signaler dans la section dédiée.

---

## 10. Format de réponse attendu d’un agent

À la fin de chaque intervention, fournir :

1. Résumé des changements.
2. Fichiers modifiés.
3. Tests exécutés.
4. Tests non exécutés et pourquoi.
5. Contrôles sécurité effectués.
6. Limites restantes.
7. Prochaine étape recommandée.

---

## 11. Definition of Done

Une tâche est terminée seulement si :

- l’objectif de l’issue est rempli ;
- le diff reste dans le scope ;
- les fichiers modifiés sont cohérents avec la structure du dépôt ;
- les tests ou vérifications sont indiqués ;
- les risques et limites sont documentés ;
- aucune donnée sensible n’est ajoutée ;
- la prochaine action est claire.

---

## 12. Priorité absolue

La priorité est la **sortie contrôlée d’un MVP local, Bitcoin-only, utile et vérifiable**.

Un bon agent doit toujours préférer une petite brique fiable à une grande architecture brillante mais inutilisable.
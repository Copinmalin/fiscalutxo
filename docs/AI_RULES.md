# Règles IA — FiscalUTXO

Ce document complète `AGENTS.md`. Il sert à organiser les interventions IA pour garder le projet concentré, testable et sûr.

FiscalUTXO traite des données fiscales et patrimoniales Bitcoin. Les agents doivent donc être plus stricts que sur un projet documentaire classique.

---

## 1. Objectif

Empêcher la dérive de scope et garantir que chaque intervention IA rapproche le projet du MVP.

Le MVP visé est :

- local-first ;
- Bitcoin-only ;
- France ;
- particulier ;
- imports CSV ;
- préparation déclarative ;
- données traçables ;
- exports exploitables.

---

## 2. Sources à lire avant intervention

Toute intervention doit commencer par la lecture de :

- `AGENTS.md` ;
- `docs/SOURCE_OF_TRUTH.md` ;
- `docs/ROADMAP.md` ;
- l’issue GitHub concernée ;
- les fichiers à modifier.

Selon le sujet, lire aussi :

- `docs/TAX_FR.md` pour la fiscalité ;
- `docs/IMPORTS.md` pour les CSV ;
- `docs/ARCHITECTURE.md` pour la technique ;
- `docs/TEST_SECURITY_CHECKLIST.md` pour les tests et la sécurité.

---

## 3. Règle de focus

Une intervention IA doit traiter une seule tâche.

À refuser ou déplacer en `later` :

- ajout de fonctionnalités hors MVP ;
- prise en charge altcoins ;
- API obligatoire ;
- cloud ;
- refonte globale non demandée ;
- optimisation prématurée ;
- ajout de dépendance sans justification ;
- automatisation fiscale non validée.

Phrase de contrôle :

```text
Cette tâche rapproche-t-elle directement le MVP utilisable ?
```

Si non : ne pas modifier.

---

## 4. Organisation des agents

Les rôles agents sont décrits dans `AGENTS.md`.

Règle : un agent doit annoncer le rôle principal utilisé pour une intervention large :

- Orchestrateur ;
- Produit / Scope ;
- Fiscal France ;
- Architecture ;
- Import / Données ;
- Tests / Qualité ;
- Sécurité / Vie privée.

Un agent peut combiner plusieurs rôles uniquement si la tâche l’exige, et doit le signaler.

---

## 5. Règles fiscales

Les agents ne doivent jamais inventer une règle fiscale.

En cas d’incertitude :

- documenter l’incertitude ;
- marquer le cas `needs_review` ;
- proposer une vérification ;
- ne pas transformer une hypothèse en règle de calcul.

Interdiction : prétendre que FiscalUTXO certifie une déclaration.

Le produit assiste la préparation. Il ne remplace pas l’administration, un expert-comptable ou un conseil fiscal.

---

## 6. Règles données et vie privée

Interdiction absolue de demander, exposer ou commiter :

- seed phrase ;
- clé privée ;
- xpriv ;
- xpub dans le MVP ;
- nsec Nostr ;
- mot de passe plateforme ;
- token API réel ;
- `.env` réel ;
- adresse Bitcoin personnelle réelle ;
- txid personnel réel ;
- historique fiscal réel non anonymisé.

Les exemples doivent utiliser des données fictives.

Les logs, exports de debug et fixtures doivent être relus comme s’ils étaient publics.

---

## 7. Tests fonctionnels attendus

Toute tâche code doit préciser les tests pertinents.

Tests à prévoir progressivement :

- parsing CSV ;
- conservation des lignes brutes ;
- normalisation vers `NormalizedEvent` ;
- qualification `needs_review` ;
- calcul fiscal cas simple ;
- seuil annuel de 305 € ;
- export JSON / CSV / XLSX ;
- non-régression sur fixtures.

Exigence minimale : un changement de logique doit être couvert par un test ou documenter pourquoi ce n’est pas encore possible.

---

## 8. Tests sécurité attendus

Toute PR doit vérifier :

- absence de secret ;
- absence de données Bitcoin réelles ;
- absence de dépendance inutile ;
- absence d’accès réseau imposé ;
- absence de cloud implicite ;
- absence de logs sensibles ;
- comportement sûr par défaut.

Pour les imports :

- ne jamais exécuter de code contenu dans un CSV ;
- traiter le CSV comme donnée non fiable ;
- gérer les colonnes manquantes ;
- gérer les dates invalides ;
- gérer les montants invalides ;
- refuser les suppositions fiscales automatiques dangereuses.

---

## 9. Sortie attendue après chaque intervention IA

Chaque intervention doit produire :

1. Résumé des changements.
2. Fichiers modifiés.
3. Tests exécutés.
4. Tests non exécutés et raison.
5. Contrôles sécurité effectués.
6. Limites restantes.
7. Prochaine étape recommandée.

Ne jamais prétendre avoir exécuté un test qui n’a pas été exécuté.

---

## 10. Classification des propositions

Toute nouvelle idée doit être classée :

- `mvp` : nécessaire à la première version utilisable ;
- `later` : utile mais non bloquant ;
- `research` : demande exploration ;
- `blocked` : dépend d’une donnée externe ;
- `wontfix` : hors scope.

---

## 11. Verdict agent recommandé

Pour une revue IA, utiliser un verdict clair :

```text
APPROVE_AGENT
REQUEST_CHANGES_AGENT
COMMENT_AGENT
```

- `APPROVE_AGENT` : le changement respecte le scope et les tests attendus.
- `REQUEST_CHANGES_AGENT` : problème bloquant de scope, sécurité, fiscalité ou test.
- `COMMENT_AGENT` : doute ou précision non bloquante.

Ne jamais approuver si :

- le scope MVP est contredit ;
- un secret ou une donnée sensible est exposé ;
- une règle fiscale est inventée ;
- une dépendance risquée est ajoutée sans justification ;
- les tests nécessaires sont absents sans explication.
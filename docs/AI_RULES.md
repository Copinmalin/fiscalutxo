# Règles IA — FiscalUTXO

Ce document complète `AGENTS.md`.

## Objectif

Empêcher la dérive de scope et garder le projet orienté sortie MVP.

## Règles obligatoires

- Toujours lire `AGENTS.md`, `docs/SOURCE_OF_TRUTH.md` et `docs/ROADMAP.md` avant de proposer ou modifier du code.
- Ne traiter qu’une tâche à la fois.
- Ne jamais ajouter une fonctionnalité non demandée.
- Ne jamais élargir le projet au-delà de Bitcoin-only sans issue `scope_change`.
- Ne jamais masquer une incertitude fiscale : utiliser `needs_review`.
- Ne jamais demander de seed, clé privée, mot de passe plateforme ou xpub.
- Ne jamais introduire de cloud ou d’API obligatoire dans le MVP.
- Toujours privilégier la solution la plus simple qui permet de valider le cas d’usage.

## Sortie attendue après chaque intervention

Chaque intervention IA doit produire :

1. Résumé des changements.
2. Fichiers modifiés.
3. Tests exécutés.
4. Tests non exécutés et raison.
5. Limites restantes.
6. Prochaine étape recommandée.

## Classification des propositions

Toute nouvelle idée doit être classée :

- `mvp` : nécessaire à la première version utilisable ;
- `later` : utile mais non bloquant ;
- `research` : demande exploration ;
- `blocked` : dépend d’une donnée externe ;
- `wontfix` : hors scope.

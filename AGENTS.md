# AGENTS.md — FiscalUTXO

## Mission

Construire une application locale Bitcoin-only pour aider un particulier résident fiscal français à préparer sa déclaration fiscale Bitcoin.

Priorité absolue : sortir un MVP utilisable avant d’ajouter des fonctions secondaires.

## Scope MVP

Inclus :

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

Exclu du MVP :

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

## Règles de travail

1. Lire `docs/SOURCE_OF_TRUTH.md` avant toute modification.
2. Lire `docs/ROADMAP.md` avant toute proposition de tâche.
3. Ne traiter qu’une issue ou tâche à la fois.
4. Ne jamais ajouter de fonctionnalité hors scope sans issue dédiée.
5. Ne jamais complexifier l’architecture sans justification claire.
6. Préférer une solution simple, testée et lisible.
7. Toute nouvelle fonction doit avoir un critère d’acceptation.
8. Toute donnée fiscale ou importée doit rester traçable.
9. Ne jamais demander seed, clé privée, mot de passe ou xpub.
10. En cas d’ambiguïté fiscale, marquer l’opération comme `needs_review`.

## Architecture cible

Stack recommandée :

- TypeScript ;
- web app locale ;
- base locale SQLite ou équivalent ;
- exports XLSX / CSV / JSON ;
- Tauri plus tard uniquement si nécessaire.

## Commandes attendues

À adapter quand le projet technique sera initialisé :

```bash
npm install
npm run lint
npm run test
npm run build
```

Si une commande n’existe pas encore, ne pas l’inventer. Proposer son ajout dans une issue dédiée.

## Git

- Ne pas travailler directement sur `main` après l’initialisation.
- Créer une branche par tâche.
- Nommer les branches clairement :

```text
feat/import-sparrow-csv
feat/normalized-event
docs/source-of-truth
test/tax-fr-2086
```

- Faire des commits courts et explicites.
- Ne pas mélanger documentation, architecture et fonctionnalité dans un seul commit sauf initialisation du dépôt.

## Format de réponse attendu de Codex

À la fin de chaque tâche, fournir :

1. Résumé des changements.
2. Fichiers modifiés.
3. Tests exécutés.
4. Tests non exécutés et pourquoi.
5. Limites restantes.
6. Prochaine étape recommandée.

## Règle anti-dérive

Si une idée n’aide pas directement à sortir le MVP, elle doit être classée `later`.

Exception seulement pour :

- sécurité ;
- risque fiscal critique ;
- bug bloquant ;
- dette technique empêchant le MVP.

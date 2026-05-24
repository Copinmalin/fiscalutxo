# Source de vérité — FiscalUTXO / SatDéclare

## 1. Décision produit

Construire une application locale, Bitcoin-only, orientée France, qui aide un particulier à préparer sa déclaration fiscale Bitcoin.

L’application importe des CSV de plateformes et de wallets, normalise les opérations, accompagne la qualification fiscale, calcule les éléments nécessaires à la déclaration et produit des exports exploitables.

Objectif prioritaire : **sortir une application simple et utilisable rapidement**, puis ajouter des fonctions par itérations.

## 2. Périmètre initial strict

### Inclus dans le MVP

- France.
- Particulier résident fiscal français.
- Bitcoin uniquement.
- Usage patrimonial privé.
- Imports CSV.
- Base locale.
- Préparation 2086.
- Résumé 2042 C : 3AN / 3BN / 3CN.
- Checklist 3916-bis.
- Export XLSX / CSV / JSON.

### Exclu du MVP

- Altcoins.
- DeFi.
- NFT.
- Staking.
- Lending.
- Trading professionnel.
- Minage.
- Comptabilité complète d’entreprise.
- Connexion API obligatoire.
- Cloud.
- Déclaration automatique à l’administration.

## 3. Principes non négociables

1. **Local-first** : les données restent sur la machine de l’utilisateur.
2. **CSV-first** : pas d’API au départ.
3. **Bitcoin-only** : aucune dispersion crypto.
4. **Excel est une sortie, pas le moteur**.
5. **Pas de seed, pas de clé privée, pas de mot de passe plateforme**.
6. **Toute donnée importée doit rester traçable**.
7. **Toute opération ambiguë doit être revue par l’utilisateur**.
8. **L’application assiste, elle ne certifie pas la déclaration**.
9. **Priorité à l’application fonctionnelle plutôt qu’aux raffinements**.
10. **Toute nouvelle fonction doit passer par une issue GitHub et respecter le scope**.

## 4. Règle fiscale centrale

Pour un particulier français, la plus ou moins-value n’est pas calculée en FIFO, LIFO ou CUMP simple.

Formule de référence :

```text
Plus ou moins-value brute =
Prix de cession
- [Prix total d’acquisition × Prix de cession / Valeur globale du portefeuille]
```

L’application doit donc aider à établir :

- prix de cession ;
- frais ;
- prix total d’acquisition ;
- valeur globale du portefeuille fiscal ;
- fractions déjà consommées ;
- statut imposable ou non imposable.

## 5. Sources prioritaires

Imports prioritaires :

1. Sparrow Wallet.
2. Paymium.
3. Bitstack.
4. StackinSat.
5. Bull Bitcoin, après récupération d’un export réel.
6. Import manuel générique.

## 6. Architecture cible

```text
CSV imports
→ Normalisation
→ Base locale
→ Qualification fiscale
→ Moteur fiscal France
→ Exports déclaratifs
```

Choix recommandé :

- Web app locale.
- TypeScript.
- SQLite ou stockage local équivalent.
- Tauri possible ensuite pour desktop.
- Exports XLSX / CSV / JSON / PDF plus tard.
- Développement dans Visual Studio Code avec Codex.
- Instructions agents centralisées dans `AGENTS.md`.

## 7. Règles pour agents IA

Le projet sera développé avec Codex dans Visual Studio Code.

Le fichier `AGENTS.md` à la racine du dépôt est obligatoire. Il doit imposer les règles de scope, les commandes de test, les conventions de commit et la priorité MVP.

Tout agent IA travaillant sur le projet doit respecter ces règles :

1. Lire cette source de vérité avant toute proposition.
2. Refuser les ajouts hors MVP sauf issue dédiée `later`.
3. Prioriser le chemin le plus court vers une application utilisable.
4. Ne jamais transformer une idée en fonctionnalité sans critère d’acceptation.
5. Ne jamais complexifier l’architecture sans bénéfice immédiat prouvé.
6. Séparer clairement : MVP, amélioration, recherche, dette technique.
7. Produire des petites tâches vérifiables, pas des chantiers flous.
8. Ne pas modifier le périmètre fiscal sans justification documentée.
9. Toute décision structurante doit être inscrite dans GitHub.
10. À chaque étape, indiquer l’étape suivante unique à traiter.

## 8. Documents de pilotage

Cette source de vérité doit rester courte.

Les détails vivront dans des documents séparés :

- `AGENTS.md` : instructions opérationnelles lues par Codex.
- `docs/ROADMAP.md` : plan d’origine, suivi des étapes, prochaine action.
- `docs/SPEC_MVP_0_1.md` : spécification fonctionnelle du MVP.
- `docs/TAX_FR.md` : règles fiscales françaises documentées.
- `docs/IMPORTS.md` : formats CSV supportés.
- `docs/ARCHITECTURE.md` : architecture technique.
- `docs/AI_RULES.md` : règles détaillées pour agents IA.

## 9. Prochaine étape

Créer ou compléter les premiers fichiers GitHub :

- `README.md`
- `AGENTS.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/ROADMAP.md`
- `docs/AI_RULES.md`
- templates d’issues GitHub

Ensuite seulement : spécifier le MVP 0.1.
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
- Base locale ou structure locale équivalente.
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
→ Parsing
→ Normalisation
→ Bundle local ou base locale
→ Qualification fiscale
→ Moteur fiscal France
→ Exports déclaratifs
```

Choix recommandé :

- TypeScript.
- CLI locale pour valider le moteur.
- Web app locale ensuite.
- SQLite ou stockage local équivalent ensuite.
- Tauri possible plus tard pour desktop.
- Exports XLSX / CSV / JSON / PDF plus tard.
- Développement dans Visual Studio Code avec Codex.
- Instructions agents centralisées dans `AGENTS.md`.

## 7. État réel du dépôt

Briques validées :

- gouvernance projet ;
- règles agents IA ;
- CI GitHub ;
- TypeScript minimal ;
- `NormalizedEvent` V0 ;
- schéma local V0 documenté ;
- spécification import CSV Sparrow V0 ;
- parseur Sparrow V0 ;
- bundle local d’import JSON ;
- CLI locale Sparrow vers JSON.

## 8. Documents de pilotage

Cette source de vérité doit rester courte.

Les détails vivent dans des documents séparés :

- `AGENTS.md` : instructions opérationnelles lues par Codex.
- `docs/ROADMAP.md` : plan d’origine, suivi des étapes, prochaine action.
- `docs/SPEC_MVP_0_1.md` : spécification fonctionnelle du MVP.
- `docs/TAX_FR.md` : règles fiscales françaises documentées.
- `docs/IMPORTS.md` : formats CSV supportés.
- `docs/ARCHITECTURE.md` : architecture technique.
- `docs/CLI.md` : usage de la CLI locale.
- `docs/AI_RULES.md` : règles détaillées pour agents IA.
- `docs/TEST_SECURITY_CHECKLIST.md` : checklist tests et sécurité.

## 9. Prochaine action unique

Documenter un scénario de test manuel réel, sans committer de données personnelles, pour lancer la CLI dans VS Code avec un export Sparrow utilisateur.
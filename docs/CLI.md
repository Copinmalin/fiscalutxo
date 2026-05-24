# CLI — FiscalUTXO

## Objectif

La CLI permet de tester localement le flux minimal :

```text
CSV Sparrow local
→ parseur Sparrow V0
→ NormalizedEvent
→ bundle local d’import
→ JSON
```

Elle ne crée pas de base SQLite, ne fait pas de calcul fiscal complet et ne contacte aucun service externe.

## Commande Sparrow

Après compilation :

```bash
npm run build
npm run cli -- sparrow ./transactions.csv
```

Sortie JSON vers stdout par défaut.

## Écrire dans un fichier

```bash
npm run cli -- sparrow ./transactions.csv --out ./bundle.json
```

## Options

```text
--out <file>          Écrit le bundle JSON dans un fichier.
--source-id <id>      Définit l’identifiant local de la source.
--import-id <id>      Définit l’identifiant local de l’import.
--imported-at <date>  Définit la date ISO d’import.
```

## Sécurité

La commande :

- lit un fichier local ;
- ne demande aucune seed ;
- ne demande aucune clé privée ;
- ne demande aucun xpub ;
- ne demande aucun mot de passe plateforme ;
- ne fait aucun accès réseau.

Les fichiers CSV et JSON produits peuvent contenir des données patrimoniales sensibles. Ils doivent rester locaux et ne pas être committés dans le dépôt.

## Limites V0

- Import Sparrow uniquement.
- Pas de SQLite.
- Pas d’interface utilisateur.
- Pas d’export XLSX.
- Pas de calcul fiscal 2086 complet.
- Les opérations restent à qualifier manuellement si elles sont ambiguës.
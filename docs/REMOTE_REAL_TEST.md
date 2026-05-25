# Test distant sécurisé — export Sparrow réel

## Objectif

Tester un vrai export Sparrow dans un environnement distant sans utiliser Codex sur PC et sans committer de données personnelles.

Deux options existent :

1. **GitHub Codespaces**, recommandé.
2. **GitHub Actions manuel avec secret base64**, solution de secours.

La règle reste simple : le CSV réel et le JSON réel ne doivent jamais entrer dans Git.

---

## 1. Option recommandée : GitHub Codespaces

Codespaces permet d’ouvrir un environnement distant lié au dépôt, avec terminal et éditeur web.

Avantage : le CSV peut être transféré dans l’environnement temporaire sans passer par un commit Git ni par un secret GitHub.

### Étapes

1. Ouvrir le dépôt GitHub `Copinmalin/fiscalutxo`.
2. Cliquer sur `Code`.
3. Aller dans `Codespaces`.
4. Créer un nouveau Codespace sur `main`.
5. Dans le terminal Codespaces :

```bash
npm install
npm run lint
npm run test
npm run build
```

6. Créer un dossier privé dans le Codespace :

```bash
mkdir -p ~/fiscalutxo-private-test
```

7. Importer le fichier CSV Sparrow dans ce dossier via l’interface Codespaces.

Chemin recommandé :

```text
~/fiscalutxo-private-test/sparrow-transactions.csv
```

8. Lancer la CLI :

```bash
npm run cli -- sparrow \
  ~/fiscalutxo-private-test/sparrow-transactions.csv \
  --out ~/fiscalutxo-private-test/fiscalutxo-sparrow-bundle.json
```

9. Vérifier que Git ne voit aucun fichier sensible :

```bash
git status
```

10. Inspecter localement le JSON dans Codespaces sans le committer.

Points à vérifier :

```text
[ ] schemaVersion vaut local-import-bundle.v0.
[ ] source.name vaut Sparrow Wallet.
[ ] import.parserVersion vaut sparrow-transactions-csv.v0.
[ ] rawRows contient le nombre attendu de lignes.
[ ] normalizedEvents contient des événements.
[ ] Les événements sont rattachés aux rawRows.
[ ] Les sorties restent manual_review + needs_review.
[ ] Les entrées restent manual_review + needs_review.
```

11. Supprimer les fichiers sensibles avant de fermer le Codespace :

```bash
rm -f ~/fiscalutxo-private-test/sparrow-transactions.csv
rm -f ~/fiscalutxo-private-test/fiscalutxo-sparrow-bundle.json
```

---

## 2. Option de secours : GitHub Actions manuel

Cette option utilise un secret GitHub contenant le CSV encodé en base64.

Elle est moins recommandée que Codespaces, car elle stocke temporairement une donnée sensible dans les secrets GitHub.

À utiliser seulement si Codespaces n’est pas disponible.

### 2.1 Préparer le secret

Créer un secret GitHub nommé :

```text
SPARROW_CSV_BASE64
```

Sa valeur doit être le contenu base64 du CSV Sparrow.

Ne jamais mettre ce secret dans un fichier du dépôt.

### 2.2 Lancer le workflow

Dans GitHub :

1. Aller dans `Actions`.
2. Choisir `Remote real Sparrow test`.
3. Cliquer sur `Run workflow`.
4. Laisser `main` sélectionné.
5. Lancer.

Le workflow doit afficher uniquement un résumé anonymisé :

```text
schemaVersion
importStatus
rawRows count
normalizedEvents count
errors count
```

Il ne doit pas afficher le CSV ni le JSON complet.

### 2.3 Nettoyer après test

Après le test, supprimer le secret :

```text
SPARROW_CSV_BASE64
```

---

## 3. Ce qu’il ne faut jamais publier

Ne jamais publier dans une issue, PR ou log :

- CSV réel ;
- JSON réel complet ;
- txid réel ;
- adresse Bitcoin réelle ;
- label personnel ;
- capture d’écran contenant des données wallet ;
- historique fiscal réel.

---

## 4. Comment rapporter un résultat

Partager uniquement :

```text
Méthode utilisée : Codespaces / GitHub Actions
Système :
Node version :
Lint/Test/Build : OK / KO
CSV Sparrow lu : oui / non
JSON généré : oui / non
rawRows count :
normalizedEvents count :
importStatus : imported / partial / failed
erreurs anonymisées :
```

Si une erreur contient des données personnelles, la réécrire sous forme anonymisée.

---

## 5. Décision après test

Si le test passe : continuer vers la prochaine brique MVP.

Si le test échoue : créer une issue de correction minimale, sans joindre les données réelles.

Exemples de corrections possibles :

- nom de colonne Sparrow différent ;
- format de date non couvert ;
- montant exporté dans une unité non prévue ;
- ligne vide ou commentaire inattendu ;
- message d’erreur insuffisant.
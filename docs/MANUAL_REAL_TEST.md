# Test manuel réel — export Sparrow local

## Objectif

Tester le flux local FiscalUTXO avec un vrai export Sparrow Wallet, sans committer de données personnelles dans le dépôt.

Flux testé :

```text
CSV Sparrow local
→ CLI FiscalUTXO
→ parseur Sparrow V0
→ NormalizedEvent
→ bundle local d’import
→ JSON local
```

Ce test sert à vérifier le comportement réel du parseur et du bundle JSON avant d’ajouter plus de fonctionnalités.

---

## 1. Règles de sécurité absolues

Ne jamais committer :

- export CSV Sparrow réel ;
- bundle JSON généré ;
- txid réel ;
- adresse Bitcoin réelle ;
- label personnel ;
- capture d’écran contenant des données de wallet ;
- historique fiscal réel ;
- fichier temporaire contenant des données patrimoniales.

Avant de commencer, vérifier que les fichiers de test réel seront créés hors du dépôt ou dans un dossier ignoré par Git.

Recommandation : utiliser un dossier local hors dépôt, par exemple :

```bash
mkdir -p ~/fiscalutxo-private-test
```

---

## 2. Préparer le dépôt

Depuis le dépôt FiscalUTXO :

```bash
npm install
npm run lint
npm run test
npm run build
```

Les trois commandes doivent passer avant le test réel.

---

## 3. Exporter depuis Sparrow Wallet

Dans Sparrow Wallet :

1. Ouvrir le wallet à tester.
2. Aller dans l’onglet des transactions.
3. Exporter les transactions au format CSV.
4. Enregistrer le fichier dans un dossier local hors dépôt.

Exemple de chemin local :

```text
~/fiscalutxo-private-test/sparrow-transactions.csv
```

Le CSV doit rester privé.

---

## 4. Lancer la CLI vers stdout

Depuis le dépôt FiscalUTXO :

```bash
npm run cli -- sparrow ~/fiscalutxo-private-test/sparrow-transactions.csv
```

La commande affiche le bundle JSON dans le terminal.

Ne copier-coller aucune sortie complète dans une issue GitHub.

---

## 5. Lancer la CLI vers un fichier local

Pour produire un fichier JSON local :

```bash
npm run cli -- sparrow \
  ~/fiscalutxo-private-test/sparrow-transactions.csv \
  --out ~/fiscalutxo-private-test/fiscalutxo-sparrow-bundle.json
```

Le fichier JSON généré est sensible.

Ne pas le déplacer dans le dépôt.

---

## 6. Vérifier le JSON sans exposer les données

Ouvrir le JSON localement et vérifier uniquement la structure.

Points à vérifier :

```text
[ ] schemaVersion vaut local-import-bundle.v0.
[ ] source.name vaut Sparrow Wallet.
[ ] import.parserVersion vaut sparrow-transactions-csv.v0.
[ ] rawRows contient le nombre attendu de lignes.
[ ] normalizedEvents contient des événements rattachés aux rawRows.
[ ] Chaque normalizedEvent.sourceRef.rawRowId correspond à une rawRow.id.
[ ] Les sorties Sparrow restent manual_review + needs_review.
[ ] Les entrées Sparrow restent manual_review + needs_review.
[ ] Les lignes Unconfirmed sont marquées needs_review ou partial.
[ ] Les valeurs EUR éventuelles sont présentes uniquement si la colonne Value (EUR) existe.
[ ] Le fichier ne prétend pas calculer la plus-value fiscale.
```

Ne pas vérifier la justesse fiscale finale à ce stade : ce n’est pas encore le rôle du flux.

---

## 7. Vérifier l’état Git

Après le test :

```bash
git status
```

Le résultat ne doit pas montrer de CSV réel ou de JSON réel à ajouter.

Si un fichier réel apparaît dans le dépôt :

```bash
git restore --staged <file>
rm <file>
```

Ou déplacer le fichier hors dépôt.

---

## 8. Nettoyage local optionnel

Après le test, supprimer les fichiers sensibles si nécessaire :

```bash
rm ~/fiscalutxo-private-test/sparrow-transactions.csv
rm ~/fiscalutxo-private-test/fiscalutxo-sparrow-bundle.json
```

Garder ces fichiers seulement s’ils sont utiles pour continuer localement.

---

## 9. Rapporter un bug sans exposer ses données

Ne jamais ouvrir une issue avec le CSV réel ou le JSON réel.

À partager dans une issue :

```text
Commande lancée :
Système : Linux / macOS / Windows
Version Node :
Nombre de lignes CSV :
Message d’erreur exact :
Étape concernée : import / parsing / JSON / autre
```

Partager uniquement des extraits anonymisés et minimaux si nécessaire.

Avant de partager un extrait :

```text
[ ] Supprimer txid réel.
[ ] Supprimer adresse réelle.
[ ] Supprimer label personnel.
[ ] Remplacer les montants par des valeurs fictives si possible.
[ ] Remplacer les dates par des dates approximatives si possible.
```

Exemple de bug report acceptable :

```text
La CLI échoue sur un CSV Sparrow de 42 lignes.
Erreur : Missing required headers: Txid
Le fichier contient une colonne nommée Transaction ID au lieu de Txid.
Aucun CSV réel joint.
```

---

## 10. Résultat attendu du test

Le test est réussi si :

```text
[ ] La CLI lit le CSV local.
[ ] La CLI produit un JSON local.
[ ] Le JSON contient rawRows et normalizedEvents.
[ ] Les événements restent prudents fiscalement.
[ ] Aucun fichier sensible n’est présent dans git status.
[ ] Aucun contenu personnel n’est publié dans GitHub.
```

---

## 11. Décision après test

Après un premier test réel, décider de la prochaine action :

- corriger le parseur Sparrow si le format réel diffère ;
- améliorer les messages d’erreur ;
- documenter les colonnes observées ;
- ajouter une procédure d’anonymisation ;
- créer un import manuel générique ;
- préparer la qualification utilisateur.

Ne pas ajouter de fonctionnalité tant que le résultat du test réel n’est pas compris.
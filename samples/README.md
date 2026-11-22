# Samples

[sparrow-demo.csv](sparrow-demo.csv) contient six opérations fictives de 2025 avec un solde cumulé, des achats, une vente et un paiement. Il permet de tester l’import Sparrow et la qualification pendant la campagne 2026. Le bouton **Essayer avec un exemple** reprend ce scénario avec quatre opérations déjà qualifiées. L’achat initial et la vente restent à qualifier.

## Règles

- Ne jamais commiter de données personnelles réelles.
- Ne jamais commiter de txid personnels non anonymisés.
- Ne jamais commiter d’adresse Bitcoin personnelle.
- Préférer des jeux de données fictifs mais réalistes.

## Sources attendues

- Sparrow Wallet.
- Paymium.
- Bitstack.
- StackinSat.
- Bull Bitcoin si disponible.
- Import manuel générique.

## Essai avec une plateforme et un wallet

1. Choisir la campagne **2026 · opérations 2025**. Ajouter **Plateforme fictive** dans le premier cadre, puis **Wallet Sparrow fictif** dans le cadre suivant.
2. Dans chaque fiche, cliquer sur **Importer un fichier pour cette source**. Importer [plateforme-multisource.csv](plateforme-multisource.csv) comme **CSV générique** pour la plateforme, puis [sparrow-multisource.csv](sparrow-multisource.csv) comme **CSV Sparrow** pour le wallet.
3. Ouvrir la fiche de la plateforme. Renseigner **1 200 000 sats** au **31 décembre 2024 à 23:00 UTC** (1er janvier 2025 à Paris) et indiquer « Relevé fictif au 1er janvier » comme justificatif. Saisir **FR** comme pays de l’entité fictive. Confirmer la couverture et valider la source.
4. Ouvrir la fiche du wallet. Laisser le solde de référence vide, confirmer la couverture et valider. Le solde reconstitué à l’ouverture est de **300 000 sats** et le total du foyer de **1 500 000 sats**.
5. Dans **Situation au 1er janvier 2025**, renseigner **900 €** d’acquisitions cumulées et **0 €** déjà consommé, avec « Acquisitions fictives antérieures » comme justificatif. Valider l’ouverture.
6. Qualifier le retrait de la plateforme puis la réception Sparrow comme **Transfert personnel**. Sur chaque ligne, sélectionner l’autre ligne du transfert. Les deux lignes datent du 10 février 2025 à 14:00 UTC et partagent la même référence. Le transfert est sans frais.
7. Ouvrir la vente Sparrow. Choisir **Vente**, reprendre le prix de **400 €**, saisir **0 €** de frais. La fiche doit présenter **700 000 sats** sur la plateforme et **800 000 sats** sur le wallet avant la vente. Reprendre la valeur globale de **1 500 €**, renseigner « Cours journalier Sparrow fictif » comme justificatif puis confirmer.
8. Confirmer la revue des comptes et la couverture du dossier. Le contrôle doit afficher **160 € en 3AN**. Après la vente, le foyer détient **1 100 000 sats**.

Les deux fichiers et les justificatifs du scénario sont fictifs.

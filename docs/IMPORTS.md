# Imports CSV — FiscalUTXO

Statut : à documenter.

## Objet

Décrire les formats CSV supportés par l’application et leur transformation vers le format interne canonique.

## Sources prioritaires

- Sparrow Wallet.
- Paymium.
- Bitstack.
- StackinSat.
- Bull Bitcoin, après récupération d’un export réel.
- Import manuel générique.

## Exigences communes

Chaque import doit conserver :

- le fichier source ;
- le hash du fichier ;
- les lignes brutes ;
- la version du parseur ;
- les erreurs de parsing ;
- les opérations normalisées ;
- les opérations à revoir.

## Principe

Un import ne doit jamais supprimer ou écraser les données brutes. La normalisation doit rester traçable.
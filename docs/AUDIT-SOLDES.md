# Parcours des soldes multi-source

Audit du parcours de la campagne 2026, du CSV au report. Les montants ci-dessous appartiennent aux fichiers fictifs du projet.

| Étape | Comportement vérifié |
|---|---|
| Inventaire et import | Chaque fichier est rattaché à sa source. Les opérations antérieures à la campagne servent à reconstituer le patrimoine. |
| Solde à la date de référence | Un relevé avec solde cumulé permet de remonter au 1er janvier. Un solde manuel daté reste prioritaire. |
| Ancien CSV de plateforme | Les seuls mouvements déterminent une variation. Si le fichier contient des mouvements antérieurs au 1er janvier, le MVP peut proposer leur cumul depuis zéro. L’utilisateur doit confirmer cette hypothèse ou remplacer le montant par celui de son relevé. |
| Ouverture du foyer | La fiche source et le total utilisent le même calcul. Le total provisoire distingue les sources chiffrées des sources recensées. La confirmation de couverture reste nécessaire. Le coût fiscal et le capital déjà consommé demandent des justificatifs distincts. |
| Opérations | Le retrait de 500 000 sats et la réception sur le wallet se rapprochent comme transfert personnel. La colonne de solde après opération reprend le solde effectivement présent dans le relevé. |
| Cession et contrôle | Dans le scénario combiné, 1 200 000 sats sur la plateforme et 300 000 sur le wallet donnent 1 500 000 sats à l’ouverture. Le test rapproche les deux côtés du transfert puis contrôle le résultat de 160 € en 3AN. |
| Sorties | Les rapports fiscaux dépendent du contrôle du dossier. Le 3916-bis utilise les informations du compte indépendamment du calcul de cession. |

L’ancien aperçu recalculait l’ensemble du dossier avec des confirmations de couverture simulées. Le moteur effectue désormais un seul passage pour préparer l’ouverture. Les calculs fiscaux continuent d’utiliser les soldes confirmés. Un CSV sans solde, commençant après le début de l’exercice, nécessite toujours un relevé daté.

Les tests de régression couvrent notamment les deux versions du CSV, un solde manuel postérieur, une source sans couverture, le transfert et le calcul après sauvegarde et relecture du dossier.

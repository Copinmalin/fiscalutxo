# FiscalUTXO-multi · audit du 22 novembre 2026

## Périmètre

Scénario fictif d’un particulier, campagne 2026, opérations Bitcoin de 2025. Le parcours a été exécuté dans Chromium en affichage mobile sur la page GitHub Pages, sur la compilation statique locale et sur le serveur Node de boucle locale. Les imports et les qualifications ont été effectués dans les formulaires. Le JSON téléchargé a ensuite été relu par le validateur et le moteur de calcul. Le contrôle du rendu PDF a porté sur les pages renseignées et les widgets du formulaire. Aucune déclaration n’a été transmise.

## Parcours reproductible

| Source et fichier du dossier samples | Ouverture | Mouvements 2025 | Clôture du scénario |
|---|---:|---|---:|
| Plateforme FR · plateforme-multisource.csv | 1 200 000 sats | Retrait de 500 000 vers le wallet | 700 000 sats |
| Plateforme DE · plateforme-etrangere-audit.csv | 0 sat | Achat de 500 000 sats pour 400 € le 10 janvier | 500 000 sats |
| Wallet personnel · sparrow-multisource.csv | 300 000 sats | Réception de 500 000 puis vente de 400 000 sats | 400 000 sats |
| Foyer | **1 500 000 sats** | Deux côtés du transfert rapprochés | **1 600 000 sats** |

1. Créer les trois sources. Importer les deux CSV génériques et le CSV Sparrow dans leurs fiches respectives. Après chaque import, le solde du foyer affiche successivement 1 200 000, 1 200 000 puis 1 500 000 sats. Confirmer les couvertures. Compléter les pays FR et DE, et la référence allemande fictive DE-FICTIF-0001.
2. Valider l’ouverture avec les justificatifs fictifs de 720 € et 180 €, soit 900 € de capital cumulé et 0 € déjà consommé. Le coût monétaire historique se renseigne séparément des soldes Bitcoin.
3. Qualifier l’achat allemand avec le prix prérempli de 400 €. Rapprocher les deux lignes de transfert personnel dans les deux sens à la même date. Qualifier la vente du wallet. Reprendre les propositions de 400 € de prix brut et de 2 000 € de valeur globale. Confirmer 0 € de frais et renseigner le justificatif du cours fictif. Les deux opérations de 2024 contribuent à l’ouverture.
4. Confirmer la revue des comptes et l’exhaustivité du dossier. Le contrôle retourne zéro anomalie. Le CSV étranger figure dans les exemples du dépôt. Les deux autres CSV sont ceux du parcours multi-source existant.

## Vérification indépendante des montants

Avant la vente, le foyer détient 2 000 000 sats. La vente fictive de 400 000 sats pour 400 € implique un cours de 100 000 €/BTC, soit 2 000 € pour le foyer. Le capital à répartir vaut 900 + 400 = 1 300 €. La fraction consommée est de 1 300 × 400 / 2 000 = 260 €. Le gain est de **140 €** et le capital restant de **1 040 €**. Le rapport JSON et le dossier relu donnent ces valeurs. Le transfert interne a un effet nul sur le total.

## Documents contrôlés

- **2086** · PDF de travail A4 d’une page. Vérification de la date du 7 mai, des lignes 212 (2 000 €), 213 (400 €), 214 (0 €), 220 et 223 (1 300 €), des totaux 51 et 52 et du report 3AN (140 €). Le MVP produit une aide au report. Le formulaire de référence est le [2086 officiel 2026](https://www.impots.gouv.fr/sites/default/files/formulaires/2086/2026/2086_5515.pdf).
- **3916-bis** · Un seul compte proposé, celui de la plateforme allemande. PDF officiel de sept pages généré avant qualification des opérations. Vérification de l’identité fictive, de la référence, de la date d’ouverture (10 août 2024), du nom et de l’adresse de l’organisme à Berlin. Les sélections du compte d’actifs numériques, du titulaire en propre et de l’usage personnel ont été vérifiées dans le PDF et dans l’état de ses widgets. [Formulaire officiel](https://www.impots.gouv.fr/sites/default/files/formulaires/3916/2026/3916_5454.pdf).

## Estimation historique mempool.space

Une requête limitée à la devise et à l’horodatage du 10 janvier 2025 à 10:00 UTC a renvoyé **92 148 €/BTC** pour ce même horodatage. Calcul indépendant pour 500 000 sats : 92 148 × 500 000 / 100 000 000 = **460,74 €**. Le CSV justifie un prix payé de **400 €**. L’écart illustre pourquoi l’estimation doit être présentée séparément, datée et soumise à confirmation. La réponse autorise les requêtes interorigines. La version Pages impose actuellement une politique de contenu interdisant les connexions sortantes. Une intégration ultérieure demanderait une action explicite de l’utilisateur et une autorisation limitée à ce service. Le test de faisabilité a envoyé uniquement l’horodatage et la devise. [Requête reproductible](https://mempool.space/api/v1/historical-price?currency=EUR&timestamp=1736503200) · [BOFiP, prix d’acquisition](https://bofip.impots.gouv.fr/bofip/11968-PGP.html).

## Revue du code et nettoyage

| Partie du projet | Contrôle et résultat |
|---|---|
| Domaine, parseurs, bundles et CLI | Validation des dates, quantités, unités et correspondances de lignes par la suite existante. Exécution de la CLI Sparrow sur le CSV fictif et génération d’un bundle local. |
| Interface, périodes et fiscalité | L’interface et le moteur reconstruisaient séparément les mêmes associations ligne/événement et le filtre d’exercice. Ils utilisent maintenant la même fonction. Le calcul des dates des lignes est également réutilisé lors des contrôles fiscaux. |
| Diagnostics et saisie | Suppression de la reconstruction de toute la liste pour chaque anomalie. Les références sont indexées une seule fois par affichage des anomalies. Suppression de deux nettoyages redondants des espaces dans les satoshis. |
| Valorisation et calcul | Test de régression pérenne à trois sources ajouté. Les parcours distincts de valorisation des anciens dossiers sans inventaire et des nouveaux dossiers multi-source sont encore utilisés. |
| Serveur, version statique et exports | Même dossier testé dans les deux modes. Le calcul fiscal et les deux exports de PDF ont été exercés via l’interface dans les deux cas. Les tests existants couvrent également CSV et XLSX. |
| Intégration continue | Suppression du chemin historique qui ignorait les contrôles en l’absence de package.json. Installation selon le verrou npm et ajout de la compilation Pages au workflow. |

Contrôles locaux : TypeScript avec détection des déclarations et paramètres inutilisés, compilation Node, compilation Pages, 46 tests réussis. Cette vérification couvre le parcours décrit et les cas de la suite. Elle ne constitue pas une homologation fiscale, une impression physique, ni un essai avec des justificatifs réels. La disponibilité de mempool.space à d’autres dates et son débit maximal n’ont pas été mesurés.
